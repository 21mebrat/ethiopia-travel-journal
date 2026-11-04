import type { PayloadHandler } from 'payload'
import { getSiteUrl, isEmailConfigured } from '../lib/email/adapter'
import { buildConfirmSubscriptionEmail } from '../lib/email/templates/confirmSubscription'
import {
  generateSecureToken,
  getConfirmationExpiration,
  hashToken,
} from '../lib/email/tokens'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Simple in-memory rate limiting map (IP / normalized email -> timestamp array)
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5
const rateLimitMap = new Map<string, number[]>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(key) || []
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    return true
  }
  recent.push(now)
  rateLimitMap.set(key, recent)
  return false
}

export const newsletterSubscribeHandler: PayloadHandler = async (req) => {
  try {
    let body: {
      email?: unknown
      locale?: unknown
      source?: unknown
      honeypot?: unknown
    }

    try {
      body = (await req.json?.()) || {}
    } catch {
      return Response.json(
        { success: false, error: 'Invalid JSON payload in request body' },
        { status: 400 },
      )
    }

    const { email, locale = 'en', source = 'stories_widget', honeypot } = body || {}

    // 1. Bot Honeypot Check: Hidden field that real users do not fill
    if (honeypot && typeof honeypot === 'string' && honeypot.trim() !== '') {
      // Silently accept bot submissions without processing
      return Response.json({ success: true, message: 'Subscription received.' }, { status: 200 })
    }

    const validLocale = locale === 'am' ? 'am' : 'en'

    // 2. Validate Email
    if (!email || typeof email !== 'string') {
      return Response.json(
        {
          success: false,
          error:
            validLocale === 'am'
              ? 'እባክዎ ትክክለኛ የኢሜይል አድራሻ ያስገቡ።'
              : 'Please provide a valid email address.',
        },
        { status: 400 },
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (!EMAIL_REGEX.test(normalizedEmail) || normalizedEmail.length > 254) {
      return Response.json(
        {
          success: false,
          error:
            validLocale === 'am'
              ? 'የተሳሳተ የኢሜይል ቅርጸት። እባክዎ እንደገና ይሞክሩ።'
              : 'Please provide a valid email address.',
        },
        { status: 400 },
      )
    }

    // 3. Abuse Prevention: Rate Limiting
    if (isRateLimited(normalizedEmail)) {
      return Response.json(
        {
          success: false,
          error:
            validLocale === 'am'
              ? 'በጣም ብዙ ጥያቄዎች ተልከዋል። እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።'
              : 'Too many requests. Please wait a moment before trying again.',
        },
        { status: 429 },
      )
    }

    // 4. Verify SMTP Credentials: Must fail clearly rather than silently simulate success
    if (!isEmailConfigured()) {
      console.error('[Newsletter] Missing SMTP credentials (MAIL_FROM, MAIL_PASS).')
      return Response.json(
        {
          success: false,
          error:
            validLocale === 'am'
              ? 'የኢሜይል አገልግሎቱ በጊዜያዊነት አልተዋቀረም። እባክዎ ቆይተው ይሞክሩ።'
              : 'The email service is currently unavailable. Please check back later.',
        },
        { status: 503 },
      )
    }

    const normalizedSource =
      typeof source === 'string' && source.trim() ? source.trim() : 'stories_widget'

    // 5. Generate secure cryptographic tokens
    const rawConfirmationToken = generateSecureToken()
    const confirmationTokenHash = hashToken(rawConfirmationToken)
    const confirmationExpiresAt = getConfirmationExpiration(48).toISOString()

    const rawUnsubscribeToken = generateSecureToken()
    const unsubscribeTokenHash = hashToken(rawUnsubscribeToken)

    const siteUrl = getSiteUrl()
    const confirmationUrl = `${siteUrl}/newsletter/confirm?token=${rawConfirmationToken}&email=${encodeURIComponent(
      normalizedEmail,
    )}&locale=${validLocale}`

    const emailContent = buildConfirmSubscriptionEmail({
      confirmationUrl,
      locale: validLocale,
      expiresInHours: 48,
    })

    const uniformSuccessMessage =
      validLocale === 'am'
        ? 'የማረጋገጫ መልእክት ወደ ኢሜይልዎ ተልኳል! እባክዎ ኢሜይልዎን ከፍተው ምዝገባዎን ያረጋግጡ።'
        : 'A confirmation email has been sent. Please check your inbox and click the verification link to activate your subscription.'

    // 6. Race-safe DB check and update/creation
    const existing = await req.payload.find({
      collection: 'subscribers',
      where: {
        email: { equals: normalizedEmail },
      },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.totalDocs > 0) {
      const subscriber = existing.docs[0]

      if (subscriber.status === 'subscribed') {
        // Privacy-preserving: Uniform response without revealing existing subscription status
        return Response.json(
          {
            success: true,
            message: uniformSuccessMessage,
          },
          { status: 200 },
        )
      }

      // If pending or previously unsubscribed, update with new confirmation token
      await req.payload.update({
        collection: 'subscribers',
        id: subscriber.id,
        data: {
          status: 'pending',
          locale: validLocale,
          source: normalizedSource,
          confirmationTokenHash,
          confirmationExpiresAt,
          unsubscribeTokenHash: subscriber.unsubscribeTokenHash || unsubscribeTokenHash,
          tokenVersion: 2,
        },
        overrideAccess: true,
      })
    } else {
      // Create new pending subscriber record
      await req.payload.create({
        collection: 'subscribers',
        data: {
          email: normalizedEmail,
          status: 'pending',
          locale: validLocale,
          source: normalizedSource,
          confirmationTokenHash,
          confirmationExpiresAt,
          unsubscribeTokenHash,
          tokenVersion: 2,
        },
        overrideAccess: true,
      })
    }

    // 7. Send confirmation email
    await req.payload.sendEmail({
      to: normalizedEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    return Response.json(
      {
        success: true,
        message: uniformSuccessMessage,
      },
      { status: 200 },
    )
  } catch (error: unknown) {
    console.error('[Newsletter Subscribe Error]', error)
    return Response.json(
      {
        success: false,
        error:
          'An unexpected error occurred while processing your subscription. Please try again later.',
      },
      { status: 500 },
    )
  }
}

export const newsletterGetHandler: PayloadHandler = async () => {
  return Response.json({
    status: 'ok',
    service: 'Ethiopia Travel Journal Newsletter API',
  })
}
