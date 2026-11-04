import { describe, it, expect } from 'vitest'
import { Comments } from '@/collections/Comments'
import type { Field } from 'payload'

describe('Unit: Comments Collection Configuration', () => {
  it('has correct collection identifier and labels', () => {
    expect(Comments.slug).toBe('comments')
    expect(Comments.timestamps).toBe(true)
    expect(Comments.labels?.singular).toEqual({ en: 'Comment', am: 'አስተያየት' })
    expect(Comments.labels?.plural).toEqual({ en: 'Comments', am: 'አስተያየቶች' })
  })

  describe('Access Control Rules', () => {
    it('restricts read access for public readers to approved comments only', () => {
      const readAccess = Comments.access?.read
      expect(typeof readAccess).toBe('function')

      if (typeof readAccess === 'function') {
        // Public reader
        const publicResult = (readAccess as any)({ req: { user: null } })
        expect(publicResult).toEqual({
          status: { equals: 'approved' },
        })

        // Staff (admin)
        const adminResult = (readAccess as any)({
          req: { user: { role: 'admin' } },
        })
        expect(adminResult).toBe(true)

        // Staff (editor)
        const editorResult = (readAccess as any)({
          req: { user: { role: 'editor' } },
        })
        expect(editorResult).toBe(true)

        // Regular user without admin/editor role
        const regularUserResult = (readAccess as any)({
          req: { user: { role: 'subscriber' } },
        })
        expect(regularUserResult).toEqual({
          status: { equals: 'approved' },
        })
      }
    })

    it('allows public comment creation while restricting update and delete to staff', () => {
      const createAccess = Comments.access?.create
      const updateAccess = Comments.access?.update
      const deleteAccess = Comments.access?.delete

      expect(typeof createAccess).toBe('function')
      expect((createAccess as any)()).toBe(true)

      // Update
      expect((updateAccess as any)({ req: { user: null } })).toBe(false)
      expect((updateAccess as any)({ req: { user: { role: 'editor' } } })).toBe(true)
      expect((updateAccess as any)({ req: { user: { role: 'admin' } } })).toBe(true)

      // Delete
      expect((deleteAccess as any)({ req: { user: null } })).toBe(false)
      expect((deleteAccess as any)({ req: { user: { role: 'editor' } } })).toBe(true)
      expect((deleteAccess as any)({ req: { user: { role: 'admin' } } })).toBe(true)
    })
  })

  describe('Field-Level Security and Validation', () => {
    const fields = Comments.fields as Field[]
    const getField = (name: string) => fields.find((f: any) => f.name === name) as any

    it('protects email address from public read access', () => {
      const emailField = getField('email')
      expect(emailField).toBeDefined()
      expect(emailField.type).toBe('email')

      const readAccess = emailField.access?.read
      expect(typeof readAccess).toBe('function')

      // Public cannot read email
      expect(readAccess({ req: { user: null, context: { isPublicQuery: true } } })).toBe(false)
      // Admin can read email
      expect(readAccess({ req: { user: { role: 'admin' } } })).toBe(true)
      // Editor can read email
      expect(readAccess({ req: { user: { role: 'editor' } } })).toBe(true)
    })

    it('protects status field from public create and update', () => {
      const statusField = getField('status')
      expect(statusField).toBeDefined()
      expect(statusField.defaultValue).toBe('pending')

      const createAccess = statusField.access?.create
      const updateAccess = statusField.access?.update

      // Public visitor cannot set status on create
      expect(createAccess({ req: { user: null, context: { isPublicSubmission: true } } })).toBe(false)
      // Staff can set status
      expect(createAccess({ req: { user: { role: 'admin' } } })).toBe(true)

      // Public cannot update status
      expect(updateAccess({ req: { user: null, context: {} } })).toBe(false)
      // Staff can update status
      expect(updateAccess({ req: { user: { role: 'editor' } } })).toBe(true)
    })

    it('requires article relationship for public comment creations', () => {
      const articleField = getField('article')
      expect(articleField).toBeDefined()
      expect(articleField.relationTo).toBe('articles')

      const validate = articleField.validate
      expect(typeof validate).toBe('function')

      // Public create with missing article returns error message
      const invalid = validate(null, {
        operation: 'create',
        req: { user: null, payloadAPI: 'REST', context: { isPublicSubmission: true } },
      })
      expect(typeof invalid).toBe('string')
      expect(invalid).toMatch(/article must be selected/i)

      // Public create with valid article passes
      const valid = validate('article-id-123', {
        operation: 'create',
        req: { user: null, payloadAPI: 'REST', context: { isPublicSubmission: true } },
      })
      expect(valid).toBe(true)

      // Staff creation without article (legacy preservation) is permitted
      const staffValid = validate(null, {
        operation: 'create',
        req: { user: { role: 'admin' }, payloadAPI: 'local' },
      })
      expect(staffValid).toBe(true)
    })
  })
})
