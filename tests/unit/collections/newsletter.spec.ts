import { describe, it, expect } from 'vitest'
import { NewsletterBroadcasts } from '@/collections/NewsletterBroadcasts'
import { NewsletterDeliveries } from '@/collections/NewsletterDeliveries'
import type { Field } from 'payload'

describe('Unit: Newsletter Collections Configuration', () => {
  describe('NewsletterBroadcasts Collection', () => {
    it('has correct collection identifier and access control', () => {
      expect(NewsletterBroadcasts.slug).toBe('newsletter-broadcasts')
      expect(NewsletterBroadcasts.timestamps).toBe(true)

      const readAccess = NewsletterBroadcasts.access?.read
      expect((readAccess as any)({ req: { user: null } })).toBe(false)
      expect((readAccess as any)({ req: { user: { role: 'admin' } } })).toBe(true)
      expect((readAccess as any)({ req: { user: { role: 'editor' } } })).toBe(true)
    })

    it('defines status enum covering all delivery lifecycle stages', () => {
      const fields = NewsletterBroadcasts.fields as Field[]
      const statusField = fields.find((f: any) => f.name === 'status') as any

      expect(statusField).toBeDefined()
      expect(statusField.defaultValue).toBe('pending')

      const values = statusField.options.map((o: any) => o.value)
      expect(values).toEqual(['pending', 'processing', 'completed', 'failed', 'partial'])
    })

    it('requires unique one-to-one relationship with articles', () => {
      const fields = NewsletterBroadcasts.fields as Field[]
      const articleField = fields.find((f: any) => f.name === 'article') as any

      expect(articleField).toBeDefined()
      expect(articleField.relationTo).toBe('articles')
      expect(articleField.required).toBe(true)
      expect(articleField.unique).toBe(true)
    })
  })

  describe('NewsletterDeliveries Collection', () => {
    it('has correct collection identifier and access control', () => {
      expect(NewsletterDeliveries.slug).toBe('newsletter-deliveries')
      expect(NewsletterDeliveries.timestamps).toBe(true)

      const readAccess = NewsletterDeliveries.access?.read
      expect((readAccess as any)({ req: { user: null } })).toBe(false)
      expect((readAccess as any)({ req: { user: { role: 'admin' } } })).toBe(true)
    })

    it('configures unique deliveryKey and atomic claim lease fields', () => {
      const fields = NewsletterDeliveries.fields as Field[]
      const getField = (name: string) => fields.find((f: any) => f.name === name) as any

      const deliveryKeyField = getField('deliveryKey')
      expect(deliveryKeyField).toBeDefined()
      expect(deliveryKeyField.unique).toBe(true)
      expect(deliveryKeyField.index).toBe(true)

      const workerIdField = getField('workerId')
      expect(workerIdField).toBeDefined()
      expect(workerIdField.type).toBe('text')

      const leaseExpiresAtField = getField('leaseExpiresAt')
      expect(leaseExpiresAtField).toBeDefined()
      expect(leaseExpiresAtField.type).toBe('date')

      const leaseClaimedAtField = getField('leaseClaimedAt')
      expect(leaseClaimedAtField).toBeDefined()
      expect(leaseClaimedAtField.type).toBe('date')

      const attemptsField = getField('attempts')
      expect(attemptsField).toBeDefined()
      expect(attemptsField.defaultValue).toBe(0)
    })

    it('defines delivery status transitions', () => {
      const fields = NewsletterDeliveries.fields as Field[]
      const statusField = fields.find((f: any) => f.name === 'status') as any

      expect(statusField).toBeDefined()
      expect(statusField.defaultValue).toBe('pending')

      const values = statusField.options.map((o: any) => o.value)
      expect(values).toContain('pending')
      expect(values).toContain('sending')
      expect(values).toContain('sent')
      expect(values).toContain('failed')
      expect(values).toContain('skipped')
    })
  })
})
