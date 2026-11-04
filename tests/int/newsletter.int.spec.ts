import crypto from 'crypto'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } from 'vitest'
import {
  generateSecureToken,
  hashToken,
  verifyTokenHash,
  isTokenExpired,
  isValidTokenFormat,
  getConfirmationExpiration,
  getSubscriberUnsubscribeToken,
  migrateLegacySubscribers,
} from '@/lib/email/tokens'
import {
  clearCapturedEmails,
  getCapturedEmails,
  setSimulatedEmailFailures,
} from '@/lib/email/adapter'
import { buildConfirmSubscriptionEmail } from '@/lib/email/templates/confirmSubscription'
import { buildArticlePublishedEmail } from '@/lib/email/templates/articlePublished'
import { buildUnsubscribeConfirmationEmail } from '@/lib/email/templates/unsubscribeConfirmation'
import {
  claimNextDelivery,
  enqueueArticleNewsletter,
  processNewsletterBroadcast,
  recoverUnfinishedBroadcasts,
  updateBroadcastDerivedStats,
} from '@/lib/newsletter/queue'
import { afterArticleChange } from '@/hooks/afterArticleChange'
import { newsletterSubscribeHandler } from '@/endpoints/newsletterSubscribe'
import { newsletterConfirmHandler } from '@/endpoints/newsletterConfirm'
import {
  newsletterUnsubscribePostHandler,
  newsletterUnsubscribeGetHandler,
} from '@/endpoints/newsletterUnsubscribe'

let payload: Payload
const runId = crypto.randomUUID().slice(0, 8)
let testAuthorId: string
let testMediaId: string

// Track created IDs for strict test cleanup
const createdSubscriberIds: Array<string | number> = []
const createdArticleIds: Array<string | number> = []
const createdBroadcastIds: Array<string | number> = []
const createdDeliveryIds: Array<string | number> = []

describe('Production Newsletter: Comprehensive Security & Resilience Suite', () => {
  beforeAll(async () => {
    ;(process.env as any).NODE_ENV = 'test'
    process.env.ENABLE_TEST_EMAIL_CAPTURE = 'true'
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    // Clean up test collections in the isolated test database before the test suite runs
    try {
      await payload.delete({
        collection: 'newsletter-deliveries',
        where: { id: { exists: true } },
        overrideAccess: true,
      })
      await payload.delete({
        collection: 'newsletter-broadcasts',
        where: { id: { exists: true } },
        overrideAccess: true,
      })
      await payload.delete({
        collection: 'subscribers',
        where: { id: { exists: true } },
        overrideAccess: true,
      })
    } catch {}

    // Ensure fixtures for test author and media exist in the isolated test database
    let user: any = (await payload.find({ collection: 'users', limit: 1, overrideAccess: true })).docs[0]
    if (!user) {
      user = await payload.create({
        collection: 'users',
        data: {
          email: `test-author-${Date.now()}@test.local`,
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'Author',
          role: 'admin',
          displayName: 'Test Author',
        },
        overrideAccess: true,
      } as any)
    }
    testAuthorId = String(user.id)

    let media: any = (await payload.find({ collection: 'media', limit: 1, overrideAccess: true })).docs[0]
    if (!media) {
      media = await payload.create({
        collection: 'media',
        data: {
          alt: 'Test Cover Image',
        },
        file: {
          data: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
          mimetype: 'image/gif',
          name: 'test-cover.gif',
          size: 43,
        },
        overrideAccess: true,
      })
    }
    testMediaId = String(media.id)
  })

  beforeEach(() => {
    clearCapturedEmails()
    setSimulatedEmailFailures(0)
  })

  afterEach(async () => {
    clearCapturedEmails()
    setSimulatedEmailFailures(0)
    if (createdDeliveryIds.length > 0) {
      const ids = createdDeliveryIds.splice(0, createdDeliveryIds.length)
      try {
        await payload.delete({ collection: 'newsletter-deliveries', where: { id: { in: ids } }, overrideAccess: true })
      } catch {}
    }
    if (createdBroadcastIds.length > 0) {
      const ids = createdBroadcastIds.splice(0, createdBroadcastIds.length)
      try {
        await payload.delete({ collection: 'newsletter-broadcasts', where: { id: { in: ids } }, overrideAccess: true })
      } catch {}
    }
    if (createdSubscriberIds.length > 0) {
      const ids = createdSubscriberIds.splice(0, createdSubscriberIds.length)
      try {
        await payload.delete({ collection: 'subscribers', where: { id: { in: ids } }, overrideAccess: true })
      } catch {}
    }
  })

  afterAll(async () => {
    // Isolated Cleanup: Delete test articles created specifically during this test run
    for (const id of createdArticleIds) {
      try {
        await payload.delete({ collection: 'articles', id, overrideAccess: true })
      } catch {}
    }
  })

  // Helper to create an isolated test article
  async function createTestArticle(status: 'draft' | 'published' = 'published') {
    const article = await payload.create({
      collection: 'articles',
      data: {
        title: `Test Article ${runId} ${Date.now()}`,
        slug: `test-article-${runId}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        excerpt: 'Isolated test story excerpt.',
        author: testAuthorId,
        heroImage: testMediaId,
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                version: 1,
                children: [{ type: 'text', text: 'Story content', version: 1 }],
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
        _status: status,
      },
      context: { disableNewsletter: true },
      overrideAccess: true,
    })
    createdArticleIds.push(article.id)
    return article
  }

  // Helper to create an isolated test subscriber
  async function createTestSubscriber(status: 'subscribed' | 'pending' | 'unsubscribed' = 'subscribed', locale: 'en' | 'am' = 'en') {
    const email = `sub-${runId}-${Date.now()}-${Math.random().toString(36).substring(7)}@test-isolated.local`
    const sub = await payload.create({
      collection: 'subscribers',
      data: {
        email,
        status,
        locale,
        tokenVersion: 2,
      },
      overrideAccess: true,
    })

    const token = getSubscriberUnsubscribeToken({
      id: sub.id,
      email: sub.email,
      createdAt: sub.createdAt,
    })
    await payload.update({
      collection: 'subscribers',
      id: sub.id,
      data: {
        unsubscribeTokenHash: hashToken(token),
      },
      overrideAccess: true,
    })

    createdSubscriberIds.push(sub.id)
    return { sub, rawUnsubscribeToken: token }
  }

  describe('1. Cryptographic Security & Privacy-Preserving Responses', () => {
    it('generates high-entropy tokens and validates token formatting', () => {
      const token = generateSecureToken()
      expect(token).toHaveLength(64)
      expect(isValidTokenFormat(token)).toBe(true)
      expect(isValidTokenFormat('short-id')).toBe(false)
      expect(isValidTokenFormat('672b12345678901234567890')).toBe(false) // Mongo ID length (24) rejected
    })

    it('subscribing returns a privacy-preserving uniform response without status leakage', async () => {
      const email = `privacy-${Date.now()}@test-privacy.local`
      const mockReq: any = {
        json: async () => ({ email, locale: 'en' }),
        payload,
      }

      // First submission
      const res1 = await newsletterSubscribeHandler(mockReq)
      expect(res1.status).toBe(200)
      const data1 = await res1.json()
      expect(data1.success).toBe(true)
      expect(data1.alreadySubscribed).toBeUndefined() // No status leakage!

      // Second submission for same email: must return identical message format
      const res2 = await newsletterSubscribeHandler(mockReq)
      expect(res2.status).toBe(200)
      const data2 = await res2.json()
      expect(data2.success).toBe(true)
      expect(data2.message).toBe(data1.message)
      expect(data2.alreadySubscribed).toBeUndefined()
    })

    it('preserves locale in confirmation links and article email links', () => {
      const confirmEmailAm = buildConfirmSubscriptionEmail({
        confirmationUrl: 'https://example.com/newsletter/confirm?token=abc&locale=am',
        locale: 'am',
      })
      expect(confirmEmailAm.html).toContain('locale=am')

      const articleEmailAm = buildArticlePublishedEmail({
        title: 'አዲስ ታሪክ',
        articleUrl: 'https://example.com/articles/slug?locale=am',
        unsubscribeUrl: 'https://example.com/newsletter/unsubscribe?token=abc&locale=am',
        locale: 'am',
      })
      expect(articleEmailAm.html).toContain('locale=am')
    })
  })

  describe('2. Unsubscribe Security & Migration (Regression: Invalid ID/Hash Rejection)', () => {
    it('rejects raw subscriber ID as unsubscribe token', async () => {
      const { sub } = await createTestSubscriber('subscribed')

      const mockReq: any = {
        method: 'POST',
        url: 'http://localhost/api/newsletter/unsubscribe',
        json: async () => ({ token: String(sub.id) }), // Attacker passes raw subscriber ID
        payload,
      }

      const res = await newsletterUnsubscribePostHandler(mockReq)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)

      // Subscriber MUST remain subscribed
      const refreshed = await payload.findByID({ collection: 'subscribers', id: sub.id, overrideAccess: true })
      expect(refreshed.status).toBe('subscribed')
    })

    it('rejects passing stored hash directly as bearer token', async () => {
      const { sub } = await createTestSubscriber('subscribed')

      // Attacker extracts sub.unsubscribeTokenHash from DB and presents it as bearer token
      const mockReq: any = {
        method: 'POST',
        url: 'http://localhost/api/newsletter/unsubscribe',
        json: async () => ({ token: sub.unsubscribeTokenHash }),
        payload,
      }

      const res = await newsletterUnsubscribePostHandler(mockReq)
      // Should not match the subscriber because hashToken(storedHash) !== storedHash
      const refreshed = await payload.findByID({ collection: 'subscribers', id: sub.id, overrideAccess: true })
      expect(refreshed.status).toBe('subscribed')
    })

    it('successfully unsubscribes with authentic raw token via indexed lookup', async () => {
      const { sub, rawUnsubscribeToken } = await createTestSubscriber('subscribed')

      const mockReq: any = {
        method: 'POST',
        url: 'http://localhost/api/newsletter/unsubscribe',
        json: async () => ({ token: rawUnsubscribeToken }),
        payload,
      }

      const res = await newsletterUnsubscribePostHandler(mockReq)
      expect(res.status).toBe(200)

      const refreshed = await payload.findByID({ collection: 'subscribers', id: sub.id, overrideAccess: true })
      expect(refreshed.status).toBe('unsubscribed')
    })

    it('migrates legacy subscribers without reversing existing opt-outs', async () => {
      // 1. Create a legacy opted-out subscriber
      const legacyOptOut = await payload.create({
        collection: 'subscribers',
        data: {
          email: `legacy-optout-${Date.now()}@test.local`,
          status: 'unsubscribed',
          unsubscribeTokenHash: 'legacy-hash-12345678901234567890123456789012',
          tokenVersion: 1 as any,
        },
        overrideAccess: true,
      })
      createdSubscriberIds.push(legacyOptOut.id)

      // 2. Run migration
      await migrateLegacySubscribers(payload)

      // 3. Verify opt-out was NOT reversed
      const refreshed = await payload.findByID({
        collection: 'subscribers',
        id: legacyOptOut.id,
        overrideAccess: true,
      })
      expect(refreshed.status).toBe('unsubscribed')
      expect(refreshed.tokenVersion).toBe(2)
    })
  })

  describe('3. Scalability: More Than 100 Subscribers', () => {
    it('enqueues and processes broadcasts for over 100 subscribers without 100-limit bottlenecks', async () => {
      const article = await createTestArticle()

      // Seed 105 active subscribers in parallel batches for speed
      const countToSeed = 105
      const seededSubs: any[] = []
      for (let i = 0; i < countToSeed; i += 20) {
        const batchSize = Math.min(20, countToSeed - i)
        const batch = await Promise.all(
          Array.from({ length: batchSize }).map(() => createTestSubscriber('subscribed')),
        )
        seededSubs.push(...batch)
      }

      // Enqueue
      const { broadcastId, enqueuedCount } = await enqueueArticleNewsletter(payload, article.id)
      createdBroadcastIds.push(broadcastId)
      expect(enqueuedCount).toBeGreaterThanOrEqual(countToSeed)

      // Process in batches
      const result = await processNewsletterBroadcast(payload, broadcastId, { batchSize: 50, interBatchDelayMs: 0 })
      expect(result.sent).toBeGreaterThanOrEqual(countToSeed)

      // Verify subscriber #103 can unsubscribe using their indexed token
      const sub103 = seededSubs[102]
      const mockReq: any = {
        method: 'POST',
        url: 'http://localhost/api/newsletter/unsubscribe',
        json: async () => ({ token: sub103.rawUnsubscribeToken }),
        payload,
      }
      const unsubRes = await newsletterUnsubscribePostHandler(mockReq)
      expect(unsubRes.status).toBe(200)

      const refreshed103 = await payload.findByID({ collection: 'subscribers', id: sub103.sub.id, overrideAccess: true })
      expect(refreshed103.status).toBe('unsubscribed')
    }, 60000)
  })

  describe('4. Atomic Delivery Claims & Two Concurrent Workers', () => {
    it('two concurrent workers do not double-send any delivery', async () => {
      const article = await createTestArticle()
      const subs: any[] = []
      for (let i = 0; i < 10; i++) {
        const s = await createTestSubscriber('subscribed')
        subs.push(s)
      }

      const { broadcastId } = await enqueueArticleNewsletter(payload, article.id)
      createdBroadcastIds.push(broadcastId)

      // Launch Worker A and Worker B simultaneously
      const [resA, resB] = await Promise.all([
        processNewsletterBroadcast(payload, broadcastId, { workerId: 'worker_A', batchSize: 5, interBatchDelayMs: 10 }),
        processNewsletterBroadcast(payload, broadcastId, { workerId: 'worker_B', batchSize: 5, interBatchDelayMs: 10 }),
      ])

      const totalSent = resA.sent + resB.sent
      expect(totalSent).toBe(10)

      // Query database rows: Every delivery must be sent exactly once
      const deliveries = await payload.find({
        collection: 'newsletter-deliveries',
        where: { broadcast: { equals: broadcastId } },
        pagination: false,
        overrideAccess: true,
      })
      expect(deliveries.docs).toHaveLength(10)
      for (const d of deliveries.docs) {
        expect(d.status).toBe('sent')
        expect(d.attempts).toBe(1)
      }

      // Check derived broadcast totals
      const broadcast = await payload.findByID({ collection: 'newsletter-broadcasts', id: broadcastId, overrideAccess: true })
      expect(broadcast.status).toBe('completed')
      expect(broadcast.sentCount).toBe(10)
      expect(broadcast.failedCount).toBe(0)
    })
  })

  describe('5. Crash Recovery & Stale Leases', () => {
    it('recovers stale sending deliveries whose lease expired after simulated crash', async () => {
      const article = await createTestArticle()
      const { sub } = await createTestSubscriber('subscribed')

      const { broadcastId } = await enqueueArticleNewsletter(payload, article.id)
      createdBroadcastIds.push(broadcastId)

      const deliveries = await payload.find({
        collection: 'newsletter-deliveries',
        where: { broadcast: { equals: broadcastId } },
        overrideAccess: true,
      })
      const delivery = deliveries.docs[0]

      // Simulate a crashed worker: delivery is left in 'sending' with an expired lease
      await payload.update({
        collection: 'newsletter-deliveries',
        id: delivery.id,
        data: {
          status: 'sending',
          workerId: 'crashed_worker_999',
          leaseClaimedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          leaseExpiresAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // Expired 5 mins ago
          attempts: 1,
        },
        overrideAccess: true,
      })

      // Next worker run must reclaim and deliver it
      const res = await processNewsletterBroadcast(payload, broadcastId, { workerId: 'recovery_worker_1', interBatchDelayMs: 0 })
      expect(res.sent).toBe(1)

      const refreshed = await payload.findByID({
        collection: 'newsletter-deliveries',
        id: delivery.id,
        overrideAccess: true,
      })
      expect(refreshed.status).toBe('sent')
      expect(refreshed.attempts).toBe(2)
      expect(refreshed.workerId).toBe('recovery_worker_1')
    })
  })

  describe('6. Resumable Fanout: Partial Failure & Idempotent Completion', () => {
    it('resumes partial fanout without swallowing non-duplicate errors', async () => {
      const article = await createTestArticle()
      for (let i = 0; i < 5; i++) {
        await createTestSubscriber('subscribed')
      }

      // 1. Initial fanout
      const { broadcastId } = await enqueueArticleNewsletter(payload, article.id)
      createdBroadcastIds.push(broadcastId)

      // Simulate partial fanout: reset fanoutStatus to in_progress
      await payload.update({
        collection: 'newsletter-broadcasts',
        id: broadcastId,
        data: { fanoutStatus: 'in_progress' },
        overrideAccess: true,
      })

      // 2. Call enqueueArticleNewsletter again: must resume, catch 11000 duplicates cleanly, and complete
      const repeat = await enqueueArticleNewsletter(payload, article.id)
      expect(repeat.broadcastId).toBe(broadcastId)

      const broadcast = await payload.findByID({ collection: 'newsletter-broadcasts', id: broadcastId, overrideAccess: true })
      expect(broadcast.fanoutStatus).toBe('completed')
    })
  })

  describe('7. Retry Resilience: Failed Attempt Followed by Successful Delivery', () => {
    it('retries failed delivery on subsequent worker tick and updates derived stats', async () => {
      const article = await createTestArticle()
      await createTestSubscriber('subscribed')

      const { broadcastId } = await enqueueArticleNewsletter(payload, article.id)
      createdBroadcastIds.push(broadcastId)

      // Simulate 1 failure
      setSimulatedEmailFailures(1, 'Temporary SMTP upstream 421 timeout')

      // First run: should fail and mark delivery as failed
      const run1 = await processNewsletterBroadcast(payload, broadcastId, { interBatchDelayMs: 0 })
      expect(run1.failed).toBe(1)
      expect(run1.sent).toBe(0)

      let broadcast = await payload.findByID({ collection: 'newsletter-broadcasts', id: broadcastId, overrideAccess: true })
      expect(broadcast.status).toBe('failed')
      expect(broadcast.failedCount).toBe(1)

      // Second run without failure: should claim retry and succeed
      const run2 = await processNewsletterBroadcast(payload, broadcastId, { interBatchDelayMs: 0 })
      expect(run2.sent).toBe(1)

      broadcast = await payload.findByID({ collection: 'newsletter-broadcasts', id: broadcastId, overrideAccess: true })
      expect(broadcast.status).toBe('completed')
      expect(broadcast.sentCount).toBe(1)
      expect(broadcast.failedCount).toBe(0) // Derived stats accurately reflect 0 failed rows remaining!
    })
  })

  describe('8. Mid-Flight Unsubscribe Before Queued Delivery', () => {
    it('skips delivering to subscribers who unsubscribed after enqueue but before worker dispatch', async () => {
      const article = await createTestArticle()
      const subA = await createTestSubscriber('subscribed')
      const subB = await createTestSubscriber('subscribed')

      const { broadcastId } = await enqueueArticleNewsletter(payload, article.id)
      createdBroadcastIds.push(broadcastId)

      // Subscriber B opts out before the delivery worker executes
      await payload.update({
        collection: 'subscribers',
        id: subB.sub.id,
        data: { status: 'unsubscribed' },
        overrideAccess: true,
      })

      // Run worker
      const res = await processNewsletterBroadcast(payload, broadcastId, { interBatchDelayMs: 0 })
      expect(res.sent).toBe(1)
      expect(res.skipped).toBe(1)

      const deliveries = await payload.find({
        collection: 'newsletter-deliveries',
        where: { broadcast: { equals: broadcastId } },
        overrideAccess: true,
      })

      const delivA = deliveries.docs.find((d) => String(typeof d.subscriber === 'object' ? (d.subscriber as any).id : d.subscriber) === String(subA.sub.id))
      const delivB = deliveries.docs.find((d) => String(typeof d.subscriber === 'object' ? (d.subscriber as any).id : d.subscriber) === String(subB.sub.id))

      expect(delivA?.status).toBe('sent')
      expect(delivB?.status).toBe('skipped')
    })
  })

  describe('9. Accidental Resend Prevention on Edits & Republishing', () => {
    it('draft saves do not send emails', async () => {
      const article = await createTestArticle('draft')
      const sub = await createTestSubscriber('subscribed')

      // Trigger hook on draft save
      await afterArticleChange({
        collection: { slug: 'articles' } as any,
        doc: article,
        previousDoc: undefined,
        data: {} as any,
        operation: 'create',
        req: { payload } as any,
        context: {},
      })

      const broadcasts = await payload.find({
        collection: 'newsletter-broadcasts',
        where: { article: { equals: article.id } },
        overrideAccess: true,
      })
      expect(broadcasts.totalDocs).toBe(0)
    })

    it('published edits and republishing do not duplicate deliveries', async () => {
      const article = await createTestArticle('published')
      await createTestSubscriber('subscribed')

      // 1. Initial publication
      await afterArticleChange({
        collection: { slug: 'articles' } as any,
        doc: article,
        previousDoc: { ...article, _status: 'draft' },
        data: {} as any,
        operation: 'update',
        req: { payload } as any,
        context: {},
      })

      const initialBroadcasts = await payload.find({
        collection: 'newsletter-broadcasts',
        where: { article: { equals: article.id } },
        overrideAccess: true,
      })
      expect(initialBroadcasts.totalDocs).toBe(1)
      const broadcastId = initialBroadcasts.docs[0].id
      createdBroadcastIds.push(broadcastId)

      // Fetch stamped article
      const stampedArticle = await payload.findByID({ collection: 'articles', id: article.id, overrideAccess: true })
      expect(stampedArticle.newsletterPublishedAt).toBeDefined()

      // 2. Routine edit on published article
      await afterArticleChange({
        collection: { slug: 'articles' } as any,
        doc: { ...stampedArticle, title: 'Updated Title' },
        previousDoc: stampedArticle,
        data: {} as any,
        operation: 'update',
        req: { payload } as any,
        context: {},
      })

      // 3. Unpublish and republish
      await afterArticleChange({
        collection: { slug: 'articles' } as any,
        doc: { ...stampedArticle, _status: 'published' },
        previousDoc: { ...stampedArticle, _status: 'draft' },
        data: {} as any,
        operation: 'update',
        req: { payload } as any,
        context: {},
      })

      // Must remain exactly 1 broadcast in total
      const finalBroadcasts = await payload.find({
        collection: 'newsletter-broadcasts',
        where: { article: { equals: article.id } },
        overrideAccess: true,
      })
      expect(finalBroadcasts.totalDocs).toBe(1)
      expect(finalBroadcasts.docs[0].id).toBe(broadcastId)
    })
  })

  describe('10. Durable Recovery: Handles Unfinished Broadcasts without Historical Backfills', () => {
    it('recovers existing unfinished broadcasts and never touches unapproved historical articles', async () => {
      // Historical article that was published in the past and never had a broadcast
      const historicalArticle = await payload.create({
        collection: 'articles',
        data: {
          title: `Historical Article ${Date.now()}`,
          slug: `historical-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          excerpt: 'Historical article before newsletter existed.',
          author: testAuthorId,
          heroImage: testMediaId,
          content: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'paragraph',
                  version: 1,
                  children: [{ type: 'text', text: 'Historical content', version: 1 }],
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
            },
          },
          _status: 'published',
        },
        context: { disableNewsletter: true },
        overrideAccess: true,
      })
      createdArticleIds.push(historicalArticle.id)

      // Unfinished broadcast for another article
      const activeArticle = await createTestArticle('draft')
      await createTestSubscriber('subscribed')
      const { broadcastId } = await enqueueArticleNewsletter(payload, activeArticle.id)
      createdBroadcastIds.push(broadcastId)

      // Run durable recovery
      const recovered = await recoverUnfinishedBroadcasts(payload, { interBatchDelayMs: 0 })
      expect(recovered).toBeGreaterThanOrEqual(1)

      // Verify the active broadcast completed
      const activeBroadcast = await payload.findByID({ collection: 'newsletter-broadcasts', id: broadcastId, overrideAccess: true })
      expect(activeBroadcast.status).toBe('completed')

      // Verify historical article was NEVER backfilled without approval!
      const historicalBroadcasts = await payload.find({
        collection: 'newsletter-broadcasts',
        where: { article: { equals: historicalArticle.id } },
        overrideAccess: true,
      })
      expect(historicalBroadcasts.totalDocs).toBe(0)
    })
  })
})
