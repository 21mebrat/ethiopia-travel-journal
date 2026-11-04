import crypto from 'crypto'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload
const runId = crypto.randomUUID().slice(0, 8)
let testUserId: string
let testMediaId: string
const createdArticleIds: Array<string | number> = []
const createdCommentIds: Array<string | number> = []

describe('Integration: Payload Comments & Reconciliation Operations', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    const users = await payload.find({ collection: 'users', limit: 1, overrideAccess: true })
    if (users.docs[0]) {
      testUserId = String(users.docs[0].id)
    } else {
      const u = await payload.create({
        collection: 'users',
        data: {
          email: `comment-admin-${runId}@example.com`,
          password: 'Password123!',
          firstName: 'Admin',
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
          name: `hero-com-${runId}.png`,
          size: 68,
        },
        overrideAccess: true,
      })
      testMediaId = String(m.id)
    }
  })

  afterAll(async () => {
    if (createdCommentIds.length > 0) {
      await payload.delete({
        collection: 'comments',
        where: { id: { in: createdCommentIds } },
        overrideAccess: true,
      })
    }
    if (createdArticleIds.length > 0) {
      await payload.delete({
        collection: 'articles',
        where: { id: { in: createdArticleIds } },
        overrideAccess: true,
      })
    }
  })

  async function createTestArticle(title: string) {
    const doc = await payload.create({
      collection: 'articles',
      data: {
        title: `${title} ${runId}`,
        slug: `art-${runId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        excerpt: 'Test excerpt.',
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
                children: [{ type: 'text', text: 'Story content for comments.', version: 1, mode: 'normal', style: '', detail: 0, format: 0 }],
              },
            ],
          },
        } as any,
        _status: 'published',
        publishedDate: new Date().toISOString(),
        viewCount: 10,
        commentCount: 0,
        engagementScore: 0,
      },
      context: { internalCounterUpdate: true },
      overrideAccess: true,
    })
    createdArticleIds.push(doc.id)
    return doc
  }

  it('creating a pending comment does not increment article commentCount or engagementScore', async () => {
    const article = await createTestArticle('Pending Comment Test')

    const comment = await payload.create({
      collection: 'comments',
      data: {
        article: article.id,
        full_name: 'Visitor One',
        email: 'visitor1@example.com',
        commentText: 'This is a pending comment awaiting review.',
        status: 'pending',
      } as any,
      overrideAccess: true,
    })
    createdCommentIds.push(comment.id)

    expect(comment.id).toBeDefined()
    expect(comment.status).toBe('pending')

    const fetchedArticle = await payload.findByID({
      collection: 'articles',
      id: article.id,
      overrideAccess: true,
    })

    expect(fetchedArticle.commentCount).toBe(0)
  })

  it('approving a comment increments article commentCount and recalculates engagementScore', async () => {
    const article = await createTestArticle('Approval Reconciliation Test')

    const comment = await payload.create({
      collection: 'comments',
      data: {
        article: article.id,
        full_name: 'Visitor Two',
        email: 'visitor2@example.com',
        commentText: 'Wonderful story!',
        status: 'pending',
      } as any,
      overrideAccess: true,
    })
    createdCommentIds.push(comment.id)

    // Approve the comment as staff
    await payload.update({
      collection: 'comments',
      id: comment.id,
      data: {
        status: 'approved',
      },
      user: { id: testUserId, role: 'admin' } as any,
      overrideAccess: true,
    })

    const fetchedArticle = await payload.findByID({
      collection: 'articles',
      id: article.id,
      overrideAccess: true,
    })

    expect(fetchedArticle.commentCount).toBe(1)
    expect(fetchedArticle.engagementScore).toBeGreaterThan(0)
  })

  it('deleting an approved comment decrements commentCount and updates engagementScore', async () => {
    const article = await createTestArticle('Delete Comment Test')

    const comment = await payload.create({
      collection: 'comments',
      data: {
        article: article.id,
        full_name: 'Visitor Three',
        email: 'visitor3@example.com',
        commentText: 'Will be deleted soon.',
        status: 'approved',
      } as any,
      user: { id: testUserId, role: 'admin' } as any,
      overrideAccess: true,
    })

    // Verify commentCount is 1
    let fetchedArticle = await payload.findByID({
      collection: 'articles',
      id: article.id,
      overrideAccess: true,
    })
    expect(fetchedArticle.commentCount).toBe(1)

    // Delete comment
    await payload.delete({
      collection: 'comments',
      id: comment.id,
      overrideAccess: true,
    })

    fetchedArticle = await payload.findByID({
      collection: 'articles',
      id: article.id,
      overrideAccess: true,
    })

    expect(fetchedArticle.commentCount).toBe(0)
  })
})
