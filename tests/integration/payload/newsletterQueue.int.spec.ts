import crypto from 'crypto'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import {
  enqueueArticleNewsletter,
  claimNextDelivery,
} from '@/lib/newsletter/queue'

let payload: Payload
const runId = crypto.randomUUID().slice(0, 8)
let testUserId: string
let testMediaId: string
const createdArticleIds: Array<string | number> = []
const createdSubscriberIds: Array<string | number> = []
const createdBroadcastIds: Array<string | number> = []
const createdDeliveryIds: Array<string | number> = []

describe('Integration: Payload Newsletter Queue & Atomic Leases', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })

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

    const users = await payload.find({ collection: 'users', limit: 1, overrideAccess: true })
    testUserId = String(users.docs[0]?.id)

    const media = await payload.find({ collection: 'media', limit: 1, overrideAccess: true })
    testMediaId = String(media.docs[0]?.id)
  })

  afterAll(async () => {
    if (createdDeliveryIds.length > 0) {
      await payload.delete({
        collection: 'newsletter-deliveries',
        where: { id: { in: createdDeliveryIds } },
        overrideAccess: true,
      })
    }
    if (createdBroadcastIds.length > 0) {
      await payload.delete({
        collection: 'newsletter-broadcasts',
        where: { id: { in: createdBroadcastIds } },
        overrideAccess: true,
      })
    }
    if (createdSubscriberIds.length > 0) {
      await payload.delete({
        collection: 'subscribers',
        where: { id: { in: createdSubscriberIds } },
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

  it('enqueues deliveries and performs atomic worker claims', async () => {
    // 1. Create a subscriber with confirmed status
    const subscriber = await payload.create({
      collection: 'subscribers',
      data: {
        email: `queue-sub-${runId}@example.com`,
        status: 'subscribed',
        locale: 'en',
      },
      overrideAccess: true,
    })
    createdSubscriberIds.push(subscriber.id)

    // 2. Create an article
    const article = await payload.create({
      collection: 'articles',
      data: {
        title: `Queue Broadcast Story ${runId}`,
        slug: `queue-story-${runId}`,
        excerpt: 'Excerpt for queue broadcast.',
        author: testUserId,
        heroImage: testMediaId,
        content: {
          root: {
            type: 'root',
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
            children: [
              {
                type: 'paragraph',
                direction: 'ltr',
                format: '',
                indent: 0,
                version: 1,
                children: [{ type: 'text', text: 'Queue broadcast content.', version: 1, mode: 'normal', style: '', detail: 0, format: 0 }],
              },
            ],
          },
        } as any,
        _status: 'published',
      },
      context: { disableNewsletter: true },
      overrideAccess: true,
    })
    createdArticleIds.push(article.id)

    // 3. Enqueue broadcast
    const { broadcastId, enqueuedCount } = await enqueueArticleNewsletter(
      payload,
      article.id,
    )
    createdBroadcastIds.push(broadcastId)
    expect(enqueuedCount).toBeGreaterThanOrEqual(1)

    // Find created deliveries
    const deliveries = await payload.find({
      collection: 'newsletter-deliveries',
      where: {
        broadcast: { equals: broadcastId },
        subscriber: { equals: subscriber.id },
      },
      overrideAccess: true,
    })
    expect(deliveries.totalDocs).toBe(1)
    const delivery = deliveries.docs[0]
    createdDeliveryIds.push(delivery.id)

    // 4. Worker A claims the next delivery
    const workerA = 'worker-node-1'
    const claimedByA = await claimNextDelivery(payload, broadcastId, workerA, 30000)
    expect(claimedByA).not.toBeNull()
    expect(claimedByA.id).toBe(String(delivery.id))
    expect(claimedByA.status).toBe('sending')
    expect(claimedByA.workerId).toBe(workerA)

    // 5. Worker B attempts to claim when no other deliveries exist -> returns null
    const workerB = 'worker-node-2'
    const claimedByB = await claimNextDelivery(payload, broadcastId, workerB, 30000)
    expect(claimedByB).toBeNull()

    // 6. Simulate crash / lease expiration
    await payload.update({
      collection: 'newsletter-deliveries',
      id: delivery.id,
      data: {
        leaseExpiresAt: new Date(Date.now() - 5000).toISOString(),
      },
      overrideAccess: true,
    })

    // 7. A new worker claiming automatically recovers and reclaims the stale delivery
    const workerC = 'worker-node-3'
    const reclaimedByC = await claimNextDelivery(payload, broadcastId, workerC, 30000)
    expect(reclaimedByC).not.toBeNull()
    expect(reclaimedByC.id).toBe(String(delivery.id))
    expect(reclaimedByC.workerId).toBe(workerC)
  })
})
