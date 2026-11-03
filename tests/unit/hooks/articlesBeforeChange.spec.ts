import { describe, it, expect } from 'vitest'
import { Articles } from '@/collections/Articles'

describe('Unit: Articles beforeChange Hook', () => {
  const beforeChangeHook = Articles.hooks?.beforeChange?.[0]

  it('hook is defined on Articles collection', () => {
    expect(typeof beforeChangeHook).toBe('function')
  })

  it('resets engagement metrics to 0 on new unprivileged article creation', async () => {
    const data: any = {
      title: 'Hacked Metrics Article',
      viewCount: 99999,
      commentCount: 500,
      engagementScore: 10000,
    }

    const result = await (beforeChangeHook as any)({
      data,
      originalDoc: null,
      req: {
        user: null,
        payloadAPI: 'REST',
        context: { isPublicSubmission: true },
      },
    })

    expect(result.viewCount).toBe(0)
    expect(result.commentCount).toBe(0)
    expect(result.engagementScore).toBe(0)
  })

  it('reverts engagement metrics to originalDoc values on unprivileged update', async () => {
    const originalDoc = {
      id: 'art-1',
      title: 'Original Title',
      viewCount: 42,
      commentCount: 5,
      engagementScore: 57,
    }

    const data: any = {
      title: 'Attempted Metric Tampering',
      viewCount: 99999,
      commentCount: 500,
      engagementScore: 10000,
    }

    const result = await (beforeChangeHook as any)({
      data,
      originalDoc,
      req: {
        user: null,
        payloadAPI: 'REST',
        context: {},
      },
    })

    expect(result.viewCount).toBe(42)
    expect(result.commentCount).toBe(5)
    expect(result.engagementScore).toBe(57)
  })

  it('allows metric updates when internalCounterUpdate context is present', async () => {
    const originalDoc = {
      id: 'art-1',
      viewCount: 10,
      commentCount: 2,
      engagementScore: 16,
    }

    const data: any = {
      viewCount: 11,
      commentCount: 3,
      engagementScore: 20,
    }

    const result = await (beforeChangeHook as any)({
      data,
      originalDoc,
      req: {
        user: null,
        context: { internalCounterUpdate: true },
      },
    })

    expect(result.viewCount).toBe(11)
    expect(result.commentCount).toBe(3)
    expect(result.engagementScore).toBe(20)
  })

  it('allows metric updates when performed by an admin user', async () => {
    const data: any = {
      viewCount: 100,
      commentCount: 10,
      engagementScore: 130,
    }

    const result = await (beforeChangeHook as any)({
      data,
      originalDoc: { viewCount: 0, commentCount: 0, engagementScore: 0 },
      req: {
        user: { role: 'admin' },
        context: {},
      },
    })

    expect(result.viewCount).toBe(100)
    expect(result.commentCount).toBe(10)
    expect(result.engagementScore).toBe(130)
  })
})
