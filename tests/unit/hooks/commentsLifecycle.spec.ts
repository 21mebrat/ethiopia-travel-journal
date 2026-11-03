import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Comments } from '@/collections/Comments'
import * as engagementModule from '@/lib/site/engagement'

describe('Unit: Comments Collection Lifecycle Hooks', () => {
  const beforeChangeHook = Comments.hooks?.beforeChange?.[0]
  const afterChangeHook = Comments.hooks?.afterChange?.[0]
  const afterDeleteHook = Comments.hooks?.afterDelete?.[0]

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(engagementModule, 'reconcileArticleMetrics').mockResolvedValue({} as any)
  })

  describe('beforeChange Hook', () => {
    it('forces status to pending for unauthenticated/public creations', async () => {
      const data: any = {
        author: 'Sneaky Visitor',
        commentText: 'Trying to auto-approve my comment',
        status: 'approved',
      }
      const req: any = {
        user: null,
        payloadAPI: 'REST',
        context: { isPublicSubmission: true },
      }

      const result = await (beforeChangeHook as any)({ data, originalDoc: null, req })
      expect(result.status).toBe('pending')
    })

    it('allows staff to directly set or update status', async () => {
      const data: any = {
        status: 'approved',
      }
      const req: any = {
        user: { id: 'admin1', role: 'admin' },
        payloadAPI: 'REST',
        context: {},
      }

      const result = await (beforeChangeHook as any)({
        data,
        originalDoc: { status: 'pending' },
        req,
      })
      expect(result.status).toBe('approved')
      expect(result.moderatedAt).toBeDefined()
      expect(result.moderatedBy).toBe('admin1')
    })

    it('generates rich text Lexical body from plain text commentText', async () => {
      const data: any = {
        commentText: 'A beautiful journey across Ethiopia!',
      }
      const req: any = { user: null, context: {} }

      const result = await (beforeChangeHook as any)({ data, originalDoc: null, req })
      expect(result.body).toBeDefined()
      expect(result.body.root).toBeDefined()
      expect(result.body.root.children[0].children[0].text).toBe(
        'A beautiful journey across Ethiopia!',
      )
    })

    it('populates commentMutation context with state transition details', async () => {
      const req: any = { user: { role: 'admin' }, context: {} }
      const originalDoc = { id: 'com-1', status: 'pending', article: 'art-1' }
      const data = { status: 'approved', article: 'art-1' }

      await (beforeChangeHook as any)({ data, originalDoc, req })

      expect(req.context.commentMutation).toEqual({
        wasApproved: false,
        willBeApproved: true,
        oldArticleId: 'art-1',
        newArticleId: 'art-1',
        statusChanged: true,
        articleChanged: false,
      })
    })
  })

  describe('afterChange Hook', () => {
    it('triggers reconcileArticleMetrics when approval status changes', async () => {
      const spy = vi.spyOn(engagementModule, 'reconcileArticleMetrics')
      const doc = { id: 'com-1', article: 'art-1', status: 'approved' }
      const req: any = {
        payload: { logger: { error: vi.fn() } },
        context: {
          commentMutation: {
            wasApproved: false,
            willBeApproved: true,
            oldArticleId: 'art-1',
            newArticleId: 'art-1',
            statusChanged: true,
            articleChanged: false,
          },
        },
      }

      await (afterChangeHook as any)({ doc, req })
      expect(spy).toHaveBeenCalledWith(req.payload, 'art-1')
    })
  })

  describe('afterDelete Hook', () => {
    it('triggers reconcileArticleMetrics when an approved comment is deleted', async () => {
      const spy = vi.spyOn(engagementModule, 'reconcileArticleMetrics')
      const doc = { id: 'com-1', article: 'art-1', status: 'approved' }
      const req: any = {
        payload: { logger: { error: vi.fn() } },
      }

      await (afterDeleteHook as any)({ doc, req })
      expect(spy).toHaveBeenCalledWith(req.payload, 'art-1')
    })

    it('does not trigger reconcileArticleMetrics when a pending comment is deleted', async () => {
      const spy = vi.spyOn(engagementModule, 'reconcileArticleMetrics')
      const doc = { id: 'com-1', article: 'art-1', status: 'pending' }
      const req: any = {
        payload: { logger: { error: vi.fn() } },
      }

      await (afterDeleteHook as any)({ doc, req })
      expect(spy).not.toHaveBeenCalled()
    })
  })
})
