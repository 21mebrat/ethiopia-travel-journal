import type { PayloadHandler } from 'payload'
import crypto from 'crypto'
import {
  assertPublicArticleEligible,
  buildVisitorCookieHeader,
  parseCookieHeader,
  recordArticleView,
  signVisitorId,
  verifyVisitorId,
  VISITOR_COOKIE_NAME,
} from '../lib/site/engagement'

const BOT_USER_AGENTS = [
  'bot',
  'spider',
  'crawl',
  'slurp',
  'mediapartners',
  'headless',
  'phantom',
  'lighthouse',
]

export const storyTrackViewHandler: PayloadHandler = async (req) => {
  try {
    const isProduction = process.env.NODE_ENV === 'production'
    const secret = process.env.PAYLOAD_SECRET || 'etj-secret-key-fallback'

    // 1. Bot & Prefetch Exclusions
    const userAgent = (req.headers.get('user-agent') || '').toLowerCase()
    const isBot = BOT_USER_AGENTS.some((b) => userAgent.includes(b))
    const purpose = (req.headers.get('purpose') || req.headers.get('sec-purpose') || '').toLowerCase()
    const isPrefetch = purpose.includes('prefetch')

    if (isBot || isPrefetch) {
      return Response.json({
        success: true,
        tracked: false,
        reason: isBot ? 'bot_excluded' : 'prefetch_excluded',
      })
    }

    // 2. Parse request body
    let body: any = {}
    try {
      body = (await req.json?.()) || {}
    } catch {
      return Response.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 },
      )
    }

    const { articleId, slug, preview } = body

    // 3. Draft / Staff Previews MUST NOT count toward views
    if (preview === true || preview === 'true') {
      return Response.json({
        success: true,
        tracked: false,
        reason: 'preview_excluded',
      })
    }

    if (!articleId && !slug) {
      return Response.json(
        { success: false, error: 'articleId or slug is required' },
        { status: 400 },
      )
    }

    // 4. Validate that article is genuinely published and public
    const publicArticle = await assertPublicArticleEligible(req.payload, {
      id: articleId,
      slug,
    })

    if (!publicArticle) {
      return Response.json(
        { success: false, error: 'Article not found or not published' },
        { status: 404 },
      )
    }

    // 5. Visitor Token: Read or generate signed pseudonymous visitor identifier
    const cookieHeader = req.headers.get('cookie')
    const cookies = parseCookieHeader(cookieHeader)
    const rawCookie = cookies[VISITOR_COOKIE_NAME]

    let visitorId = verifyVisitorId(rawCookie, secret)
    let newCookieHeader: string | null = null

    if (!visitorId) {
      // Issue new secure anonymous visitor token
      visitorId = crypto.randomUUID()
      const signedToken = signVisitorId(visitorId, secret)
      newCookieHeader = buildVisitorCookieHeader(signedToken, isProduction)
    }

    // 6. Record deduplicated view with atomic uniqueness guarantee
    const result = await recordArticleView(req.payload, {
      articleId: publicArticle.id,
      visitorId,
      secret,
    })

    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }

    if (newCookieHeader) {
      responseHeaders['Set-Cookie'] = newCookieHeader
    }

    return new Response(
      JSON.stringify({
        success: true,
        tracked: result.tracked,
        deduplicated: result.deduplicated,
        viewCount: result.viewCount,
        engagementScore: result.engagementScore,
      }),
      {
        status: 200,
        headers: responseHeaders,
      },
    )
  } catch (err: any) {
    req.payload.logger.error(`Error in storyTrackViewHandler: ${err}`)
    return Response.json(
      { success: false, error: 'Internal server error while tracking view' },
      { status: 500 },
    )
  }
}
