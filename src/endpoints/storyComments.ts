import type { PayloadHandler } from 'payload'
import {
  assertPublicArticleEligible,
  createLexicalCommentBody,
  extractCommentText,
} from '../lib/site/engagement'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// In-memory sliding window rate limiting for public submissions
const SUBMISSION_RATE_LIMIT_MS = 60 * 1000 // 1 minute
const MAX_SUBMISSIONS_PER_WINDOW = 5
const submissionRateMap = new Map<string, number[]>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const timestamps = submissionRateMap.get(key) || []
  const recent = timestamps.filter((t) => now - t < SUBMISSION_RATE_LIMIT_MS)
  if (recent.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    return true
  }
  recent.push(now)
  submissionRateMap.set(key, recent)
  return false
}

/**
 * Basic HTML tag sanitizer to prevent XSS in text inputs
 */
function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * GET /api/stories/comments
 * Returns paginated, approved comments for a public article.
 * Strictest privacy guarantee: Never exposes emails, phone numbers, or pending comments.
 */
export const storyCommentsGetHandler: PayloadHandler = async (req) => {
  try {
    const url = new URL(req.url || '', 'http://localhost')
    const articleId = url.searchParams.get('articleId')
    const slug = url.searchParams.get('slug')
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))

    if (!articleId && !slug) {
      return Response.json(
        { success: false, error: 'articleId or slug is required' },
        { status: 400 },
      )
    }

    // Verify article is published and publicly accessible
    const publicArticle = await assertPublicArticleEligible(req.payload, {
      id: articleId || undefined,
      slug: slug || undefined,
    })

    if (!publicArticle) {
      return Response.json(
        { success: false, error: 'Article not found or not published' },
        { status: 404 },
      )
    }

    const commentsResult = await req.payload.find({
      collection: 'comments',
      where: {
        and: [
          { article: { equals: publicArticle.id } },
          { status: { equals: 'approved' } },
        ],
      },
      depth: 0,
      limit,
      page,
      sort: '-createdAt',
      overrideAccess: true, // Safe because we explicitly query status: 'approved'
    })

    const sanitizedComments = commentsResult.docs.map((doc: any) => ({
      id: String(doc.id),
      authorName: String(doc.full_name || 'Anonymous Reader'),
      commentText: String(doc.commentText || extractCommentText(doc.body) || ''),
      createdAt: String(doc.createdAt),
    }))

    return Response.json({
      success: true,
      comments: sanitizedComments,
      totalDocs: commentsResult.totalDocs,
      totalPages: commentsResult.totalPages,
      page: commentsResult.page,
    })
  } catch (err: any) {
    req.payload.logger.error(`Error in storyCommentsGetHandler: ${err}`)
    return Response.json(
      { success: false, error: 'Failed to retrieve comments' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/stories/comments
 * Accepts anonymous reader comments on published articles.
 * Enforces honeypot, rate limiting, length limits, XSS sanitization, and pending moderation status.
 */
export const storyCommentsPostHandler: PayloadHandler = async (req) => {
  try {
    let body: any = {}
    try {
      body = (await req.json?.()) || {}
    } catch {
      return Response.json(
        { success: false, error: 'Invalid JSON payload in request body' },
        { status: 400 },
      )
    }

    const {
      articleId,
      slug,
      authorName,
      email,
      comment,
      honeypot,
      preview,
    } = body

    // 1. Honeypot Bot Trap: Silently absorb automated spam
    if (honeypot && typeof honeypot === 'string' && honeypot.trim() !== '') {
      return Response.json({
        success: true,
        message: 'Your comment has been submitted and is awaiting moderation.',
      })
    }

    // 2. Draft / Preview requests must not accept public comments
    if (preview === true || preview === 'true') {
      return Response.json(
        { success: false, error: 'Comments cannot be submitted on preview drafts.' },
        { status: 403 },
      )
    }

    // 3. Rate limiting per IP or visitor
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'
    if (isRateLimited(clientIp)) {
      return Response.json(
        {
          success: false,
          error: 'Too many comment submissions. Please wait a moment before trying again.',
        },
        { status: 429 },
      )
    }

    // 4. Verify public article eligibility
    if (!articleId && !slug) {
      return Response.json(
        { success: false, error: 'articleId or slug is required.' },
        { status: 400 },
      )
    }

    const publicArticle = await assertPublicArticleEligible(req.payload, {
      id: articleId,
      slug,
    })

    if (!publicArticle) {
      return Response.json(
        { success: false, error: 'This article is not available for comments.' },
        { status: 404 },
      )
    }

    // 5. Input validation
    const trimmedName = String(authorName || '').trim()
    const trimmedComment = String(comment || '').trim()
    const trimmedEmail = email ? String(email).trim() : ''

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return Response.json(
        { success: false, error: 'Display name must be between 2 and 100 characters.' },
        { status: 400 },
      )
    }

    if (trimmedComment.length < 3 || trimmedComment.length > 2000) {
      return Response.json(
        { success: false, error: 'Comment must be between 3 and 2,000 characters.' },
        { status: 400 },
      )
    }

    if (trimmedEmail && (!EMAIL_REGEX.test(trimmedEmail) || trimmedEmail.length > 254)) {
      return Response.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }

    // 6. Sanitize inputs
    const cleanName = sanitizeText(trimmedName)
    const cleanComment = sanitizeText(trimmedComment)

    // 7. Persist comment with pending moderation status
    await req.payload.create({
      collection: 'comments',
      data: {
        article: publicArticle.id,
        status: 'pending',
        full_name: cleanName,
        email: trimmedEmail || undefined,
        commentText: cleanComment,
        body: createLexicalCommentBody(cleanComment),
      },
      context: {
        isPublicSubmission: true,
      },
      overrideAccess: false, // Enforce schema hooks and access controls
    })

    return Response.json({
      success: true,
      message: 'Your comment has been submitted and is awaiting moderation.',
    })
  } catch (err: any) {
    req.payload.logger.error(`Error in storyCommentsPostHandler: ${err}`)
    return Response.json(
      { success: false, error: 'Failed to submit comment. Please try again later.' },
      { status: 500 },
    )
  }
}
