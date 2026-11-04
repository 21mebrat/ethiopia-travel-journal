import crypto from 'crypto'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import {
  storyCommentsGetHandler,
  storyCommentsPostHandler,
} from '@/endpoints/storyComments'

let payload: Payload
const runId = crypto.randomUUID().slice(0, 8)
let testUserId: string
let testMediaId: string
let publishedArticleId: string
let publishedArticleSlug: string
let draftArticleId: string
let draftArticleSlug: string
const createdArticleIds: Array<string | number> = []
const createdCommentIds: Array<string | number> = []

function createMockReq(options: {
  method?: string
  url?: string
  body?: any
  headers?: Record<string, string>
}) {
  const headers = new Headers(options.headers || {})
  return {
    method: options.method || 'GET',
    url: options.url || 'http://localhost:3000/api/stories/comments',
    headers,
    payload,
    json: async () => options.body || {},
  } as any
}

describe('Integration: Comments API Handlers', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    const users = await payload.find({ collection: 'users', limit: 1, overrideAccess: true })
    if (users.docs[0]) {
      testUserId = String(users.docs[0].id)
    } else {
      const u = await payload.create({
        collection: 'users',
        data: {
          email: `comments-api-user-${runId}@example.com`,
          password: 'Password123!',
          firstName: 'API',
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
        data: { alt: 'API Hero' },
        file: {
          data: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64',
          ),
          mimetype: 'image/png',
          name: `api-hero-${runId}.png`,
          size: 68,
        },
        overrideAccess: true,
      })
      testMediaId = String(m.id)
    }

    // Published article
    publishedArticleSlug = `published-story-${runId}`
    const pub = await payload.create({
      collection: 'articles',
      data: {
        title: `Published Story ${runId}`,
        slug: publishedArticleSlug,
        excerpt: 'Public story for testing comments API.',
        author: testUserId,
        heroImage: testMediaId,
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                version: 1,
                children: [{ type: 'text', text: 'Story content for comments api test.', version: 1 }],
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
      },
      overrideAccess: true,
    })
    publishedArticleId = String(pub.id)
    createdArticleIds.push(pub.id)

    // Draft article
    draftArticleSlug = `draft-story-${runId}`
    const draft = await payload.create({
      collection: 'articles',
      data: {
        title: `Draft Story ${runId}`,
        slug: draftArticleSlug,
        excerpt: 'Draft story which should not receive comments.',
        author: testUserId,
        heroImage: testMediaId,
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                version: 1,
                children: [{ type: 'text', text: 'Draft body.', version: 1 }],
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
    if (createdCommentIds.length > 0) {
      await payload.delete({
        collection: 'comments',
        where: { id: { in: createdCommentIds } },
        overrideAccess: true,
      })
    }
    if (createdArticleIds.length > 0) {
      await payload.delete({
        collection: 'articles',
        where: { id: { in: createdArticleIds } },
        overrideAccess: true,
      })
    }
  })

  describe('POST /api/stories/comments', () => {
    it('rejects submissions with missing articleId and slug', async () => {
      const req = createMockReq({
        method: 'POST',
        body: {
          authorName: 'Abebe Bikila',
          email: 'abebe@example.com',
          comment: 'Wonderful piece on Ethiopian history!',
        },
        headers: { 'x-forwarded-for': `10.0.1.${Math.floor(Math.random() * 200)}` },
      })
      const res = await storyCommentsPostHandler(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('articleId or slug is required')
    })

    it('rejects submissions on unpublished draft articles', async () => {
      const req = createMockReq({
        method: 'POST',
        body: {
          articleId: draftArticleId,
          authorName: 'Abebe Bikila',
          email: 'abebe@example.com',
          comment: 'Should not be allowed on drafts',
        },
        headers: { 'x-forwarded-for': `10.0.2.${Math.floor(Math.random() * 200)}` },
      })
      const res = await storyCommentsPostHandler(req)
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('not available')
    })

    it('rejects submissions when preview mode is explicitly requested', async () => {
      const req = createMockReq({
        method: 'POST',
        body: {
          articleId: publishedArticleId,
          authorName: 'Abebe Bikila',
          email: 'abebe@example.com',
          comment: 'Preview test',
          preview: true,
        },
        headers: { 'x-forwarded-for': `10.0.3.${Math.floor(Math.random() * 200)}` },
      })
      const res = await storyCommentsPostHandler(req)
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('preview drafts')
    })

    it('silently absorbs honeypot spam without persisting to database', async () => {
      const initialComments = await payload.find({
        collection: 'comments',
        where: { article: { equals: publishedArticleId } },
        overrideAccess: true,
      })
      const initialCount = initialComments.totalDocs

      const req = createMockReq({
        method: 'POST',
        body: {
          articleId: publishedArticleId,
          authorName: 'Spam Bot',
          email: 'bot@spammer.com',
          comment: 'Buy cheap watches here!',
          honeypot: 'http://spam-link.local',
        },
        headers: { 'x-forwarded-for': `10.0.4.${Math.floor(Math.random() * 200)}` },
      })
      const res = await storyCommentsPostHandler(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      // Verify no comment was created
      const currentComments = await payload.find({
        collection: 'comments',
        where: { article: { equals: publishedArticleId } },
        overrideAccess: true,
      })
      expect(currentComments.totalDocs).toBe(initialCount)
    })

    it('validates author name length boundaries', async () => {
      // Too short (< 2 characters)
      const reqShort = createMockReq({
        method: 'POST',
        body: {
          articleId: publishedArticleId,
          authorName: 'A',
          comment: 'Valid comment content here.',
        },
        headers: { 'x-forwarded-for': `10.0.5.${Math.floor(Math.random() * 200)}` },
      })
      const resShort = await storyCommentsPostHandler(reqShort)
      expect(resShort.status).toBe(400)
      const dataShort = await resShort.json()
      expect(dataShort.error).toContain('between 2 and 100 characters')

      // Too long (> 100 characters)
      const reqLong = createMockReq({
        method: 'POST',
        body: {
          articleId: publishedArticleId,
          authorName: 'A'.repeat(101),
          comment: 'Valid comment content here.',
        },
        headers: { 'x-forwarded-for': `10.0.5.${Math.floor(Math.random() * 200)}` },
      })
      const resLong = await storyCommentsPostHandler(reqLong)
      expect(resLong.status).toBe(400)
      const dataLong = await resLong.json()
      expect(dataLong.error).toContain('between 2 and 100 characters')
    })

    it('validates comment body length boundaries', async () => {
      // Too short (< 3 characters)
      const reqShort = createMockReq({
        method: 'POST',
        body: {
          articleId: publishedArticleId,
          authorName: 'Derartu',
          comment: 'ok',
        },
        headers: { 'x-forwarded-for': `10.0.6.${Math.floor(Math.random() * 200)}` },
      })
      const resShort = await storyCommentsPostHandler(reqShort)
      expect(resShort.status).toBe(400)
      const dataShort = await resShort.json()
      expect(dataShort.error).toContain('between 3 and 2,000 characters')

      // Too long (> 2000 characters)
      const reqLong = createMockReq({
        method: 'POST',
        body: {
          articleId: publishedArticleId,
          authorName: 'Derartu',
          comment: 'c'.repeat(2001),
        },
        headers: { 'x-forwarded-for': `10.0.6.${Math.floor(Math.random() * 200)}` },
      })
      const resLong = await storyCommentsPostHandler(reqLong)
      expect(resLong.status).toBe(400)
      const dataLong = await resLong.json()
      expect(dataLong.error).toContain('between 3 and 2,000 characters')
    })

    it('validates email format if provided', async () => {
      const req = createMockReq({
        method: 'POST',
        body: {
          articleId: publishedArticleId,
          authorName: 'Kenenisa',
          email: 'not-an-email',
          comment: 'Great article on the high-altitude trails.',
        },
        headers: { 'x-forwarded-for': `10.0.7.${Math.floor(Math.random() * 200)}` },
      })
      const res = await storyCommentsPostHandler(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('valid email address')
    })

    it('successfully creates comment with pending moderation and sanitized HTML', async () => {
      const req = createMockReq({
        method: 'POST',
        body: {
          slug: publishedArticleSlug,
          authorName: '<script>alert("xss")</script>Tirunesh',
          email: 'tirunesh@dibaba.example',
          comment: 'Incredible journey to the <b>Simien Mountains</b>!',
        },
        headers: { 'x-forwarded-for': `10.0.8.${Math.floor(Math.random() * 200)}` },
      })
      const res = await storyCommentsPostHandler(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.message).toContain('awaiting moderation')

      // Find the created comment in DB
      const found = await payload.find({
        collection: 'comments',
        where: {
          and: [
            { article: { equals: publishedArticleId } },
            { email: { equals: 'tirunesh@dibaba.example' } },
          ],
        },
        overrideAccess: true,
      })
      expect(found.totalDocs).toBe(1)
      const commentDoc = found.docs[0]
      createdCommentIds.push(commentDoc.id)

      // Verify status is pending
      expect(commentDoc.status).toBe('pending')
      // HTML tags stripped
      expect(commentDoc.full_name).not.toContain('<script>')
      expect(commentDoc.full_name).toContain('Tirunesh')
      expect(commentDoc.commentText).not.toContain('<b>')
      expect(commentDoc.commentText).toContain('Simien Mountains')
    })

    it('enforces rate limiting on rapid submissions from the same IP', async () => {
      const spammerIp = `10.99.88.${Math.floor(Math.random() * 200)}`
      let lastStatus = 200

      // Trigger multiple requests up to limit
      for (let i = 0; i < 7; i++) {
        const req = createMockReq({
          method: 'POST',
          body: {
            articleId: publishedArticleId,
            authorName: `Spammer ${i}`,
            comment: `Comment repetition test iteration ${i}`,
          },
          headers: { 'x-forwarded-for': spammerIp },
        })
        const res = await storyCommentsPostHandler(req)
        lastStatus = res.status
        if (res.status === 200) {
          // Track created comment for cleanup
          const found = await payload.find({
            collection: 'comments',
            where: { full_name: { equals: `Spammer ${i}` } },
            overrideAccess: true,
          })
          if (found.docs[0]) createdCommentIds.push(found.docs[0].id)
        }
      }

      expect(lastStatus).toBe(429)
    })
  })

  describe('GET /api/stories/comments', () => {
    beforeAll(async () => {
      // Seed one approved comment and one pending comment
      const approved = await payload.create({
        collection: 'comments',
        data: {
          article: publishedArticleId,
          status: 'approved',
          full_name: 'Approved Reader',
          email: 'secret-reader@example.com',
          commentText: 'This is an approved and visible comment.',
        },
        context: {
          skipValidationForMigration: true,
        },
        overrideAccess: true,
      })
      createdCommentIds.push(approved.id)

      const pending = await payload.create({
        collection: 'comments',
        data: {
          article: publishedArticleId,
          status: 'pending',
          full_name: 'Pending Submitter',
          email: 'pending-email@example.com',
          commentText: 'This comment should not appear publicly yet.',
        },
        context: {
          skipValidationForMigration: true,
        },
        overrideAccess: true,
      })
      createdCommentIds.push(pending.id)
    })

    it('rejects GET without articleId or slug', async () => {
      const req = createMockReq({
        method: 'GET',
        url: 'http://localhost:3000/api/stories/comments',
      })
      const res = await storyCommentsGetHandler(req)
      expect(res.status).toBe(400)
    })

    it('rejects GET for unpublished draft articles', async () => {
      const req = createMockReq({
        method: 'GET',
        url: `http://localhost:3000/api/stories/comments?articleId=${draftArticleId}`,
      })
      const res = await storyCommentsGetHandler(req)
      expect(res.status).toBe(404)
    })

    it('returns only approved comments and never exposes email addresses', async () => {
      const req = createMockReq({
        method: 'GET',
        url: `http://localhost:3000/api/stories/comments?articleId=${publishedArticleId}`,
      })
      const res = await storyCommentsGetHandler(req)
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.comments)).toBe(true)

      // Should find the approved comment
      const foundApproved = data.comments.find((c: any) => c.authorName === 'Approved Reader')
      expect(foundApproved).toBeDefined()
      expect(foundApproved.commentText).toBe('This is an approved and visible comment.')

      // Should NOT find the pending comment
      const foundPending = data.comments.find((c: any) => c.authorName === 'Pending Submitter')
      expect(foundPending).toBeUndefined()

      // Critical privacy guarantee: email must never be present in returned comments
      for (const comment of data.comments) {
        expect(comment.email).toBeUndefined()
        expect(JSON.stringify(comment)).not.toContain('secret-reader@example.com')
      }
    })

    it('supports pagination via limit and page parameters', async () => {
      const req = createMockReq({
        method: 'GET',
        url: `http://localhost:3000/api/stories/comments?slug=${publishedArticleSlug}&page=1&limit=1`,
      })
      const res = await storyCommentsGetHandler(req)
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.comments.length).toBeLessThanOrEqual(1)
      expect(data.page).toBe(1)
      expect(data.totalDocs).toBeGreaterThanOrEqual(1)
    })
  })
})
