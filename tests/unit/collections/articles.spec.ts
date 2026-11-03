import { describe, it, expect } from 'vitest'
import { Articles } from '@/collections/Articles'
import type { Field } from 'payload'

describe('Unit: Articles Collection Configuration', () => {
  it('has correct collection identifier and basic configuration', () => {
    expect(Articles.slug).toBe('articles')
    expect(Articles.timestamps).toBe(true)
    expect(Articles.admin?.useAsTitle).toBe('title')
    expect(Articles.versions).toEqual({ drafts: true })
  })

  it('configures bilingual collection labels', () => {
    expect(Articles.labels?.singular).toEqual({
      en: 'Article',
      am: 'ጽሑፍ',
    })
    expect(Articles.labels?.plural).toEqual({
      en: 'Articles',
      am: 'ጽሑፎች',
    })
  })

  describe('Access Control Rules', () => {
    it('restricts read access for unauthenticated users to published articles only', () => {
      const readAccess = Articles.access?.read
      expect(typeof readAccess).toBe('function')

      if (typeof readAccess === 'function') {
        // Public / unauthenticated user
        const publicResult = (readAccess as any)({ req: { user: null } })
        expect(publicResult).toEqual({
          _status: { equals: 'published' },
        })

        // Authenticated admin or author can view drafts
        const adminResult = (readAccess as any)({
          req: { user: { id: 'admin1', role: 'admin' } },
        })
        expect(adminResult).toBe(true)

        // Authenticated author
        const authorResult = (readAccess as any)({
          req: { user: { id: 'user123', role: 'author' } },
        })
        expect(authorResult).toEqual({
          or: [
            { _status: { equals: 'published' } },
            { author: { equals: 'user123' } },
          ],
        })
      }
    })

    it('restricts delete access to admins or the original author', () => {
      const deleteAccess = Articles.access?.delete
      expect(typeof deleteAccess).toBe('function')

      if (typeof deleteAccess === 'function') {
        const publicResult = (deleteAccess as any)({ req: { user: null } })
        expect(publicResult).toBe(false)

        const adminResult = (deleteAccess as any)({
          req: { user: { id: 'admin1', role: 'admin' } },
        })
        expect(adminResult).toBe(true)
      }
    })
  })

  describe('Engagement & Metric Fields Access Control', () => {
    const fields = Articles.fields as Field[]
    const getField = (name: string) => fields.find((f: any) => f.name === name) as any

    it('protects viewCount from direct public mutation', () => {
      const viewCountField = getField('viewCount')
      expect(viewCountField).toBeDefined()
      expect(viewCountField.type).toBe('number')
      expect(viewCountField.defaultValue).toBe(0)
      expect(viewCountField.admin?.readOnly).toBe(true)

      const updateAccess = viewCountField.access?.update
      expect(typeof updateAccess).toBe('function')

      // Public cannot update
      expect(updateAccess({ req: { user: null, context: {} } })).toBe(false)
      // Internal counter update can update
      expect(updateAccess({ req: { context: { internalCounterUpdate: true } } })).toBe(true)
      // Admin can update
      expect(updateAccess({ req: { user: { role: 'admin' } } })).toBe(true)
    })

    it('protects commentCount from direct public mutation', () => {
      const commentCountField = getField('commentCount')
      expect(commentCountField).toBeDefined()
      expect(commentCountField.defaultValue).toBe(0)
      expect(commentCountField.admin?.readOnly).toBe(true)

      const updateAccess = commentCountField.access?.update
      expect(typeof updateAccess).toBe('function')

      expect(updateAccess({ req: { user: null, context: {} } })).toBe(false)
      expect(updateAccess({ req: { context: { internalCounterUpdate: true } } })).toBe(true)
    })

    it('protects engagementScore from direct public mutation', () => {
      const engagementField = getField('engagementScore')
      expect(engagementField).toBeDefined()
      expect(engagementField.defaultValue).toBe(0)
      expect(engagementField.admin?.readOnly).toBe(true)

      const updateAccess = engagementField.access?.update
      expect(typeof updateAccess).toBe('function')

      expect(updateAccess({ req: { user: null, context: {} } })).toBe(false)
      expect(updateAccess({ req: { context: { internalCounterUpdate: true } } })).toBe(true)
    })

    it('configures newsletterPublishedAt timestamp field as read-only', () => {
      const newsletterField = getField('newsletterPublishedAt')
      expect(newsletterField).toBeDefined()
      expect(newsletterField.type).toBe('date')
      expect(newsletterField.admin?.readOnly).toBe(true)
    })
  })

  describe('Slug generation hook', () => {
    it('automatically generates slug from title when slug is empty', () => {
      const slugField = (Articles.fields as any[]).find((f) => f.name === 'slug')
      expect(slugField).toBeDefined()
      const beforeValidateHook = slugField.hooks?.beforeValidate?.[0]
      expect(typeof beforeValidateHook).toBe('function')

      const result = beforeValidateHook({
        value: '',
        data: { title: 'Discovering Simien Mountains & Wild Geladas' },
      })
      expect(result).toBe('discovering-simien-mountains-wild-geladas')
    })
  })
})
