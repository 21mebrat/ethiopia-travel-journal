import crypto from 'crypto'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { storyTrackViewHandler } from '@/endpoints/storyTrackView'
import { VISITOR_COOKIE_NAME, signVisitorId } from '@/lib/site/engagement'

let payload: Payload
const runId = crypto.randomUUID().slice(0, 8)
let testUserId: string
let testMediaId: string
let publishedArticleId: string
let publishedArticleSlug: string
let draftArticleId: string
const createdArticleIds: Array<string | number> = []

function createMockReq(options: {
  body?: any
  headers?: Record<string, string>
}) {
  const headers = new Headers(options.headers || {})
  return {
    method: 'POST',
    url: 'http://localhost:3000/api/stories/track-view',
    headers,
    payload,
    json: async () => options.body || {},
  } as any
}

describe('Integration: Track View API Handler', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    const users = await payload.find({ collection: 'users', limit: 1, overrideAccess: true })
    if (users.docs[0]) {
      testUserId = String(users.docs[0].id)
    } else {
      const u = await payload.create({
        collection: 'users',
        data: {
          email: `track-view-user-${runId}@example.com`,
          password: 'Password123!',
          firstName: 'Track',
          lastName: 'Tester',
          role: 'admin',
        },
        overrideAccess: true,
      } as any)
      testUserId = String(u.id)
    }

    const media = await payload.find({ collection: 'media', limit: 1, overrideAccess: true })
    if (media.docs[0]) {
      testMediaId = String(media.docs[0].id)
    } else {
      const m = await payload.create({
        collection: 'media',
        data: { alt: 'Track View Hero' },
        file: {
          data: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64',
          ),
          mimetype: 'image/png',
          name: `track-hero-${runId}.png`,
          size: 68,
        },
        overrideAccess: true,
      })
      testMediaId = String(m.id)
    }

    // Published article
    publishedArticleSlug = `track-pub-${runId}`
    const pub = await payload.create({
      collection: 'articles',
      data: {
        title: `Track View Story ${runId}`,
        slug: publishedArticleSlug,
        excerpt: 'Story for testing atomic view tracking and deduplication.',
        author: testUserId,
        heroImage: testMediaId,
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                version: 1,
                children: [{ type: 'text', text: 'Body for view tracking test.', version: 1 }],
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
        _status: 'published',
        publishedDate: new Date().toISOString(),
        viewCount: 0,
        commentCount: 0,
        engagementScore: 0,
      },
      context: {
        internalCounterUpdate: true,
      },
      overrideAccess: true,
    })
    publishedArticleId = String(pub.id)
    createdArticleIds.push(pub.id)

    // Draft article
    const draft = await payload.create({
      collection: 'articles',
      data: {
        title: `Draft Track Story ${runId}`,
        slug: `track-draft-${runId}`,
        excerpt: 'Draft story which must never track views.',
        author: testUserId,
        heroImage: testMediaId,
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                version: 1,
                children: [{ type: 'text', text: 'Draft content.', version: 1 }],
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
        _status: 'draft',
      },
      overrideAccess: true,
    })
    draftArticleId = String(draft.id)
    createdArticleIds.push(draft.id)
  })

  afterAll(async () => {
    if (createdArticleIds.length > 0) {
      await payload.delete({
        collection: 'articles',
        where: { id: { in: createdArticleIds } },
        overrideAccess: true,
      })
    }
  })

  it('excludes crawler and automated bot traffic without incrementing views', async () => {
    const initialArticle = await payload.findByID({
      collection: 'articles',
      id: publishedArticleId,
      overrideAccess: true,
    })
    const initialViews = initialArticle.viewCount || 0

    const botReq = createMockReq({
      body: { articleId: publishedArticleId },
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
    })
    const res = await storyTrackViewHandler(botReq)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.tracked).toBe(false)
    expect(data.reason).toBe('bot_excluded')

    // Verify viewCount was not incremented
    const afterArticle = await payload.findByID({
      collection: 'articles',
      id: publishedArticleId,
      overrideAccess: true,
    })
    expect(afterArticle.viewCount).toBe(initialViews)
  })

  it('excludes browser prefetch requests without incrementing views', async () => {
    const prefetchReq = createMockReq({
      body: { articleId: publishedArticleId },
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        purpose: 'prefetch',
      },
    })
    const res = await storyTrackViewHandler(prefetchReq)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.tracked).toBe(false)
    expect(data.reason).toBe('prefetch_excluded')
  })

  it('rejects requests with missing articleId and slug', async () => {
    const req = createMockReq({
      body: {},
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    })
    const res = await storyTrackViewHandler(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('articleId or slug is required')
  })

  it('excludes preview requests from view counting', async () => {
    const previewReq = createMockReq({
      body: {
        articleId: publishedArticleId,
        preview: true,
      },
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    })
    const res = await storyTrackViewHandler(previewReq)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.tracked).toBe(false)
    expect(data.reason).toBe('preview_excluded')
  })

  it('rejects view tracking for unpublished draft articles', async () => {
    const draftReq = createMockReq({
      body: { articleId: draftArticleId },
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    })
    const res = await storyTrackViewHandler(draftReq)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('not found or not published')
  })

  it('tracks view, sets signed visitor cookie, increments counter, and updates engagement score', async () => {
    const articleBefore = await payload.findByID({
      collection: 'articles',
      id: publishedArticleId,
      overrideAccess: true,
    })
    const viewsBefore = articleBefore.viewCount || 0

    const req = createMockReq({
      body: { slug: publishedArticleSlug },
      headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
    })
    const res = await storyTrackViewHandler(req)
    expect(res.status).toBe(200)

    const cookieHeader = res.headers.get('set-cookie')
    expect(cookieHeader).toBeDefined()
    expect(cookieHeader).toContain(VISITOR_COOKIE_NAME)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.tracked).toBe(true)
    expect(data.deduplicated).toBe(false)

    // Verify database increment
    const articleAfter = await payload.findByID({
      collection: 'articles',
      id: publishedArticleId,
      overrideAccess: true,
    })
    expect(articleAfter.viewCount).toBe(viewsBefore + 1)
    expect(articleAfter.engagementScore).toBeGreaterThan(0)
  })

  it('deduplicates subsequent views within 24h window for the same visitor', async () => {
    const secret = process.env.PAYLOAD_SECRET || 'etj-secret-key-fallback'
    const visitorUuid = crypto.randomUUID()
    const signedCookieValue = signVisitorId(visitorUuid, secret)

    // First view for this visitor
    const req1 = createMockReq({
      body: { articleId: publishedArticleId },
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        cookie: `${VISITOR_COOKIE_NAME}=${signedCookieValue}`,
      },
    })
    const res1 = await storyTrackViewHandler(req1)
    expect(res1.status).toBe(200)
    const data1 = await res1.json()
    expect(data1.tracked).toBe(true)
    expect(data1.deduplicated).toBe(false)

    const viewsAfterFirst = (
      await payload.findByID({ collection: 'articles', id: publishedArticleId, overrideAccess: true })
    ).viewCount || 0

    // Second view for the exact same visitor
    const req2 = createMockReq({
      body: { articleId: publishedArticleId },
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        cookie: `${VISITOR_COOKIE_NAME}=${signedCookieValue}`,
      },
    })
    const res2 = await storyTrackViewHandler(req2)
    expect(res2.status).toBe(200)
    const data2 = await res2.json()
    expect(data2.tracked).toBe(false)
    expect(data2.deduplicated).toBe(true)

    // View count must NOT have increased on deduplication
    const viewsAfterSecond = (
      await payload.findByID({ collection: 'articles', id: publishedArticleId, overrideAccess: true })
    ).viewCount || 0
    expect(viewsAfterSecond).toBe(viewsAfterFirst)
  })

  it('safely recovers from tampered visitor cookies by issuing a new valid cookie and tracking view', async () => {
    const tamperedCookie = `${VISITOR_COOKIE_NAME}=invalid_uuid_part.bad_tampered_signature`

    const req = createMockReq({
      body: { articleId: publishedArticleId },
      headers: {
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64)',
        cookie: tamperedCookie,
      },
    })
    const res = await storyTrackViewHandler(req)
    expect(res.status).toBe(200)

    const cookieHeader = res.headers.get('set-cookie')
    expect(cookieHeader).toBeDefined()
    expect(cookieHeader).toContain(VISITOR_COOKIE_NAME)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.tracked).toBe(true)
  })
})
