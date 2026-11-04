import { describe, it, expect } from 'vitest'
import {
  generateSecureToken,
  hashToken,
  getSubscriberUnsubscribeToken,
  verifyTokenHash,
  isValidTokenFormat,
  getConfirmationExpiration,
  isTokenExpired,
} from '@/lib/email/tokens'

describe('Unit: Email & Token Cryptography Utilities', () => {
  describe('generateSecureToken', () => {
    it('generates a 64-character hexadecimal token with high entropy', () => {
      const token1 = generateSecureToken()
      const token2 = generateSecureToken()

      expect(typeof token1).toBe('string')
      expect(token1).toHaveLength(64)
      expect(/^[0-9a-f]{64}$/.test(token1)).toBe(true)
      expect(token1).not.toBe(token2)
    })
  })

  describe('hashToken', () => {
    it('generates a deterministic SHA-256 hash', () => {
      const token = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      const hash1 = hashToken(token)
      const hash2 = hashToken(token)

      expect(hash1).toHaveLength(64)
      expect(hash1).toBe(hash2)
    })

    it('trims leading/trailing whitespace before hashing', () => {
      const token = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      expect(hashToken(`  ${token}  `)).toBe(hashToken(token))
    })
  })

  describe('verifyTokenHash', () => {
    it('verifies a valid token against its stored hash in constant time', () => {
      const rawToken = generateSecureToken()
      const storedHash = hashToken(rawToken)

      expect(verifyTokenHash(rawToken, storedHash)).toBe(true)
    })

    it('rejects an incorrect token', () => {
      const rawToken = generateSecureToken()
      const differentToken = generateSecureToken()
      const storedHash = hashToken(rawToken)

      expect(verifyTokenHash(differentToken, storedHash)).toBe(false)
    })

    it('rejects empty or invalid inputs safely', () => {
      expect(verifyTokenHash('', 'somehash')).toBe(false)
      expect(verifyTokenHash('sometoken', '')).toBe(false)
    })
  })

  describe('isValidTokenFormat', () => {
    it('accepts valid hex strings between 32 and 128 chars', () => {
      expect(isValidTokenFormat(generateSecureToken())).toBe(true)
      expect(isValidTokenFormat('a'.repeat(32))).toBe(true)
      expect(isValidTokenFormat('f'.repeat(128))).toBe(true)
    })

    it('rejects short tokens or non-hex characters', () => {
      expect(isValidTokenFormat('12345')).toBe(false)
      expect(isValidTokenFormat('not-a-valid-hex-token-string-here!')).toBe(false)
      expect(isValidTokenFormat(null)).toBe(false)
      expect(isValidTokenFormat(12345)).toBe(false)
    })
  })

  describe('Expiration helpers', () => {
    it('getConfirmationExpiration returns a future date (default 48 hours)', () => {
      const now = Date.now()
      const expiry = getConfirmationExpiration(48)

      expect(expiry).toBeInstanceOf(Date)
      const diffHours = (expiry.getTime() - now) / (1000 * 60 * 60)
      expect(Math.round(diffHours)).toBe(48)
    })

    it('isTokenExpired correctly detects past and future dates', () => {
      const past = new Date(Date.now() - 1000)
      const future = new Date(Date.now() + 60000)

      expect(isTokenExpired(past)).toBe(true)
      expect(isTokenExpired(future)).toBe(false)
      expect(isTokenExpired(null)).toBe(true)
      expect(isTokenExpired(undefined)).toBe(true)
    })
  })

  describe('getSubscriberUnsubscribeToken', () => {
    it('derives a deterministic unguessable token for a subscriber', () => {
      const sub = {
        id: 'sub-123',
        email: 'traveler@example.com',
        createdAt: '2026-01-01T00:00:00.000Z',
      }
      const token1 = getSubscriberUnsubscribeToken(sub)
      const token2 = getSubscriberUnsubscribeToken(sub)

      expect(token1).toHaveLength(64)
      expect(token1).toBe(token2)
    })
  })
})
