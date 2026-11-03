import { describe, it, expect } from 'vitest'
import { Subscribers } from '@/collections/Subscribers'
import type { Field } from 'payload'

describe('Unit: Subscribers Collection Configuration', () => {
  it('has correct collection identifier and labels', () => {
    expect(Subscribers.slug).toBe('subscribers')
    expect(Subscribers.timestamps).toBe(true)
    expect(Subscribers.admin?.useAsTitle).toBe('email')
    expect(Subscribers.labels?.singular).toEqual({ en: 'Subscriber', am: 'ተመዝጋቢ' })
    expect(Subscribers.labels?.plural).toEqual({ en: 'Subscribers', am: 'ተመዝጋቢዎች' })
  })

  describe('Access Control Rules', () => {
    it('prohibits public direct access to subscriber data', () => {
      const readAccess = Subscribers.access?.read
      const createAccess = Subscribers.access?.create
      const updateAccess = Subscribers.access?.update
      const deleteAccess = Subscribers.access?.delete

      // Public / unauthenticated
      expect((readAccess as any)({ req: { user: null } })).toBe(false)
      expect((createAccess as any)({ req: { user: null } })).toBe(false)
      expect((updateAccess as any)({ req: { user: null } })).toBe(false)
      expect((deleteAccess as any)({ req: { user: null } })).toBe(false)

      // Admin has full access
      expect((readAccess as any)({ req: { user: { role: 'admin' } } })).toBe(true)
      expect((createAccess as any)({ req: { user: { role: 'admin' } } })).toBe(true)
      expect((updateAccess as any)({ req: { user: { role: 'admin' } } })).toBe(true)
      expect((deleteAccess as any)({ req: { user: { role: 'admin' } } })).toBe(true)

      // Editor has read/create/update but not delete
      expect((readAccess as any)({ req: { user: { role: 'editor' } } })).toBe(true)
      expect((deleteAccess as any)({ req: { user: { role: 'editor' } } })).toBe(false)
    })
  })

  describe('Fields & Token Security', () => {
    const fields = Subscribers.fields as Field[]
    const getField = (name: string) => fields.find((f: any) => f.name === name) as any

    it('normalizes email to lowercase in beforeValidate hook', () => {
      const emailField = getField('email')
      expect(emailField).toBeDefined()
      expect(emailField.unique).toBe(true)
      expect(emailField.required).toBe(true)

      const hook = emailField.hooks?.beforeValidate?.[0]
      expect(typeof hook).toBe('function')
      expect(hook({ value: '  TEST.USER@Example.COM  ' })).toBe('test.user@example.com')
    })

    it('defines status enum with pending as default', () => {
      const statusField = getField('status')
      expect(statusField).toBeDefined()
      expect(statusField.defaultValue).toBe('pending')
      const options = statusField.options.map((o: any) => o.value)
      expect(options).toEqual(['pending', 'subscribed', 'unsubscribed'])
    })

    it('restricts token hash fields to admin read only', () => {
      const confirmHash = getField('confirmationTokenHash')
      const unsubHash = getField('unsubscribeTokenHash')

      expect(confirmHash).toBeDefined()
      expect(unsubHash).toBeDefined()

      expect(confirmHash.access?.read({ req: { user: null } })).toBe(false)
      expect(confirmHash.access?.read({ req: { user: { role: 'admin' } } })).toBe(true)

      expect(unsubHash.access?.read({ req: { user: null } })).toBe(false)
      expect(unsubHash.access?.read({ req: { user: { role: 'admin' } } })).toBe(true)
    })
  })
})
