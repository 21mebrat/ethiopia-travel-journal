import type { PayloadHandler, Where } from 'payload'
import { isTokenExpired, verifyTokenHash } from '../lib/email/tokens'

export const newsletterConfirmHandler: PayloadHandler = async (req) => {
  try {
    let token: string | undefined
    let email: string | undefined

    if (req.method === 'POST') {
      try {
        const body = (await req.json?.()) || {}
        token = typeof body.token === 'string' ? body.token.trim() : undefined
        email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined
      } catch {
        // Fall back to query parameters
      }
    }

    // Also support query parameters for both GET and POST requests
    const url = new URL(req.url || '/', 'http://localhost')
    if (!token) token = url.searchParams.get('token') || undefined
    if (!email) email = url.searchParams.get('email')?.toLowerCase() || undefined
    const localeParam = url.searchParams.get('locale') || undefined

    if (!token) {
      return Response.json(
        {
          success: false,
          error: 'Verification token is required.',
        },
        { status: 400 },
      )
    }

    // Find candidate subscribers
    // If email is provided, query directly by email; otherwise query recent pending tokens
    const query: Where = email
      ? { email: { equals: email } }
      : { status: { equals: 'pending' } }

    const candidateSubscribers = await req.payload.find({
      collection: 'subscribers',
      where: query,
      limit: 50,
      overrideAccess: true,
    })

    let matchedSubscriber = null

    for (const sub of candidateSubscribers.docs) {
      if (
        sub.confirmationTokenHash &&
        verifyTokenHash(token, sub.confirmationTokenHash)
      ) {
        matchedSubscriber = sub
        break
      }
    }

    if (!matchedSubscriber) {
      return Response.json(
        {
          success: false,
          error:
            'Invalid or expired confirmation link. Please submit your email again to receive a fresh verification link.',
        },
        { status: 400 },
      )
    }

    // Check expiration
    if (isTokenExpired(matchedSubscriber.confirmationExpiresAt)) {
      return Response.json(
        {
          success: false,
          expired: true,
          error:
            'This confirmation link has expired (links are valid for 48 hours). Please request a new verification email.',
        },
        { status: 410 },
      )
    }

    // Activate subscriber and invalidate single-use confirmation token
    const effectiveLocale = localeParam === 'am' ? 'am' : localeParam === 'en' ? 'en' : matchedSubscriber.locale
    await req.payload.update({
      collection: 'subscribers',
      id: matchedSubscriber.id,
      data: {
        status: 'subscribed',
        locale: effectiveLocale,
        confirmationTokenHash: null,
        confirmationExpiresAt: null,
      },
      overrideAccess: true,
    })

    const isAmharic = effectiveLocale === 'am'

    return Response.json(
      {
        success: true,
        message: isAmharic
          ? 'ምዝገባዎ በተሳካ ሁኔታ ተረጋግጧል! ወደ ኢትዮጵያ ጉዞ ማስታወሻ እንኳን በደህና መጡ።'
          : 'Your subscription has been confirmed! Welcome to Ethiopia Travel Journal.',
      },
      { status: 200 },
    )
  } catch (error: unknown) {
    console.error('[Newsletter Confirm Error]', error)
    return Response.json(
      {
        success: false,
        error: 'An unexpected error occurred while confirming your subscription.',
      },
      { status: 500 },
    )
  }
}
