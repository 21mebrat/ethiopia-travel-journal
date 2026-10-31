import crypto from 'crypto'
import type { Payload } from 'payload'
import { getSiteUrl } from '../email/adapter'
import { buildArticlePublishedEmail } from '../email/templates/articlePublished'
import { getSubscriberUnsubscribeToken, hashToken } from '../email/tokens'

export type DispatchOptions = {
  batchSize?: number
  interBatchDelayMs?: number
  maxRetries?: number
  leaseDurationMs?: number
  workerId?: string
}

const DEFAULT_OPTIONS: Required<DispatchOptions> = {
  batchSize: 15,
  interBatchDelayMs: 250,
  maxRetries: 3,
  leaseDurationMs: 5 * 60 * 1000, // 5 minutes
  workerId: '',
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Checks if an error is an authentic MongoDB duplicate key error (E11000).
 * Prevents swallowing arbitrary network, validation, or disk failures as false duplicates.
 */
export function isDuplicateKeyError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const anyErr = err as Record<string, unknown>

  if (anyErr.code === 11000) return true
  if (typeof anyErr.message === 'string' && anyErr.message.includes('E11000')) return true
  if (anyErr.name === 'DuplicateKeyError' || anyErr.name === 'MongoServerError') {
    if (anyErr.code === 11000) return true
  }

  // Payload CMS db-mongodb transforms MongoDB E11000 into ValidationError for unique fields
  if (anyErr.name === 'ValidationError') {
    const data = anyErr.data as Record<string, unknown> | undefined
    if (data?.errors && Array.isArray(data.errors)) {
      const isUniqueError = data.errors.some(
        (e: any) =>
          (e?.path === 'deliveryKey' || e?.field === 'deliveryKey') &&
          (typeof e?.message === 'string' && e.message.toLowerCase().includes('unique')),
      )
      if (isUniqueError) return true
    }
  }

  // Nested error check in Payload validation/operation errors
  if (Array.isArray(anyErr.data)) {
    return anyErr.data.some(
      (item: Record<string, unknown>) =>
        item?.code === 11000 ||
        (typeof item?.message === 'string' && item.message.includes('E11000')),
    )
  }

  return false
}

/**
 * Normalizes entity IDs across raw MongoDB ObjectIds, populated objects, and strings.
 * Critical: In BSON/Mongoose, `objectId.id` is a binary Buffer, so accessing `.id` directly
 * produces malformed strings. This helper safely returns the 24-character hexadecimal string.
 */
export function extractEntityId(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  if (typeof val === 'object') {
    // If it is a BSON ObjectId (has .toHexString)
    if (typeof (val as any).toHexString === 'function') {
      return (val as any).toHexString()
    }
    // If it has _id
    if ((val as any)._id) {
      const inner = (val as any)._id
      return typeof inner === 'object' && typeof inner?.toHexString === 'function'
        ? inner.toHexString()
        : String(inner)
    }
    // If it is a populated object with a string/number id
    if (typeof (val as any).id === 'string' || typeof (val as any).id === 'number') {
      return String((val as any).id)
    }
    return String(val)
  }
  return String(val)
}

/**
 * Derives broadcast totals and execution status directly from persisted recipient delivery states,
 * avoiding drifted counts from concurrent or retried worker attempts.
 */
export async function updateBroadcastDerivedStats(
  payload: Payload,
  broadcastId: string | number,
): Promise<{
  totalRecipients: number
  sentCount: number
  failedCount: number
  skippedCount: number
  pendingCount: number
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed'
}> {
  const normalizedBroadcastId = extractEntityId(broadcastId)
  const [totalRecipients, sentCount, failedCount, skippedCount, pendingCount] =
    await Promise.all([
      payload.count({
        collection: 'newsletter-deliveries',
        where: { broadcast: { equals: normalizedBroadcastId } },
        overrideAccess: true,
      }),
      payload.count({
        collection: 'newsletter-deliveries',
        where: {
          and: [
            { broadcast: { equals: normalizedBroadcastId } },
            { status: { equals: 'sent' } },
          ],
        },
        overrideAccess: true,
      }),
      payload.count({
        collection: 'newsletter-deliveries',
        where: {
          and: [
            { broadcast: { equals: normalizedBroadcastId } },
            { status: { equals: 'failed' } },
          ],
        },
        overrideAccess: true,
      }),
      payload.count({
        collection: 'newsletter-deliveries',
        where: {
          and: [
            { broadcast: { equals: normalizedBroadcastId } },
            { status: { equals: 'skipped' } },
          ],
        },
        overrideAccess: true,
      }),
      payload.count({
        collection: 'newsletter-deliveries',
        where: {
          and: [
            { broadcast: { equals: normalizedBroadcastId } },
            { status: { in: ['pending', 'sending'] } },
          ],
        },
        overrideAccess: true,
      }),
    ])

  const total = totalRecipients.totalDocs
  const sent = sentCount.totalDocs
  const failed = failedCount.totalDocs
  const skipped = skippedCount.totalDocs
  const pending = pendingCount.totalDocs

  let status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed' = 'processing'

  if (pending > 0) {
    status = 'processing'
  } else if (total === 0) {
    status = 'completed'
  } else if (failed === 0) {
    status = 'completed'
  } else if (sent > 0) {
    status = 'partial'
  } else {
    status = 'failed'
  }

  try {
    await payload.update({
      collection: 'newsletter-broadcasts',
      id: normalizedBroadcastId,
      data: {
        totalRecipients: total,
        sentCount: sent,
        failedCount: failed,
        skippedCount: skipped,
        status,
        completedAt: status !== 'processing' ? new Date().toISOString() : undefined,
      },
      overrideAccess: true,
    })
  } catch {
    // If broadcast was deleted concurrently, skip
  }

  return {
    totalRecipients: total,
    sentCount: sent,
    failedCount: failed,
    skippedCount: skipped,
    pendingCount: pending,
    status,
  }
}

/**
 * Enqueues newsletter deliveries when an article is published for the first time.
 *
 * Resumable Fanout Guarantees:
 * - Does NOT swallow arbitrary failures as duplicates; checks only genuine E11000 errors.
 * - Supports resuming partial fanout lists if interrupted.
 * - Does NOT stamp article.newsletterPublishedAt here; callers must stamp ONLY after
 *   this function succeeds to avoid permanently suppressing retries.
 */
export async function enqueueArticleNewsletter(
  payload: Payload,
  articleId: string | number,
): Promise<{ broadcastId: string | number; enqueuedCount: number }> {
  const normalizedArticleId = String(articleId)

  // 1. Check if broadcast record already exists
  const existingBroadcast = await payload.find({
    collection: 'newsletter-broadcasts',
    where: {
      article: { equals: normalizedArticleId },
    },
    limit: 1,
    overrideAccess: true,
  })

  let broadcast = existingBroadcast.docs[0]

  // If broadcast exists and fanout was already completed, return immediately
  if (broadcast && broadcast.fanoutStatus === 'completed') {
    return {
      broadcastId: broadcast.id,
      enqueuedCount: 0,
    }
  }

  // Create broadcast if missing
  if (!broadcast) {
    const now = new Date().toISOString()
    broadcast = await payload.create({
      collection: 'newsletter-broadcasts',
      data: {
        article: normalizedArticleId,
        status: 'pending',
        fanoutStatus: 'in_progress',
        totalRecipients: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        enqueuedAt: now,
      },
      overrideAccess: true,
    })
  }

  // 2. Fetch all confirmed, active subscribers
  const subscribers = await payload.find({
    collection: 'subscribers',
    where: {
      status: { equals: 'subscribed' },
    },
    pagination: false,
    overrideAccess: true,
  })

  let enqueuedCount = 0

  // 3. Resumable fanout: create delivery rows, catching ONLY true duplicate-key collisions
  // Process in concurrent chunks of 25 for high throughput while remaining bounded
  const FANOUT_CHUNK_SIZE = 25
  for (let i = 0; i < subscribers.docs.length; i += FANOUT_CHUNK_SIZE) {
    const chunk = subscribers.docs.slice(i, i + FANOUT_CHUNK_SIZE)
    await Promise.all(
      chunk.map(async (subscriber) => {
        const subscriberId = extractEntityId(subscriber.id)
        const deliveryKey = `${normalizedArticleId}_${subscriberId}`

        // Ensure subscriber has valid unsubscribeTokenHash derived from secret
        if (!subscriber.unsubscribeTokenHash) {
          const derivedToken = getSubscriberUnsubscribeToken({
            id: subscriber.id,
            email: subscriber.email,
            createdAt: subscriber.createdAt,
          })
          const tokenHash = hashToken(derivedToken)
          await payload.update({
            collection: 'subscribers',
            id: subscriber.id,
            data: {
              unsubscribeTokenHash: tokenHash,
              tokenVersion: 2,
            },
            overrideAccess: true,
          })
        }

        try {
          await payload.create({
            collection: 'newsletter-deliveries',
            data: {
              broadcast: broadcast.id,
              article: normalizedArticleId,
              subscriber: subscriber.id,
              recipientEmail: subscriber.email,
              deliveryKey,
              status: 'pending',
              attempts: 0,
              locale: (subscriber.locale as 'en' | 'am') || 'en',
            },
            overrideAccess: true,
          })
          enqueuedCount++
        } catch (err: unknown) {
          if (isDuplicateKeyError(err)) {
            // Legitimate duplicate row from an earlier partial fanout pass; safe to skip
            return
          }

          // DO NOT swallow unexpected database/validation failures!
          console.error(`[Newsletter Fanout Error] Recipient row creation failed for ${deliveryKey}:`, err)
          throw err
        }
      }),
    )
  }

  // 4. Mark fanout as completed
  await payload.update({
    collection: 'newsletter-broadcasts',
    id: broadcast.id,
    data: {
      fanoutStatus: 'completed',
      fanoutCompletedAt: new Date().toISOString(),
      status: 'processing',
    },
    overrideAccess: true,
  })

  // Derive initial stats
  await updateBroadcastDerivedStats(payload, broadcast.id)

  return { broadcastId: broadcast.id, enqueuedCount }
}

/**
 * Atomically claims the next pending, retryable, or stale-lease delivery.
 *
 * Concurrency & Recovery Guarantees:
 * - Uses atomic findOneAndUpdate compare-and-swap so multiple workers NEVER claim the same delivery.
 * - Stale deliveries whose leases have expired (e.g. from process crash or unhandled termination)
 *   are automatically recovered and reclaimed.
 */
export async function claimNextDelivery(
  payload: Payload,
  broadcastId: string | number,
  workerId: string,
  leaseDurationMs = 5 * 60 * 1000,
  maxRetries = 3,
): Promise<any | null> {
  const model = (payload.db as any).collections?.['newsletter-deliveries']
  const now = new Date()
  const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs)

  if (model?.findOneAndUpdate) {
    const filter = {
      broadcast: broadcastId,
      $or: [
        { status: 'pending' },
        {
          status: 'failed',
          attempts: { $lt: maxRetries },
          workerId: { $ne: workerId }, // Prevents immediate spin-retry on the same worker tick
        },
        {
          status: 'sending',
          leaseExpiresAt: { $lt: now }, // Stale lease recovery
        },
      ],
    }

    const update = {
      $set: {
        status: 'sending',
        workerId,
        leaseClaimedAt: now,
        leaseExpiresAt,
      },
      $inc: {
        attempts: 1,
      },
    }

    const doc = await model.findOneAndUpdate(filter, update, {
      returnDocument: 'after',
      sort: { createdAt: 1 },
    })

    if (!doc) return null
    const obj = doc.toObject ? doc.toObject() : doc
    return {
      ...obj,
      id: doc.id ? String(doc.id) : extractEntityId(doc._id),
      _id: extractEntityId(doc._id),
      subscriber: extractEntityId(doc.subscriber),
      broadcast: extractEntityId(doc.broadcast),
      article: extractEntityId(doc.article),
    }
  }

  // Fallback using Payload query + update if direct mongoose model is unavailable
  const pending = await payload.find({
    collection: 'newsletter-deliveries',
    where: {
      and: [
        { broadcast: { equals: broadcastId } },
        {
          or: [
            { status: { equals: 'pending' } },
            {
              and: [
                { status: { equals: 'failed' } },
                { attempts: { less_than: maxRetries } },
                { workerId: { not_equals: workerId } },
              ],
            },
            {
              and: [
                { status: { equals: 'sending' } },
                { leaseExpiresAt: { less_than: now.toISOString() } },
              ],
            },
          ],
        },
      ],
    },
    limit: 1,
    sort: 'createdAt',
    overrideAccess: true,
  })

  if (pending.docs.length === 0) return null
  const target = pending.docs[0]

  try {
    const updated = await payload.update({
      collection: 'newsletter-deliveries',
      id: target.id,
      data: {
        status: 'sending',
        workerId,
        leaseClaimedAt: now.toISOString(),
        leaseExpiresAt: leaseExpiresAt.toISOString(),
        attempts: (target.attempts || 0) + 1,
      },
      overrideAccess: true,
    })
    return {
      ...updated,
      id: extractEntityId(updated.id),
      subscriber: extractEntityId(updated.subscriber),
      broadcast: extractEntityId(updated.broadcast),
      article: extractEntityId(updated.article),
    }
  } catch {
    return null
  }
}

/**
 * Processes queued deliveries for a broadcast using atomic claims and expiring leases.
 *
 * Operational and Reliability Guarantees:
 * - Bounded concurrency and rate limiting prevent Gmail account throttling.
 * - Subscribed status is re-checked immediately before transmission (unsubscribed users are skipped).
 * - Persisted recipient states are updated immediately after transmission.
 * - Unavoidable SMTP Acceptance Duplicate Window:
 *   If the process crashes or network drops in the millisecond window AFTER the SMTP server
 *   responds with 250 OK but BEFORE the database writes status: 'sent', lease recovery will
 *   safely re-transmit the delivery upon restart. This at-least-once delivery window is
 *   unavoidable under standard SMTP without distributed two-phase commit.
 */
export async function processNewsletterBroadcast(
  payload: Payload,
  broadcastId: string | number,
  options: DispatchOptions = {},
): Promise<{
  sent: number
  failed: number
  skipped: number
}> {
  const { batchSize, interBatchDelayMs, maxRetries, leaseDurationMs } = {
    ...DEFAULT_OPTIONS,
    ...options,
  }

  const workerId = options.workerId || `worker_${process.pid}_${crypto.randomUUID()}`

  const broadcast = await payload.findByID({
    collection: 'newsletter-broadcasts',
    id: broadcastId,
    overrideAccess: true,
  })

  if (!broadcast) {
    throw new Error(`[Newsletter Worker] Broadcast ${broadcastId} not found`)
  }

  const articleId =
    typeof broadcast.article === 'object' && broadcast.article !== null
      ? (broadcast.article as { id: string | number }).id
      : broadcast.article

  // Fetch article with all localized translations
  const [articleEn, articleAm] = await Promise.all([
    payload.findByID({
      collection: 'articles',
      id: String(articleId),
      locale: 'en',
      overrideAccess: true,
    }),
    payload.findByID({
      collection: 'articles',
      id: String(articleId),
      locale: 'am',
      overrideAccess: true,
    }),
  ])

  if (!articleEn) {
    throw new Error(`[Newsletter Worker] Article ${articleId} not found`)
  }

  const siteUrl = getSiteUrl()

  let totalSent = 0
  let totalFailed = 0
  let totalSkipped = 0

  while (true) {
    // Atomically claim the next available delivery row
    const delivery = await claimNextDelivery(
      payload,
      broadcastId,
      workerId,
      leaseDurationMs,
      maxRetries,
    )

    if (!delivery) {
      // No more claimable deliveries
      break
    }

    const deliveryId = extractEntityId(delivery.id || delivery._id)
    const subscriberId = extractEntityId(delivery.subscriber)

    // 1. Re-verify subscriber status before dispatch
    let subscriber: any = null
    try {
      subscriber = await payload.findByID({
        collection: 'subscribers',
        id: subscriberId,
        overrideAccess: true,
      })
    } catch {
      subscriber = null
    }

    if (!subscriber || subscriber.status !== 'subscribed') {
      await payload.update({
        collection: 'newsletter-deliveries',
        id: deliveryId,
        data: {
          status: 'skipped',
          leaseExpiresAt: null,
          lastError: 'Subscriber no longer active (unsubscribed, unconfirmed, or deleted).',
        },
        overrideAccess: true,
      })
      totalSkipped++
      continue
    }

    // 2. Select appropriate locale with fallback
    const prefLocale = (subscriber.locale as 'en' | 'am') || 'en'
    const activeArticleDoc = prefLocale === 'am' && articleAm?.title ? articleAm : articleEn
    const actualLocale = prefLocale === 'am' && articleAm?.title ? 'am' : 'en'

    const title = activeArticleDoc.title || articleEn.title || 'Ethiopia Travel Journal Story'
    const excerpt =
      activeArticleDoc.excerpt ||
      (activeArticleDoc.meta as { metaDescription?: string } | undefined)?.metaDescription ||
      articleEn.excerpt ||
      ''

    const slug = activeArticleDoc.slug || articleEn.slug
    const articleUrl = `${siteUrl}/articles/${slug}?locale=${actualLocale}`

    // Resolve hero image absolute URL
    let heroImageUrl: string | undefined
    let heroImageAlt: string | undefined
    const heroMedia = activeArticleDoc.heroImage || articleEn.heroImage
    if (heroMedia && typeof heroMedia === 'object') {
      const mediaObj = heroMedia as { url?: string; alt?: string }
      if (mediaObj.url) {
        heroImageUrl = mediaObj.url.startsWith('http')
          ? mediaObj.url
          : `${siteUrl}${mediaObj.url}`
        heroImageAlt = mediaObj.alt || title
      }
    }

    // Resolve author
    let authorName: string | undefined
    const authorRel = activeArticleDoc.author || articleEn.author
    if (authorRel && typeof authorRel === 'object') {
      const authorObj = authorRel as { displayName?: string; name?: string }
      authorName = authorObj.displayName || authorObj.name
    }

    const publishedDate = activeArticleDoc.publishedDate
      ? new Date(activeArticleDoc.publishedDate).toLocaleDateString(
          actualLocale === 'am' ? 'am-ET' : 'en-US',
          { year: 'numeric', month: 'long', day: 'numeric' },
        )
      : undefined

    const readingTimeMinutes =
      typeof activeArticleDoc.readingTimeMinutes === 'number'
        ? activeArticleDoc.readingTimeMinutes
        : undefined

    // 3. Derive secure unsubscribe token for email links
    const rawUnsubscribeToken = getSubscriberUnsubscribeToken({
      id: subscriber.id,
      email: subscriber.email,
      createdAt: subscriber.createdAt,
    })

    const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${rawUnsubscribeToken}&locale=${actualLocale}`
    const oneClickUrl = `${siteUrl}/api/newsletter/unsubscribe?token=${rawUnsubscribeToken}`

    const emailContent = buildArticlePublishedEmail({
      title,
      excerpt,
      articleUrl,
      heroImageUrl,
      heroImageAlt,
      authorName,
      publishedDate,
      readingTimeMinutes,
      unsubscribeUrl,
      locale: actualLocale,
    })

    // 4. Send email via payload.sendEmail
    try {
      await payload.sendEmail({
        to: subscriber.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        headers: {
          'List-Unsubscribe': `<${oneClickUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })

      await payload.update({
        collection: 'newsletter-deliveries',
        id: deliveryId,
        data: {
          status: 'sent',
          sentAt: new Date().toISOString(),
          leaseExpiresAt: null,
          lastError: null,
          locale: actualLocale,
        },
        overrideAccess: true,
      })
      totalSent++
    } catch (sendError: unknown) {
      const errorMessage =
        sendError instanceof Error ? sendError.message : String(sendError)
      console.error(`[Newsletter Send Error] ${subscriber.email}:`, errorMessage)

      await payload.update({
        collection: 'newsletter-deliveries',
        id: deliveryId,
        data: {
          status: 'failed',
          workerId,
          leaseExpiresAt: null,
          lastError: errorMessage,
        },
        overrideAccess: true,
      })
      totalFailed++
    }

    // Inter-delivery throttle to respect SMTP rate limits
    if (interBatchDelayMs > 0) {
      await delay(interBatchDelayMs)
    }
  }

  // 5. Update derived broadcast statistics from actual persisted delivery states
  await updateBroadcastDerivedStats(payload, broadcastId)

  return { sent: totalSent, failed: totalFailed, skipped: totalSkipped }
}

/**
 * Durable recovery worker:
 * Recovers and resumes existing unfinished broadcasts ('pending' or 'processing').
 *
 * Crucial Safeguards:
 * - Does NOT backfill historical articles without approval.
 * - Recovers partial fanout lists before processing deliveries.
 * - Recovers stale expired leases from previous crashed workers.
 */
export async function recoverUnfinishedBroadcasts(
  payload: Payload,
  options: DispatchOptions = {},
): Promise<number> {
  const unfinishedBroadcasts = await payload.find({
    collection: 'newsletter-broadcasts',
    where: {
      status: { in: ['pending', 'processing'] },
    },
    pagination: false,
    overrideAccess: true,
  })

  let recoveredCount = 0

  for (const broadcast of unfinishedBroadcasts.docs) {
    try {
      // Resume fanout if incomplete
      if (broadcast.fanoutStatus !== 'completed') {
        const articleId =
          typeof broadcast.article === 'object' && broadcast.article !== null
            ? (broadcast.article as { id: string | number }).id
            : broadcast.article
        await enqueueArticleNewsletter(payload, articleId)
      }

      // Resume processing deliveries
      await processNewsletterBroadcast(payload, broadcast.id, options)
      recoveredCount++
    } catch (err) {
      console.error(`[Newsletter Recovery Error] Failed recovering broadcast ${broadcast.id}:`, err)
    }
  }

  return recoveredCount
}
