import type { CollectionAfterChangeHook } from 'payload'
import {
  enqueueArticleNewsletter,
  processNewsletterBroadcast,
} from '../lib/newsletter/queue'

/**
 * Collection hook for Articles:
 * Sends automated newsletter emails when an article is published for the FIRST time.
 *
 * Rules strictly enforced:
 * - Draft saves must not send.
 * - Published edits must not automatically resend.
 * - Unpublish/republish must not accidentally duplicate delivery.
 * - Scheduled publication must follow the same rules.
 * - Asynchronous processing: does NOT block the article save request.
 */
export const afterArticleChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  context,
}) => {
  // 0. Respect explicit suppression context (e.g. historical data migration, test fixtures)
  if (context?.disableNewsletter || (req as any)?.context?.disableNewsletter) {
    return doc
  }

  // 1. Only proceed if the current document is published
  if (doc._status !== 'published') {
    return doc
  }

  // 2. Prevent resending on edits: If previousDoc was already published, skip
  if (previousDoc?._status === 'published') {
    return doc
  }

  // 3. Prevent resending on unpublish/republish: If newsletterPublishedAt is already set, skip
  if (doc.newsletterPublishedAt) {
    return doc
  }

  try {
    // 4. Double check if a broadcast already exists for this article in the database
    const existingBroadcast = await req.payload.find({
      collection: 'newsletter-broadcasts',
      where: {
        article: { equals: doc.id },
      },
      limit: 1,
      overrideAccess: true,
    })

    if (existingBroadcast.totalDocs > 0) {
      return doc
    }

    // 5. Enqueue delivery records and complete fanout FIRST.
    // We do NOT stamp the article before enqueue succeeds so that any transient
    // error does not permanently suppress retries.
    const { broadcastId, enqueuedCount } = await enqueueArticleNewsletter(
      req.payload,
      doc.id,
    )

    // 6. ONLY stamp newsletterPublishedAt AFTER fanout succeeds.
    const now = new Date().toISOString()
    await req.payload.update({
      collection: 'articles',
      id: doc.id,
      data: {
        newsletterPublishedAt: now,
      },
      overrideAccess: true,
    })

    // 7. Dispatch background processing without blocking save response.
    // Durable recovery (recoverUnfinishedBroadcasts) also picks up any interrupted broadcasts.
    if (enqueuedCount > 0) {
      queueMicrotask(() => {
        void processNewsletterBroadcast(req.payload, broadcastId).catch((err) => {
          console.error(
            `[Newsletter Worker Error] Failed processing broadcast ${broadcastId}:`,
            err,
          )
        })
      })
    }
  } catch (error: unknown) {
    console.error(
      `[Newsletter Hook Error] Error enqueuing newsletter for article ${doc.id}:`,
      error,
    )
  }

  return doc
}
