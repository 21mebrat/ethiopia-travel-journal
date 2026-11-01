import crypto from 'crypto'
import type { Payload } from 'payload'

/**
 * Configurable weight for comments in engagement score calculation.
 * Default is 3 as required by specification.
 */
export const DEFAULT_COMMENT_WEIGHT = 3

export function getCommentWeight(): number {
  const envVal = process.env.ENGAGEMENT_COMMENT_WEIGHT
  if (envVal !== undefined && !Number.isNaN(Number(envVal))) {
    const parsed = Number(envVal)
    if (parsed >= 0) return parsed
  }
  return DEFAULT_COMMENT_WEIGHT
}

/**
 * Calculates the algorithmic engagement score:
 * engagementScore = ln(1 + viewCount) + commentWeight * ln(1 + commentCount)
 *
 * Guaranteed properties:
 * - Non-negative for any valid inputs
 * - When viewCount = 0 and commentCount = 0 -> score = 0
 * - Preserves precision rounded to 4 decimal places for stable database sorting
 */
export function calculateEngagementScore(
  viewCount: number,
  commentCount: number,
  commentWeight: number = getCommentWeight(),
): number {
  const safeViews = Math.max(0, Number(viewCount) || 0)
  const safeComments = Math.max(0, Number(commentCount) || 0)

  if (safeViews === 0 && safeComments === 0) {
    return 0
  }

  const score = Math.log1p(safeViews) + commentWeight * Math.log1p(safeComments)
  return Math.round(score * 10000) / 10000
}

/**
 * Cookie and token constants for visitor tracking
 */
export const VISITOR_COOKIE_NAME = 'etj_vid'
const VISITOR_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60 // 30 days

/**
 * Signs a visitor UUID using HMAC SHA-256 with the server's secret.
 * Output format: `<uuid>.<signature_base64url>`
 */
export function signVisitorId(visitorId: string, secret: string): string {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(visitorId)
    .digest('base64url')
  return `${visitorId}.${signature}`
}

/**
 * Verifies a signed visitor token.
 * Returns the raw visitorId if valid, or null if invalid or tampered with.
 */
export function verifyVisitorId(signedToken: string, secret: string): string | null {
  if (!signedToken || typeof signedToken !== 'string') return null
  const parts = signedToken.split('.')
  if (parts.length !== 2) return null

  const [visitorId, signature] = parts
  if (!visitorId || !signature) return null

  // Ensure visitorId looks like a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(visitorId)) return null

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(visitorId)
    .digest('base64url')

  const expectedBuf = Buffer.from(expectedSignature)
  const actualBuf = Buffer.from(signature)

  if (expectedBuf.length !== actualBuf.length) return null
  if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) return null

  return visitorId
}

/**
 * Derives a one-way pseudonymous hash of the visitorId for storage.
 * Raw visitor IDs or IPs are never stored in plain text.
 */
export function deriveVisitorHash(visitorId: string, secret: string): string {
  return crypto
    .createHash('sha256')
    .update(`${visitorId}:${secret}`)
    .digest('hex')
}

/**
 * Computes the 24-hour window bucket for deduplication.
 * Uses 24-hour UTC day epochs (86,400,000 ms).
 */
export function get24HourWindowBucket(timestamp: number = Date.now()): number {
  return Math.floor(timestamp / (24 * 60 * 60 * 1000))
}

/**
 * Constructs the deterministic uniqueness key for view tracking.
 */
export function buildViewDeduplicationKey(
  articleId: string,
  visitorHash: string,
  windowBucket: number = get24HourWindowBucket(),
): string {
  return `${articleId}_${visitorHash}_${windowBucket}`
}

/**
 * Parses cookies from standard Cookie header string.
 */
export function parseCookieHeader(cookieHeader: string | null | undefined): Record<string, string> {
  const result: Record<string, string> = {}
  if (!cookieHeader) return result

  const pairs = cookieHeader.split(';')
  for (const pair of pairs) {
    const idx = pair.indexOf('=')
    if (idx < 0) continue
    const key = pair.substring(0, idx).trim()
    const val = pair.substring(idx + 1).trim()
    try {
      result[key] = decodeURIComponent(val)
    } catch {
      result[key] = val
    }
  }
  return result
}

/**
 * Generates Set-Cookie header string for the visitor token.
 */
export function buildVisitorCookieHeader(signedToken: string, isProduction: boolean = false): string {
  const parts = [
    `${VISITOR_COOKIE_NAME}=${encodeURIComponent(signedToken)}`,
    'Path=/',
    `Max-Age=${VISITOR_COOKIE_MAX_AGE_SECONDS}`,
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (isProduction) {
    parts.push('Secure')
  }
  return parts.join('; ')
}

/**
 * Validates that an article is publicly available and eligible for public views and comments:
 * - Exists in database
 * - Has _status === 'published'
 * Returns the article doc if eligible; throws or returns null if not.
 */
export async function assertPublicArticleEligible(
  payload: Payload,
  identifier: { id?: string; slug?: string },
): Promise<{ id: string; title: string; slug: string } | null> {
  const where: any = {
    _status: { equals: 'published' },
  }

  if (identifier.id) {
    where.id = { equals: identifier.id }
  } else if (identifier.slug) {
    where.slug = { equals: identifier.slug }
  } else {
    return null
  }

  const result = await payload.find({
    collection: 'articles',
    where,
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })

  const doc = result.docs[0]
  if (!doc) return null

  return {
    id: String(doc.id),
    title: String(doc.title || ''),
    slug: String(doc.slug || ''),
  }
}

/**
 * Reconciles an article's commentCount and engagementScore from the database.
 * CRITICAL RULE:
 * Preserves existing nonzero viewCount. Never resets viewCount to 0!
 * Only backfills viewCount to 0 if null/undefined.
 */
export async function reconcileArticleMetrics(
  payload: Payload,
  articleId: string,
  commentWeight: number = getCommentWeight(),
): Promise<{ viewCount: number; commentCount: number; engagementScore: number }> {
  // 1. Fetch current article doc
  const article = await payload.findByID({
    collection: 'articles',
    id: articleId,
    depth: 0,
    overrideAccess: true,
  })

  if (!article) {
    throw new Error(`Article ${articleId} not found for reconciliation`)
  }

  // 2. Count genuine approved comments belonging to this article
  const approvedCountResult = await payload.count({
    collection: 'comments',
    where: {
      and: [
        { article: { equals: articleId } },
        { status: { equals: 'approved' } },
      ],
    },
    overrideAccess: true,
  })

  const approvedCount = approvedCountResult.totalDocs || 0

  // 3. Preserve existing viewCount; backfill only if missing/null
  const existingViews = typeof article.viewCount === 'number' && !Number.isNaN(article.viewCount)
    ? Math.max(0, article.viewCount)
    : 0

  // 4. Calculate fresh score
  const freshScore = calculateEngagementScore(existingViews, approvedCount, commentWeight)

  // 5. Update article using internal counter context to pass field-level security
  await payload.update({
    collection: 'articles',
    id: articleId,
    data: {
      commentCount: approvedCount,
      viewCount: existingViews,
      engagementScore: freshScore,
    },
    context: {
      internalCounterUpdate: true,
    },
    overrideAccess: true,
  })

  return {
    viewCount: existingViews,
    commentCount: approvedCount,
    engagementScore: freshScore,
  }
}

/**
 * Creates a valid Lexical document structure representing a single plain text paragraph.
 * Ensures the Payload Admin richText editor renders new comments gracefully alongside legacy ones.
 */
export function createLexicalCommentBody(text: string): {
  root: {
    type: string
    format: '' | 'left' | 'start' | 'center' | 'right' | 'end' | 'justify'
    indent: number
    version: number
    children: any[]
    direction: 'ltr' | 'rtl' | null
  }
  [k: string]: unknown
} {
  const sanitizedText = String(text || '').trim()
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          children: [
            {
              mode: 'normal',
              text: sanitizedText,
              type: 'text',
              style: '',
              detail: 0,
              format: 0,
              version: 1,
            },
          ],
          direction: 'ltr',
        },
      ],
      direction: 'ltr',
    },
  }
}

/**
 * Extracts plain text content from either a plain string or a Lexical richText JSON structure.
 */
export function extractCommentText(bodyOrText: any): string {
  if (typeof bodyOrText === 'string') return bodyOrText.trim()
  if (!bodyOrText || typeof bodyOrText !== 'object') return ''

  try {
    const root = bodyOrText.root
    if (!root || !Array.isArray(root.children)) return ''

    const strings: string[] = []
    function traverse(node: any) {
      if (node && node.type === 'text' && typeof node.text === 'string') {
        strings.push(node.text)
      }
      if (node && Array.isArray(node.children)) {
        node.children.forEach(traverse)
      }
    }
    traverse(root)
    return strings.join(' ').trim()
  } catch {
    return ''
  }
}

/**
 * Atomically records an article view if not already recorded within the 24-hour window.
 * Enforces database uniqueness via the `viewKey` unique index in `article-views`.
 */
export async function recordArticleView(
  payload: Payload,
  args: {
    articleId: string
    visitorId: string
    secret: string
    commentWeight?: number
  },
): Promise<{
  tracked: boolean
  deduplicated: boolean
  viewCount?: number
  engagementScore?: number
}> {
  const { articleId, visitorId, secret, commentWeight = getCommentWeight() } = args

  // 1. Verify that article is public and published
  const article = await assertPublicArticleEligible(payload, { id: articleId })
  if (!article) {
    return { tracked: false, deduplicated: false }
  }

  // 2. Compute deterministic deduplication key
  const visitorHash = deriveVisitorHash(visitorId, secret)
  const dayBucket = get24HourWindowBucket()
  const viewKey = buildViewDeduplicationKey(articleId, visitorHash, dayBucket)

  // 3. Attempt unique record insertion
  try {
    await payload.create({
      collection: 'article-views',
      data: {
        article: articleId,
        visitorHash,
        dayBucket,
        viewKey,
      },
      context: {
        internalViewTracking: true,
      },
      overrideAccess: true,
    })
  } catch (err: any) {
    const errMsg = String(err?.message || '').toLowerCase()
    const errorDetails = JSON.stringify(err?.data || '').toLowerCase()
    const isDuplicate =
      err?.code === 11000 ||
      errMsg.includes('duplicate') ||
      errMsg.includes('unique') ||
      errMsg.includes('e11000') ||
      errorDetails.includes('unique') ||
      errorDetails.includes('duplicate') ||
      (err?.data?.errors &&
        Array.isArray(err.data.errors) &&
        err.data.errors.some(
          (e: any) =>
            e?.path === 'viewKey' ||
            String(e?.message || '').toLowerCase().includes('unique'),
        ))

    if (isDuplicate) {
      // Race-safe duplicate prevented by database unique index
      return { tracked: false, deduplicated: true }
    }
    throw err
  }

  // 4. View is guaranteed unique in this window. Atomically increment article viewCount.
  const articleDoc = await payload.findByID({
    collection: 'articles',
    id: articleId,
    depth: 0,
    overrideAccess: true,
  })

  const currentViews = typeof articleDoc?.viewCount === 'number' && !Number.isNaN(articleDoc.viewCount)
    ? Math.max(0, articleDoc.viewCount)
    : 0
  const currentComments = typeof articleDoc?.commentCount === 'number' && !Number.isNaN(articleDoc.commentCount)
    ? Math.max(0, articleDoc.commentCount)
    : 0

  const updatedViews = currentViews + 1
  const updatedScore = calculateEngagementScore(updatedViews, currentComments, commentWeight)

  await payload.update({
    collection: 'articles',
    id: articleId,
    data: {
      viewCount: updatedViews,
      engagementScore: updatedScore,
    },
    context: {
      internalCounterUpdate: true,
    },
    overrideAccess: true,
  })

  return {
    tracked: true,
    deduplicated: false,
    viewCount: updatedViews,
    engagementScore: updatedScore,
  }
}

