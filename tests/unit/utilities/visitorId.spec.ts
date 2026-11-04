import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import {
  signVisitorId,
  verifyVisitorId,
  deriveVisitorHash,
} from '@/lib/site/engagement'

describe('Unit: Visitor ID Security & Cryptography Utilities', () => {
  const secret = 'test-secret-key-for-visitor-cookies-12345'
  const validUuid = crypto.randomUUID()

  describe('signVisitorId & verifyVisitorId', () => {
    it('signs and verifies a valid visitor UUID', () => {
      const signed = signVisitorId(validUuid, secret)
      expect(typeof signed).toBe('string')
      expect(signed).toContain('.')

      const verified = verifyVisitorId(signed, secret)
      expect(verified).toBe(validUuid)
    })

    it('rejects tampered visitor UUID', () => {
      const signed = signVisitorId(validUuid, secret)
      const tampered = signed.replace(validUuid.slice(0, 4), 'ffff')

      expect(verifyVisitorId(tampered, secret)).toBeNull()
    })

    it('rejects tampered signature component', () => {
      const signed = signVisitorId(validUuid, secret)
      const parts = signed.split('.')
      const tampered = `${parts[0]}.invalidSignature123`

      expect(verifyVisitorId(tampered, secret)).toBeNull()
    })

    it('rejects verification with wrong secret key', () => {
      const signed = signVisitorId(validUuid, secret)
      const wrongSecret = 'another-completely-different-secret'

      expect(verifyVisitorId(signed, wrongSecret)).toBeNull()
    })

    it('rejects invalid or non-UUID tokens', () => {
      expect(verifyVisitorId('not-a-token', secret)).toBeNull()
      expect(verifyVisitorId('admin.signature', secret)).toBeNull()
      expect(verifyVisitorId('', secret)).toBeNull()
    })
  })

  describe('deriveVisitorHash', () => {
    it('derives a consistent 64-character SHA-256 hash without exposing raw UUID', () => {
      const hash1 = deriveVisitorHash(validUuid, secret)
      const hash2 = deriveVisitorHash(validUuid, secret)

      expect(hash1).toHaveLength(64)
      expect(hash1).toBe(hash2)
      expect(hash1).not.toBe(validUuid)
    })
  })
})
