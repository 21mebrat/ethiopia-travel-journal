import type { PayloadHandler } from 'payload'
import { getSiteUrl } from '../lib/email/adapter'
import { buildUnsubscribeConfirmationEmail } from '../lib/email/templates/unsubscribeConfirmation'
import { hashToken, isValidTokenFormat } from '../lib/email/tokens'

/**
 * Unsubscribe POST Handler:
 * - Performs indexed secure-token lookup using deterministic SHA-256 hash.
 * - Never authenticates using raw subscriber IDs.
 * - Never accepts raw stored hashes as bearer tokens.
 * - Safe for unlimited subscriber count (no 100-document limit or full table scan).
 * - Supports RFC 8058 One-Click Unsubscribe (POST with List-Unsubscribe=One-Click).
 */
export const newsletterUnsubscribePostHandler: PayloadHandler = async (req) => {
  try {
    let token: string | undefined

    // 1. Try reading token from JSON body
    try {
      const body = (await req.json?.()) || {}
      token = typeof body.token === 'string' ? body.token.trim() : undefined
    } catch {
      // Body may be urlencoded or query parameter
    }

    // 2. Try reading from query parameters if not in JSON body
    if (!token) {
      const url = new URL(req.url || '/', 'http://localhost')
      token = url.searchParams.get('token') || undefined
    }

    // 3. Security: Require valid cryptographic token format
    // Rejects raw subscriber IDs and malformed inputs
    if (!token || !isValidTokenFormat(token)) {
      return Response.json(
        {
          success: false,
          error: 'A valid cryptographic unsubscribe token is required.',
        },
        { status: 400 },
      )
    }

    // 4. Indexed O(1) secure lookup using SHA-256 hash
    const tokenHash = hashToken(token)

    const subscriberResults = await req.payload.find({
      collection: 'subscribers',
      where: {
        unsubscribeTokenHash: { equals: tokenHash },
      },
      limit: 1,
      overrideAccess: true,
    })

    if (subscriberResults.totalDocs === 0) {
      // Idempotent & privacy-preserving: don't reveal internal state, but don't fail valid intentions
      return Response.json(
        {
          success: true,
          message: 'You have been unsubscribed from the newsletter.',
        },
        { status: 200 },
      )
    }

    const matchedSubscriber = subscriberResults.docs[0]

    // 5. If already unsubscribed, return idempotent success without mutating
    if (matchedSubscriber.status === 'unsubscribed') {
      return Response.json(
        {
          success: true,
          message:
            matchedSubscriber.locale === 'am'
              ? 'አስቀድመው ከዝርዝሩ ወጥተዋል።'
              : 'You are already unsubscribed from the newsletter.',
        },
        { status: 200 },
      )
    }

    // 6. Update subscriber status to unsubscribed
    await req.payload.update({
      collection: 'subscribers',
      id: matchedSubscriber.id,
      data: {
        status: 'unsubscribed',
      },
      overrideAccess: true,
    })

    // 7. Optionally dispatch unsubscribe confirmation email
    try {
      const siteUrl = getSiteUrl()
      const isAmharic = matchedSubscriber.locale === 'am'
      const confirmationEmail = buildUnsubscribeConfirmationEmail({
        resubscribeUrl: `${siteUrl}/stories?locale=${isAmharic ? 'am' : 'en'}`,
        locale: isAmharic ? 'am' : 'en',
      })

      await req.payload.sendEmail({
        to: matchedSubscriber.email,
        subject: confirmationEmail.subject,
        html: confirmationEmail.html,
        text: confirmationEmail.text,
      })
    } catch (emailErr) {
      console.warn('[Unsubscribe] Confirmation email notice skipped or failed:', emailErr)
    }

    return Response.json(
      {
        success: true,
        message:
          matchedSubscriber.locale === 'am'
            ? 'ከዜና መጽሔታችን በተሳካ ሁኔታ ተሰርዘዋል።'
            : 'You have been successfully unsubscribed from Ethiopia Travel Journal.',
      },
      { status: 200 },
    )
  } catch (error: unknown) {
    console.error('[Newsletter Unsubscribe Error]', error)
    return Response.json(
      {
        success: false,
        error: 'An unexpected error occurred while processing your unsubscribe request.',
      },
      { status: 500 },
    )
  }
}

/**
 * GET Handler for unsubscribe:
 * Strictly non-mutating! Redirects to frontend confirmation page to prevent
 * automated enterprise mail-scanner / anti-spam crawler link clicks from opt-outing users.
 */
export const newsletterUnsubscribeGetHandler: PayloadHandler = async (req) => {
  const url = new URL(req.url || '/', 'http://localhost')
  const token = url.searchParams.get('token') || ''
  const locale = url.searchParams.get('locale') || 'en'
  const siteUrl = getSiteUrl()

  const safeLocale = locale === 'am' ? 'am' : 'en'

  // Non-mutating redirect to frontend confirmation UI preserving locale
  return Response.redirect(
    `${siteUrl}/newsletter/unsubscribe?token=${encodeURIComponent(token)}&locale=${safeLocale}`,
    303,
  )
}
