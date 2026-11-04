import { describe, it, expect, vi, beforeEach } from 'vitest'
import { afterArticleChange } from '@/hooks/afterArticleChange'
import * as queueModule from '@/lib/newsletter/queue'

describe('Unit: afterArticleChange Hook', () => {
  let mockPayload: any
  let enqueueSpy: any

  beforeEach(() => {
    vi.restoreAllMocks()
    mockPayload = {
      find: vi.fn().mockResolvedValue({ totalDocs: 0, docs: [] }),
      update: vi.fn().mockResolvedValue({}),
    }
    enqueueSpy = vi
      .spyOn(queueModule, 'enqueueArticleNewsletter')
      .mockResolvedValue({ broadcastId: 'broadcast-123', enqueuedCount: 5 } as any)
    vi.spyOn(queueModule, 'processNewsletterBroadcast').mockResolvedValue(undefined as any)
  })

  it('bypasses execution when disableNewsletter context is set', async () => {
    const doc = { id: 'art-1', _status: 'published' }
    const result = await afterArticleChange({
      doc,
      previousDoc: { id: 'art-1', _status: 'draft' },
      data: {},
      req: { payload: mockPayload, context: {} } as any,
      context: { disableNewsletter: true },
      operation: 'update',
      collection: {} as any,
    } as any)

    expect(result).toBe(doc)
    expect(enqueueSpy).not.toHaveBeenCalled()
    expect(mockPayload.find).not.toHaveBeenCalled()
  })

  it('bypasses execution when article is saved as a draft', async () => {
    const doc = { id: 'art-1', _status: 'draft' }
    const result = await afterArticleChange({
      doc,
      previousDoc: null,
      data: {},
      req: { payload: mockPayload, context: {} } as any,
      context: {},
      operation: 'create',
      collection: {} as any,
    } as any)

    expect(result).toBe(doc)
    expect(enqueueSpy).not.toHaveBeenCalled()
  })

  it('bypasses execution on published article edits (already published)', async () => {
    const doc = { id: 'art-1', _status: 'published' }
    const previousDoc = { id: 'art-1', _status: 'published' }

    const result = await afterArticleChange({
      doc,
      previousDoc,
      data: {},
      req: { payload: mockPayload, context: {} } as any,
      context: {},
      operation: 'update',
      collection: {} as any,
    } as any)

    expect(result).toBe(doc)
    expect(enqueueSpy).not.toHaveBeenCalled()
  })

  it('bypasses execution if newsletterPublishedAt is already stamped', async () => {
    const doc = {
      id: 'art-1',
      _status: 'published',
      newsletterPublishedAt: '2026-01-01T00:00:00.000Z',
    }
    const previousDoc = { id: 'art-1', _status: 'draft' }

    const result = await afterArticleChange({
      doc,
      previousDoc,
      data: {},
      req: { payload: mockPayload, context: {} } as any,
      context: {},
      operation: 'update',
      collection: {} as any,
    } as any)

    expect(result).toBe(doc)
    expect(enqueueSpy).not.toHaveBeenCalled()
  })

  it('bypasses execution if a broadcast record already exists in database', async () => {
    mockPayload.find.mockResolvedValueOnce({ totalDocs: 1, docs: [{ id: 'existing-broadcast' }] })

    const doc = { id: 'art-1', _status: 'published' }
    const previousDoc = { id: 'art-1', _status: 'draft' }

    const result = await afterArticleChange({
      doc,
      previousDoc,
      data: {},
      req: { payload: mockPayload, context: {} } as any,
      context: {},
      operation: 'update',
      collection: {} as any,
    } as any)

    expect(result).toBe(doc)
    expect(enqueueSpy).not.toHaveBeenCalled()
  })

  it('enqueues newsletter and stamps newsletterPublishedAt on genuine first publication', async () => {
    const doc = { id: 'art-100', _status: 'published' }
    const previousDoc = { id: 'art-100', _status: 'draft' }

    const result = await afterArticleChange({
      doc,
      previousDoc,
      data: {},
      req: { payload: mockPayload, context: {} } as any,
      context: {},
      operation: 'update',
      collection: {} as any,
    } as any)

    expect(result).toBe(doc)
    expect(enqueueSpy).toHaveBeenCalledWith(mockPayload, 'art-100')
    expect(mockPayload.update).toHaveBeenCalledWith({
      collection: 'articles',
      id: 'art-100',
      data: {
        newsletterPublishedAt: expect.any(String),
      },
      overrideAccess: true,
    })
  })
})
