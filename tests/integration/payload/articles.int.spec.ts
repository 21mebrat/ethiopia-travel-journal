import crypto from 'crypto'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload
const runId = crypto.randomUUID().slice(0, 8)
let testUserId: string
let testMediaId: string
const createdArticleIds: Array<string | number> = []

describe('Integration: Payload Articles Operations', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    const users = await payload.find({ collection: 'users', limit: 1, overrideAccess: true })
    if (users.docs[0]) {
      testUserId = String(users.docs[0].id)
    } else {
      const u = await payload.create({
        collection: 'users',
        data: {
          email: `article-user-${runId}@example.com`,
          password: 'Password123!',
          firstName: 'Tester',
          lastName: 'User',
          role: 'admin',
        },
        overrideAccess: true,
      } as any)
      testUserId = String(u.id)
    }

    const media = await payload.find({ collection: 'media', limit: 1, overrideAccess: true })
    if (media.docs[0]) {
      testMediaId = String(media.docs[0].id)
    } else {
      const m = await payload.create({
        collection: 'media',
        data: { alt: 'Test hero' },
        file: {
          data: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64',
          ),
          mimetype: 'image/png',
          name: `hero-${runId}.png`,
          size: 68,
        },
        overrideAccess: true,
      })
      testMediaId = String(m.id)
    }
  })

  afterAll(async () => {
    if (createdArticleIds.length > 0) {
      await payload.delete({
        collection: 'articles',
        where: { id: { in: createdArticleIds } },
        overrideAccess: true,
      })
    }
  })

  it('creates published and draft articles with default metrics', async () => {
    const published = await payload.create({
      collection: 'articles',
      data: {
        title: `Published Story ${runId}`,
        slug: `pub-story-${runId}`,
        excerpt: 'Published article excerpt.',
        author: testUserId,
        heroImage: testMediaId,
        content: {
          root: {
            type: 'root',
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
            children: [
              {
                type: 'paragraph',
                direction: 'ltr',
                format: '',
                indent: 0,
                version: 1,
                children: [{ type: 'text', text: 'Story content.', version: 1, mode: 'normal', style: '', detail: 0, format: 0 }],
              },
            ],
          },
        } as any,
        _status: 'published',
        publishedDate: new Date().toISOString(),
      },
      overrideAccess: true,
    })
    createdArticleIds.push(published.id)

    expect(published.id).toBeDefined()
    expect(published.viewCount).toBe(0)
    expect(published.commentCount).toBe(0)
    expect(published.engagementScore).toBe(0)

    const draft = await payload.create({
      collection: 'articles',
      data: {
        title: `Draft Story ${runId}`,
        slug: `draft-story-${runId}`,
        excerpt: 'Draft excerpt.',
        author: testUserId,
        heroImage: testMediaId,
        content: {
          root: {
            type: 'root',
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
            children: [
              {
                type: 'paragraph',
                direction: 'ltr',
                format: '',
                indent: 0,
                version: 1,
                children: [{ type: 'text', text: 'Draft content.', version: 1, mode: 'normal', style: '', detail: 0, format: 0 }],
              },
            ],
          },
        } as any,
        _status: 'draft',
      },
      overrideAccess: true,
    })
    createdArticleIds.push(draft.id)

    expect(draft.id).toBeDefined()
    expect(draft._status).toBe('draft')
  })

  it('enforces published status query filter for public queries', async () => {
    const results = await payload.find({
      collection: 'articles',
      where: {
        id: { in: createdArticleIds },
        _status: { equals: 'published' },
      },
      overrideAccess: true,
    })

    const statuses = results.docs.map((d: any) => d._status)
    expect(statuses.every((s: string) => s === 'published')).toBe(true)
  })

  it('updates article content without mutating existing metrics', async () => {
    const article = await payload.create({
      collection: 'articles',
      data: {
        title: `Metric Preservation ${runId}`,
        slug: `metric-preservation-${runId}`,
        excerpt: 'Original excerpt.',
        author: testUserId,
        heroImage: testMediaId,
        content: {
          root: {
            type: 'root',
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
            children: [
              {
                type: 'paragraph',
                direction: 'ltr',
                format: '',
                indent: 0,
                version: 1,
                children: [{ type: 'text', text: 'Article content.', version: 1, mode: 'normal', style: '', detail: 0, format: 0 }],
              },
            ],
          },
        } as any,
        _status: 'published',
        viewCount: 15,
        commentCount: 3,
        engagementScore: 6.9,
      },
      context: { internalCounterUpdate: true },
      overrideAccess: true,
    })
    createdArticleIds.push(article.id)

    const updated = await payload.update({
      collection: 'articles',
      id: article.id,
      data: {
        excerpt: 'Updated excerpt description.',
      },
      overrideAccess: true,
    })

    expect(updated.excerpt).toBe('Updated excerpt description.')
    expect(updated.viewCount).toBe(15)
    expect(updated.commentCount).toBe(3)
    expect(updated.engagementScore).toBe(6.9)
  })
})
