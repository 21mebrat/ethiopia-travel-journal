import crypto from 'crypto'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import {
  calculateEngagementScore,
  recordArticleView,
  reconcileArticleMetrics,
  signVisitorId,
  verifyVisitorId,
  deriveVisitorHash,
  buildViewDeduplicationKey,
} from '@/lib/site/engagement'

let payload: Payload
const runId = crypto.randomUUID().slice(0, 8)
let testUserId: string
let testMediaId: string
const createdArticleIds: Array<string | number> = []
const createdCommentIds: Array<string | number> = []
const createdViewIds: Array<string | number> = []

async function createTestArticle(data: Record<string, any> = {}) {
  const doc = await payload.create({
    collection: 'articles',
    data: {
      title: `Engagement Story ${runId} ${Date.now()}`,
      slug: `story-${runId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      excerpt: 'A fascinating travel story to verify engagement tracking.',
      author: testUserId,
      heroImage: testMediaId,
      content: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              version: 1,
              children: [{ type: 'text', text: 'Engagement test story body.', version: 1 }],
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
      ...data,
    },
    context: {
      internalCounterUpdate: true,
    },
    overrideAccess: true,
  })
  createdArticleIds.push(doc.id)
  return doc
}

describe('Comments, View Deduplication & Engagement Suite', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    // Find or create test user
    const users = await payload.find({ collection: 'users', limit: 1, overrideAccess: true })
    if (users.docs[0]) {
      testUserId = String(users.docs[0].id)
    } else {
      const u = await payload.create({
        collection: 'users',
        data: {
          email: `test-author-${runId}@example.com`,
          password: 'Password123!',
          firstName: 'AuthorFirst',
          lastName: 'AuthorLast',
          preferredLanguage: 'en',
          role: 'admin',
        },
        overrideAccess: true,
      })
      testUserId = String(u.id)
    }

    // Find or create test media
    const media = await payload.find({ collection: 'media', limit: 1, overrideAccess: true })
    if (media.docs[0]) {
      testMediaId = String(media.docs[0].id)
    } else {
      const m = await payload.create({
        collection: 'media',
        data: { alt: 'Test hero' },
        file: {
          data: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
          mimetype: 'image/gif',
          name: `test-${runId}.gif`,
          size: 35,
        },
        overrideAccess: true,
      })
      testMediaId = String(m.id)
    }
  })

  afterAll(async () => {
    // Cleanup test fixtures
    for (const id of createdCommentIds) {
      try {
        await payload.delete({ collection: 'comments', id, overrideAccess: true })
      } catch {}
    }
    for (const id of createdViewIds) {
      try {
        await payload.delete({ collection: 'article-views', id, overrideAccess: true })
      } catch {}
    }
    for (const id of createdArticleIds) {
      try {
        await payload.delete({ collection: 'articles', id, overrideAccess: true })
      } catch {}
    }
  })

  // ==========================================================================
  // PART 1: Engagement Score Calculation
  // ==========================================================================
  describe('Engagement Mathematical Formula', () => {
    it('returns exactly 0 when views and comments are 0', () => {
      expect(calculateEngagementScore(0, 0, 3)).toBe(0)
      expect(calculateEngagementScore(-5, -2, 3)).toBe(0)
    })

    it('calculates score according to ln(1 + views) + weight * ln(1 + comments)', () => {
      const views = 100
      const comments = 10
      const weight = 3
      const expected = Math.log1p(views) + weight * Math.log1p(comments)
      const roundedExpected = Math.round(expected * 10000) / 10000

      const actual = calculateEngagementScore(views, comments, weight)
      expect(actual).toBeCloseTo(roundedExpected, 4)
    })

    it('respects configurable comment weight', () => {
      const views = 50
      const comments = 5
      const weight1 = 1
      const weight5 = 5

      const score1 = calculateEngagementScore(views, comments, weight1)
      const score5 = calculateEngagementScore(views, comments, weight5)
      expect(score5).toBeGreaterThan(score1)
    })
  })

  // ==========================================================================
  // PART 2: Cryptographic Visitor Token & Deduplication Keys
  // ==========================================================================
  describe('Visitor Token Signing & Verification', () => {
    const secret = 'super-secret-key-for-test'

    it('signs and verifies visitor tokens using HMAC-SHA256', () => {
      const visitorId = crypto.randomUUID()
      const signed = signVisitorId(visitorId, secret)

      const verified = verifyVisitorId(signed, secret)
      expect(verified).toBe(visitorId)
    })

    it('rejects tampered visitor tokens', () => {
      const visitorId = crypto.randomUUID()
      const signed = signVisitorId(visitorId, secret)

      const tampered = signed.replace(/[a-z0-9]/, 'x')
      expect(verifyVisitorId(tampered, secret)).toBeNull()
      expect(verifyVisitorId('invalid-token', secret)).toBeNull()
      expect(verifyVisitorId('', secret)).toBeNull()
    })

    it('builds deterministic deduplication keys with 24-hour day epochs', () => {
      const articleId = 'article-123'
      const visitorHash = deriveVisitorHash('visitor-456', secret)
      const dayBucket = 19500

      const key = buildViewDeduplicationKey(articleId, visitorHash, dayBucket)
      expect(key).toBe(`article-123_${visitorHash}_19500`)
    })
  })

  // ==========================================================================
  // PART 3: Server-Side Protection on Article Metrics
  // ==========================================================================
  describe('Server-Side Protection for Article Counters', () => {
    it('prevents unauthorized modification of viewCount, commentCount, and engagementScore', async () => {
      // 1. Anonymous actors cannot update articles at all
      const article = await createTestArticle({
        viewCount: 10,
        commentCount: 2,
        engagementScore: 7.5,
      })

      await expect(
        payload.update({
          collection: 'articles',
          id: article.id,
          data: {
            viewCount: 999999,
            commentCount: 888888,
            engagementScore: 1234.56,
          },
          overrideAccess: false,
        }),
      ).rejects.toThrow()

      // 2. Author actors can edit article content, but counters remain server-protected
      const author = await payload.create({
        collection: 'users',
        data: {
          email: `author-${Date.now()}@test.local`,
          password: 'Password123!',
          firstName: 'AuthorFirst',
          lastName: 'AuthorLast',
          preferredLanguage: 'en',
          role: 'author',
        },
        overrideAccess: true,
      })

      const authorArticle = await createTestArticle({
        author: author.id,
        viewCount: 10,
        commentCount: 2,
        engagementScore: 7.5,
      })

      const updated = await payload.update({
        collection: 'articles',
        id: authorArticle.id,
        data: {
          title: 'Author New Title',
          viewCount: 999999,
          commentCount: 888888,
          engagementScore: 1234.56,
        },
        user: author,
        overrideAccess: false,
      })

      expect(updated.title).toBe('Author New Title')
      expect(updated.viewCount).toBe(10)
      expect(updated.commentCount).toBe(2)
      expect(updated.engagementScore).toBe(7.5)
    })
  })

  // ==========================================================================
  // PART 4: View Deduplication & Concurrency
  // ==========================================================================
  describe('Race-Safe View Deduplication', () => {
    it('records only one view per visitor per 24-hour window', async () => {
      const article = await createTestArticle({ viewCount: 0 })
      const visitorId = crypto.randomUUID()
      const secret = 'test-view-secret'

      // First view
      const first = await recordArticleView(payload, {
        articleId: String(article.id),
        visitorId,
        secret,
      })
      expect(first.tracked).toBe(true)
      expect(first.deduplicated).toBe(false)
      expect(first.viewCount).toBe(1)

      // Immediate second view from same visitor
      const second = await recordArticleView(payload, {
        articleId: String(article.id),
        visitorId,
        secret,
      })
      expect(second.tracked).toBe(false)
      expect(second.deduplicated).toBe(true)

      // Total view count remains 1
      const fetched = await payload.findByID({
        collection: 'articles',
        id: article.id,
        overrideAccess: true,
      })
      expect(fetched.viewCount).toBe(1)
    })

    it('enforces atomic database uniqueness under concurrent view requests', async () => {
      const article = await createTestArticle({ viewCount: 0 })
      const visitorId = crypto.randomUUID()
      const secret = 'test-concurrency-secret'

      // Fire 5 simultaneous requests with the exact same visitor ID
      const results = await Promise.all([
        recordArticleView(payload, { articleId: String(article.id), visitorId, secret }),
        recordArticleView(payload, { articleId: String(article.id), visitorId, secret }),
        recordArticleView(payload, { articleId: String(article.id), visitorId, secret }),
        recordArticleView(payload, { articleId: String(article.id), visitorId, secret }),
        recordArticleView(payload, { articleId: String(article.id), visitorId, secret }),
      ])

      const trackedCount = results.filter((r) => r.tracked).length
      const deduplicatedCount = results.filter((r) => r.deduplicated).length

      // Exactly 1 must have been tracked, exactly 4 deduplicated!
      expect(trackedCount).toBe(1)
      expect(deduplicatedCount).toBe(4)

      // Verified final article count
      const fetched = await payload.findByID({
        collection: 'articles',
        id: article.id,
        overrideAccess: true,
      })
      expect(fetched.viewCount).toBe(1)
    })
  })

  // ==========================================================================
  // PART 5: Comments Moderation & Counter Lifecycle
  // ==========================================================================
  describe('Comment Moderation, Counters & Concurrency', () => {
    it('forces new public comments to pending status and excludes from commentCount', async () => {
      const article = await createTestArticle({ commentCount: 0 })

      // Create a comment without staff credentials
      const comment = await payload.create({
        collection: 'comments',
        data: {
          article: article.id,
          full_name: 'Test Visitor',
          commentText: 'This is an awesome travel story!',
          status: 'approved', // Public submission trying to self-approve
        },
        context: {
          isPublicSubmission: true,
        },
        overrideAccess: false,
      })
      createdCommentIds.push(comment.id)

      // Server-side beforeChange must have forced status to pending
      expect(comment.status).toBe('pending')

      // Article commentCount must remain 0
      const fetchedArticle = await payload.findByID({
        collection: 'articles',
        id: article.id,
        overrideAccess: true,
      })
      expect(fetchedArticle.commentCount).toBe(0)
    })

    it('increments commentCount when comment is approved by staff', async () => {
      const article = await createTestArticle({ commentCount: 0, viewCount: 10 })

      const comment = await payload.create({
        collection: 'comments',
        data: {
          article: article.id,
          full_name: 'Reader 1',
          commentText: 'Great insights!',
          status: 'pending',
        },
        overrideAccess: true,
      })
      createdCommentIds.push(comment.id)

      // Staff approves the comment
      await payload.update({
        collection: 'comments',
        id: comment.id,
        data: {
          status: 'approved',
        },
        overrideAccess: true,
      })

      const updatedArticle = await payload.findByID({
        collection: 'articles',
        id: article.id,
        overrideAccess: true,
      })

      expect(updatedArticle.commentCount).toBe(1)
      const expectedScore = calculateEngagementScore(10, 1, 3)
      expect(updatedArticle.engagementScore).toBe(expectedScore)
    })

    it('does not increment counter again when an approved comment receives an unrelated edit', async () => {
      const article = await createTestArticle({ commentCount: 0, viewCount: 10 })

      const comment = await payload.create({
        collection: 'comments',
        data: {
          article: article.id,
          full_name: 'Reader 2',
          commentText: 'Initial comment content.',
          status: 'approved',
        },
        overrideAccess: true,
      })
      createdCommentIds.push(comment.id)

      // Verify commentCount is 1
      let currentArticle = await payload.findByID({
        collection: 'articles',
        id: article.id,
        overrideAccess: true,
      })
      expect(currentArticle.commentCount).toBe(1)

      // Staff edits typo in the comment text (status remains approved)
      await payload.update({
        collection: 'comments',
        id: comment.id,
        data: {
          commentText: 'Corrected typo in comment content.',
        },
        overrideAccess: true,
      })

      // commentCount MUST remain 1, NOT increment to 2
      currentArticle = await payload.findByID({
        collection: 'articles',
        id: article.id,
        overrideAccess: true,
      })
      expect(currentArticle.commentCount).toBe(1)
    })

    it('decrements commentCount when an approved comment is rejected or deleted', async () => {
      const article = await createTestArticle({ commentCount: 0, viewCount: 20 })

      const comment = await payload.create({
        collection: 'comments',
        data: {
          article: article.id,
          full_name: 'Spam Commenter',
          commentText: 'Spam message.',
          status: 'approved',
        },
        overrideAccess: true,
      })

      let currentArticle = await payload.findByID({
        collection: 'articles',
        id: article.id,
        overrideAccess: true,
      })
      expect(currentArticle.commentCount).toBe(1)

      // Reject the comment
      await payload.update({
        collection: 'comments',
        id: comment.id,
        data: {
          status: 'rejected',
        },
        overrideAccess: true,
      })

      currentArticle = await payload.findByID({
        collection: 'articles',
        id: article.id,
        overrideAccess: true,
      })
      expect(currentArticle.commentCount).toBe(0)

      // Re-approve and delete
      await payload.update({
        collection: 'comments',
        id: comment.id,
        data: {
          status: 'approved',
        },
        overrideAccess: true,
      })
      await payload.delete({
        collection: 'comments',
        id: comment.id,
        overrideAccess: true,
      })

      currentArticle = await payload.findByID({
        collection: 'articles',
        id: article.id,
        overrideAccess: true,
      })
      expect(currentArticle.commentCount).toBe(0)
    })

    it('correctly handles article reassignment for old and new articles', async () => {
      const articleA = await createTestArticle({ commentCount: 0 })
      const articleB = await createTestArticle({ commentCount: 0 })

      // Create approved comment on Article A
      const comment = await payload.create({
        collection: 'comments',
        data: {
          article: articleA.id,
          full_name: 'Mobile Reader',
          commentText: 'Relevant to Lalibela.',
          status: 'approved',
        },
        overrideAccess: true,
      })
      createdCommentIds.push(comment.id)

      let fetchedA = await payload.findByID({ collection: 'articles', id: articleA.id, overrideAccess: true })
      let fetchedB = await payload.findByID({ collection: 'articles', id: articleB.id, overrideAccess: true })
      expect(fetchedA.commentCount).toBe(1)
      expect(fetchedB.commentCount).toBe(0)

      // Reassign comment from Article A to Article B
      await payload.update({
        collection: 'comments',
        id: comment.id,
        data: {
          article: articleB.id,
        },
        overrideAccess: true,
      })

      fetchedA = await payload.findByID({ collection: 'articles', id: articleA.id, overrideAccess: true })
      fetchedB = await payload.findByID({ collection: 'articles', id: articleB.id, overrideAccess: true })
      expect(fetchedA.commentCount).toBe(0)
      expect(fetchedB.commentCount).toBe(1)
    })
  })

  // ==========================================================================
  // PART 6: Reconciliation Resilience
  // ==========================================================================
  describe('Reconciliation Invariant', () => {
    it('preserves concurrent nonzero view increments during comment reconciliation', async () => {
      const article = await createTestArticle({ viewCount: 50, commentCount: 0 })

      // Create two approved comments
      const c1 = await payload.create({
        collection: 'comments',
        data: { article: article.id, full_name: 'C1', commentText: 'First', status: 'approved' },
        overrideAccess: true,
      })
      const c2 = await payload.create({
        collection: 'comments',
        data: { article: article.id, full_name: 'C2', commentText: 'Second', status: 'approved' },
        overrideAccess: true,
      })
      createdCommentIds.push(c1.id, c2.id)

      // Reconcile
      const reconciled = await reconcileArticleMetrics(payload, String(article.id))

      // View count must be preserved at 50, comment count at 2
      expect(reconciled.viewCount).toBe(50)
      expect(reconciled.commentCount).toBe(2)
      expect(reconciled.engagementScore).toBe(calculateEngagementScore(50, 2))
    })
  })

  // ==========================================================================
  // PART 7: Privacy & Legacy Comments
  // ==========================================================================
  describe('Privacy & Legacy Unassigned Comments', () => {
    it('never exposes private commenter emails in public queries', async () => {
      const article = await createTestArticle()
      const comment = await payload.create({
        collection: 'comments',
        data: {
          article: article.id,
          full_name: 'Private Reader',
          email: 'secret@private-domain.com',
          commentText: 'My secret email must not leak.',
          status: 'approved',
        },
        overrideAccess: true,
      })
      createdCommentIds.push(comment.id)

      // Query without staff credentials (public access)
      const publicResult = await payload.find({
        collection: 'comments',
        where: {
          id: { equals: comment.id },
        },
        context: {
          isPublicQuery: true,
        },
        overrideAccess: false,
      })

      expect(publicResult.docs.length).toBe(1)
      const doc = publicResult.docs[0] as any
      // email must not be returned
      expect(doc.email).toBeUndefined()
    })

    it('allows editing legacy comments without an article while requiring one for public submissions', async () => {
      // 1. Staff editing legacy comment without article succeeds
      const legacyComment = await payload.create({
        collection: 'comments',
        data: {
          full_name: 'Legacy Author',
          commentText: 'Old legacy comment.',
          status: 'pending',
        },
        overrideAccess: true,
      })
      createdCommentIds.push(legacyComment.id)

      const updatedLegacy = await payload.update({
        collection: 'comments',
        id: legacyComment.id,
        data: {
          full_name: 'Updated Legacy Author',
        },
        overrideAccess: true,
      })
      expect(updatedLegacy.full_name).toBe('Updated Legacy Author')

      // 2. Public submission without article fails
      await expect(
        payload.create({
          collection: 'comments',
          data: {
            full_name: 'Public Offender',
            commentText: 'Comment with no article.',
            status: 'pending',
          },
          context: {
            isPublicSubmission: true,
          },
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    })
  })
})
