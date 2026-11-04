import crypto from 'crypto'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest'
import { newsletterSubscribeHandler } from '@/endpoints/newsletterSubscribe'
import { newsletterConfirmHandler } from '@/endpoints/newsletterConfirm'
import { newsletterUnsubscribePostHandler } from '@/endpoints/newsletterUnsubscribe'
import {
  clearCapturedEmails,
  getCapturedEmails,
} from '@/lib/email/adapter'
import {
  generateSecureToken,
  hashToken,
  getConfirmationExpiration,
} from '@/lib/email/tokens'

let payload: Payload
const runId = crypto.randomUUID().slice(0, 8)
const createdSubscriberIds: Array<string | number> = []

function createMockReq(options: {
  method?: string
  url?: string
  body?: any
  headers?: Record<string, string>
}) {
  const headers = new Headers(options.headers || {})
  return {
    method: options.method || 'POST',
    url: options.url || 'http://localhost:3000/api/newsletter',
    headers,
    payload,
    json: async () => options.body || {},
  } as any
}

describe('Integration: Newsletter API Handlers', () => {
  beforeAll(async () => {
    ;(process.env as any).NODE_ENV = 'test'
    process.env.ENABLE_TEST_EMAIL_CAPTURE = 'true'
    payload = await getPayload({ config: await config })
  })

  beforeEach(() => {
    clearCapturedEmails()
  })

  afterAll(async () => {
    clearCapturedEmails()
    if (createdSubscriberIds.length > 0) {
      await payload.delete({
        collection: 'subscribers',
        where: { id: { in: createdSubscriberIds } },
        overrideAccess: true,
      })
    }
  })

  describe('newsletterSubscribeHandler (POST /api/newsletter/subscribe)', () => {
    it('rejects invalid or missing email input', async () => {
      // Missing email
      const reqEmpty = createMockReq({
        url: 'http://localhost:3000/api/newsletter/subscribe',
        body: {},
      })
      const resEmpty = await newsletterSubscribeHandler(reqEmpty)
      expect(resEmpty.status).toBe(400)
      const dataEmpty = await resEmpty.json()
      expect(dataEmpty.success).toBe(false)

      // Malformed email
      const reqInvalid = createMockReq({
        url: 'http://localhost:3000/api/newsletter/subscribe',
        body: { email: 'not-a-valid-email' },
      })
      const resInvalid = await newsletterSubscribeHandler(reqInvalid)
      expect(resInvalid.status).toBe(400)
      const dataInvalid = await resInvalid.json()
      expect(dataInvalid.success).toBe(false)
    })

    it('silently accepts honeypot bot submissions without creating database records', async () => {
      const botEmail = `bot-${Date.now()}@spambot.local`
      const req = createMockReq({
        url: 'http://localhost:3000/api/newsletter/subscribe',
        body: {
          email: botEmail,
          honeypot: 'http://spam-site.com',
        },
      })
      const res = await newsletterSubscribeHandler(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      // Verify no record was created in subscribers collection
      const found = await payload.find({
        collection: 'subscribers',
        where: { email: { equals: botEmail } },
        overrideAccess: true,
      })
      expect(found.totalDocs).toBe(0)
    })

    it('creates a pending subscriber, hashes tokens, and dispatches confirmation email', async () => {
      const email = `traveler-${runId}-${Date.now()}@example.local`
      const req = createMockReq({
        url: 'http://localhost:3000/api/newsletter/subscribe',
        body: {
          email,
          locale: 'en',
          source: 'stories_footer',
        },
      })
      const res = await newsletterSubscribeHandler(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.message).toContain('confirmation email has been sent')

      // Verify subscriber was created with pending status
      const found = await payload.find({
        collection: 'subscribers',
        where: { email: { equals: email.toLowerCase() } },
        overrideAccess: true,
      })
      expect(found.totalDocs).toBe(1)
      const subDoc = found.docs[0]
      createdSubscriberIds.push(subDoc.id)

      expect(subDoc.status).toBe('pending')
      expect(subDoc.locale).toBe('en')
      expect(subDoc.source).toBe('stories_footer')
      expect(subDoc.confirmationTokenHash).toBeDefined()
      expect(subDoc.confirmationExpiresAt).toBeDefined()
      expect(subDoc.unsubscribeTokenHash).toBeDefined()

      // Verify confirmation email was captured
      const emails = getCapturedEmails()
      expect(emails.length).toBeGreaterThanOrEqual(1)
      const sentEmail = emails.find((e) => e.to === email.toLowerCase())
      expect(sentEmail).toBeDefined()
      expect(sentEmail?.html).toContain('confirm?token=')
    })

    it('returns uniform response without leaking status for existing active subscribers', async () => {
      const email = `existing-${runId}-${Date.now()}@example.local`

      // Pre-create an active subscriber
      const existingSub = await payload.create({
        collection: 'subscribers',
        data: {
          email,
          status: 'subscribed',
          locale: 'en',
          tokenVersion: 2,
        },
        overrideAccess: true,
      })
      createdSubscriberIds.push(existingSub.id)

      // Submitting subscribe again for already-subscribed email
      const req = createMockReq({
        url: 'http://localhost:3000/api/newsletter/subscribe',
        body: { email },
      })
      const res = await newsletterSubscribeHandler(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      // Must not leak that user is already subscribed
      expect(data.alreadySubscribed).toBeUndefined()
      expect(data.message).toContain('confirmation email has been sent')
    })

    it('enforces rate limiting on repeated requests for the same email', async () => {
      const email = `ratelimit-${runId}-${Date.now()}@example.local`
      let lastStatus = 200

      for (let i = 0; i < 7; i++) {
        const req = createMockReq({
          url: 'http://localhost:3000/api/newsletter/subscribe',
          body: { email },
        })
        const res = await newsletterSubscribeHandler(req)
        lastStatus = res.status
      }

      expect(lastStatus).toBe(429)

      // Clean up if created
      const found = await payload.find({
        collection: 'subscribers',
        where: { email: { equals: email } },
        overrideAccess: true,
      })
      if (found.docs[0]) createdSubscriberIds.push(found.docs[0].id)
    })
  })

  describe('newsletterConfirmHandler (POST & GET /api/newsletter/confirm)', () => {
    it('rejects confirmation with missing token', async () => {
      const req = createMockReq({
        method: 'POST',
        url: 'http://localhost:3000/api/newsletter/confirm',
        body: {},
      })
      const res = await newsletterConfirmHandler(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('token is required')
    })

    it('rejects confirmation with invalid / non-matching token', async () => {
      const req = createMockReq({
        method: 'POST',
        url: 'http://localhost:3000/api/newsletter/confirm',
        body: { token: 'unmatched-token-1234567890abcdef' },
      })
      const res = await newsletterConfirmHandler(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid or expired')
    })

    it('rejects expired confirmation token with 410 Gone', async () => {
      const email = `expired-${runId}-${Date.now()}@example.local`
      const rawToken = generateSecureToken()
      const tokenHash = hashToken(rawToken)
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 24 hours in past

      const sub = await payload.create({
        collection: 'subscribers',
        data: {
          email,
          status: 'pending',
          confirmationTokenHash: tokenHash,
          confirmationExpiresAt: pastDate,
          tokenVersion: 2,
        },
        overrideAccess: true,
      })
      createdSubscriberIds.push(sub.id)

      const req = createMockReq({
        method: 'POST',
        url: 'http://localhost:3000/api/newsletter/confirm',
        body: { token: rawToken, email },
      })
      const res = await newsletterConfirmHandler(req)
      expect(res.status).toBe(410)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.expired).toBe(true)
    })

    it('activates pending subscriber, clears single-use token, and updates locale', async () => {
      const email = `activate-${runId}-${Date.now()}@example.local`
      const rawToken = generateSecureToken()
      const tokenHash = hashToken(rawToken)
      const futureDate = getConfirmationExpiration(48).toISOString()

      const sub = await payload.create({
        collection: 'subscribers',
        data: {
          email,
          status: 'pending',
          locale: 'en',
          confirmationTokenHash: tokenHash,
          confirmationExpiresAt: futureDate,
          tokenVersion: 2,
        },
        overrideAccess: true,
      })
      createdSubscriberIds.push(sub.id)

      const req = createMockReq({
        method: 'GET',
        url: `http://localhost:3000/api/newsletter/confirm?token=${rawToken}&email=${encodeURIComponent(
          email,
        )}&locale=am`,
      })
      const res = await newsletterConfirmHandler(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      // Verify subscriber was activated in DB
      const refreshed = await payload.findByID({
        collection: 'subscribers',
        id: sub.id,
        overrideAccess: true,
      })
      expect(refreshed.status).toBe('subscribed')
      expect(refreshed.locale).toBe('am')
      expect(refreshed.confirmationTokenHash).toBeNull()
      expect(refreshed.confirmationExpiresAt).toBeNull()
    })
  })

  describe('newsletterUnsubscribePostHandler (POST /api/newsletter/unsubscribe)', () => {
    it('rejects missing or malformed tokens (such as raw MongoDB IDs)', async () => {
      // Missing token
      const reqEmpty = createMockReq({
        method: 'POST',
        url: 'http://localhost:3000/api/newsletter/unsubscribe',
        body: {},
      })
      const resEmpty = await newsletterUnsubscribePostHandler(reqEmpty)
      expect(resEmpty.status).toBe(400)

      // Malformed token (short ID)
      const reqShort = createMockReq({
        method: 'POST',
        url: 'http://localhost:3000/api/newsletter/unsubscribe',
        body: { token: 'short-id' },
      })
      const resShort = await newsletterUnsubscribePostHandler(reqShort)
      expect(resShort.status).toBe(400)

      // Raw 24-character Mongo ObjectID is rejected (needs at least 32 hex chars)
      const reqMongoId = createMockReq({
        method: 'POST',
        url: 'http://localhost:3000/api/newsletter/unsubscribe',
        body: { token: '672b12345678901234567890' },
      })
      const resMongoId = await newsletterUnsubscribePostHandler(reqMongoId)
      expect(resMongoId.status).toBe(400)
    })

    it('returns idempotent 200 for valid token format with no matching subscriber', async () => {
      const validFormatToken = generateSecureToken() // 64-char valid hex token
      const req = createMockReq({
        method: 'POST',
        url: 'http://localhost:3000/api/newsletter/unsubscribe',
        body: { token: validFormatToken },
      })
      const res = await newsletterUnsubscribePostHandler(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.message).toContain('unsubscribed')
    })

    it('rejects passing stored hash directly as bearer token', async () => {
      const email = `hashattack-${runId}-${Date.now()}@example.local`
      const rawToken = generateSecureToken()
      const storedHash = hashToken(rawToken)

      const sub = await payload.create({
        collection: 'subscribers',
        data: {
          email,
          status: 'subscribed',
          unsubscribeTokenHash: storedHash,
          tokenVersion: 2,
        },
        overrideAccess: true,
      })
      createdSubscriberIds.push(sub.id)

      // Attacker presents the stored hash directly as the bearer token
      const req = createMockReq({
        method: 'POST',
        url: 'http://localhost:3000/api/newsletter/unsubscribe',
        body: { token: storedHash },
      })
      const res = await newsletterUnsubscribePostHandler(req)
      // Since hashToken(storedHash) !== storedHash, it does not match
      expect(res.status).toBe(200)

      // Subscriber must remain subscribed
      const refreshed = await payload.findByID({
        collection: 'subscribers',
        id: sub.id,
        overrideAccess: true,
      })
      expect(refreshed.status).toBe('subscribed')
    })

    it('successfully unsubscribes with authentic raw token and remains idempotent on repeat', async () => {
      const email = `unsub-${runId}-${Date.now()}@example.local`
      const rawToken = generateSecureToken()
      const storedHash = hashToken(rawToken)

      const sub = await payload.create({
        collection: 'subscribers',
        data: {
          email,
          status: 'subscribed',
          locale: 'en',
          unsubscribeTokenHash: storedHash,
          tokenVersion: 2,
        },
        overrideAccess: true,
      })
      createdSubscriberIds.push(sub.id)

      // 1. First unsubscribe
      const req1 = createMockReq({
        method: 'POST',
        url: 'http://localhost:3000/api/newsletter/unsubscribe',
        body: { token: rawToken },
      })
      const res1 = await newsletterUnsubscribePostHandler(req1)
      expect(res1.status).toBe(200)
      const data1 = await res1.json()
      expect(data1.success).toBe(true)

      const refreshed1 = await payload.findByID({
        collection: 'subscribers',
        id: sub.id,
        overrideAccess: true,
      })
      expect(refreshed1.status).toBe('unsubscribed')

      // 2. Repeat unsubscribe for already unsubscribed subscriber (idempotent)
      const req2 = createMockReq({
        method: 'POST',
        url: 'http://localhost:3000/api/newsletter/unsubscribe',
        body: { token: rawToken },
      })
      const res2 = await newsletterUnsubscribePostHandler(req2)
      expect(res2.status).toBe(200)
      const data2 = await res2.json()
      expect(data2.success).toBe(true)
      expect(data2.message).toContain('already unsubscribed')
    })
  })
})
