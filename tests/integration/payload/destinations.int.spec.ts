import crypto from 'crypto'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload
const runId = crypto.randomUUID().slice(0, 8)
let testMediaId: string
const createdDestinationIds: Array<string | number> = []

describe('Integration: Payload Destinations Operations', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    const media = await payload.find({ collection: 'media', limit: 1, overrideAccess: true })
    if (media.docs[0]) {
      testMediaId = String(media.docs[0].id)
    } else {
      const m = await payload.create({
        collection: 'media',
        data: { alt: 'Destination hero' },
        file: {
          data: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64',
          ),
          mimetype: 'image/png',
          name: `dest-hero-${runId}.png`,
          size: 68,
        },
        overrideAccess: true,
      })
      testMediaId = String(m.id)
    }
  })

  afterAll(async () => {
    if (createdDestinationIds.length > 0) {
      await payload.delete({
        collection: 'destinations',
        where: { id: { in: createdDestinationIds } },
        overrideAccess: true,
      })
    }
  })

  it('creates a destination with geographic coordinates and elevation', async () => {
    const dest = await payload.create({
      collection: 'destinations',
      data: {
        title: `Simien Mountains ${runId}`,
        slug: `simien-${runId}`,
        overview: 'Majestic mountain ranges and endemic wildlife.',
        region: 'amhara',
        heroImage: testMediaId,
        coordinates: {
          latitude: 13.1833,
          longitude: 38.0667,
        },
        travelInfo: {
          altitudeMeters: 4533,
          bestTimeToVisit: 'October to March',
          isUnescoSite: true,
        },
      },
      overrideAccess: true,
    })
    createdDestinationIds.push(dest.id)

    expect(dest.id).toBeDefined()
    expect(dest.region).toBe('amhara')
    expect(dest.coordinates?.latitude).toBe(13.1833)
    expect(dest.coordinates?.longitude).toBe(38.0667)
    expect(dest.travelInfo?.altitudeMeters).toBe(4533)
    expect(dest.travelInfo?.isUnescoSite).toBe(true)
  })

  it('queries destinations filtering by region', async () => {
    const results = await payload.find({
      collection: 'destinations',
      where: {
        id: { in: createdDestinationIds },
        region: { equals: 'amhara' },
      },
      overrideAccess: true,
    })

    expect(results.totalDocs).toBeGreaterThanOrEqual(1)
    expect(results.docs[0].region).toBe('amhara')
  })

  it('supports below-sea-level elevation for depression destinations', async () => {
    const danakil = await payload.create({
      collection: 'destinations',
      data: {
        title: `Danakil Depression ${runId}`,
        slug: `danakil-${runId}`,
        overview: 'One of the hottest and lowest places on Earth.',
        region: 'afar',
        heroImage: testMediaId,
        coordinates: {
          latitude: 14.2417,
          longitude: 40.3,
        },
        travelInfo: {
          altitudeMeters: -125,
          isUnescoSite: false,
        },
      },
      overrideAccess: true,
    })
    createdDestinationIds.push(danakil.id)

    expect(danakil.id).toBeDefined()
    expect(danakil.travelInfo?.altitudeMeters).toBe(-125)
  })
})
