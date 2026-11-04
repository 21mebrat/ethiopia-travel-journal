import crypto from 'crypto'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { isCloudinaryConfigured } from '@/lib/media/cloudinary'

let payload: Payload
const runId = crypto.randomUUID().slice(0, 8)
const createdMediaIds: Array<string | number> = []

describe('Integration: Media Collection & Cloudinary Readiness', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    if (createdMediaIds.length > 0) {
      await payload.delete({
        collection: 'media',
        where: { id: { in: createdMediaIds } },
        overrideAccess: true,
      })
    }
  })

  it('correctly determines whether Cloudinary is configured or in placeholder mode', () => {
    const isConfigured = isCloudinaryConfigured()
    expect(typeof isConfigured).toBe('boolean')
    // If real credentials are provided by user, isConfigured is true; otherwise false
    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME.includes('your_cloud_name')) {
      expect(isConfigured).toBe(false)
    } else {
      expect(isConfigured).toBe(true)
    }
  })

  it('allows media creation with valid storage adapter', async () => {
    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    )

    const mediaDoc = await payload.create({
      collection: 'media',
      data: {
        alt: `Test Media ${runId}`,
        caption: 'Caption for test media',
      },
      file: {
        data: png1x1,
        mimetype: 'image/png',
        name: `test-media-${runId}.png`,
        size: png1x1.length,
      },
      overrideAccess: true,
    })

    expect(mediaDoc).toBeDefined()
    expect(mediaDoc.id).toBeDefined()
    expect(mediaDoc.filename).toContain(`test-media-${runId}`)
    createdMediaIds.push(mediaDoc.id)

    // Verify fields exist in schema
    const fetched = await payload.findByID({
      collection: 'media',
      id: mediaDoc.id,
      overrideAccess: true,
    })
    expect(fetched.alt).toBe(`Test Media ${runId}`)
    expect(fetched.caption).toBe('Caption for test media')
    // verify cloudinary fields are registered on the media collection schema
    const mediaFields = (payload.collections['media'].config.fields as any[]).map((f) => f.name)
    expect(mediaFields).toContain('cloudinaryPublicId')
    expect(mediaFields).toContain('cloudinaryUrl')

    // If Cloudinary is active, public ID is set; if local fallback, it remains empty
    if (isCloudinaryConfigured()) {
      expect(fetched.cloudinaryPublicId).toBeTruthy()
    } else {
      expect(fetched.cloudinaryPublicId).toBeFalsy()
    }
  })

  it('cleanly deletes media without errors', async () => {
    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    )

    const doc = await payload.create({
      collection: 'media',
      data: {
        alt: `Delete Test ${runId}`,
      },
      file: {
        data: png1x1,
        mimetype: 'image/png',
        name: `delete-test-${runId}.png`,
        size: png1x1.length,
      },
      overrideAccess: true,
    })

    const deleteRes = await payload.delete({
      collection: 'media',
      id: doc.id,
      overrideAccess: true,
    })

    expect(deleteRes).toBeDefined()
  })
})
