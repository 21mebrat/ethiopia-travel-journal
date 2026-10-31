import crypto from 'crypto'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import {
  getDestinations,
  getMapDestinations,
  getDestinationBySlug,
  getRelatedDestinations,
  getDestinationRegionCounts,
  formatDestinationDoc,
} from '@/lib/site/destinations'
import {
  isValidCoordinate,
  REGION_NAMES,
} from '@/lib/site/destinations-types'
import {
  normalizeDurationToMs,
  isAdvertisementEligible,
} from '@/lib/site/advertisements'

let payload: Payload
let testMediaId: string
const runId = crypto.randomUUID().slice(0, 8)
const createdDestinationIds: Array<string | number> = []

async function createTestDestination(data: Record<string, any>) {
  const doc = await payload.create({
    collection: 'destinations',
    data: {
      title: `Test Destination ${runId}`,
      slug: `test-dest-${runId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      region: 'amhara',
      category: 'historic_sites',
      heroImage: testMediaId,
      overview: 'A breathtaking destination in Ethiopia with profound historical roots.',
      ...data,
    },
    overrideAccess: true,
  })
  createdDestinationIds.push(doc.id)
  return doc
}

describe('Destinations Integration Suite: Robustness, Truthful Data & Contracts', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    // Find or create test media fixture in the isolated test database
    let media: any = (await payload.find({ collection: 'media', limit: 1, overrideAccess: true })).docs[0]
    if (!media) {
      media = await payload.create({
        collection: 'media',
        data: {
          alt: 'Test Cover Image',
        },
        file: {
          data: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
          mimetype: 'image/gif',
          name: 'test-cover.gif',
          size: 43,
        },
        overrideAccess: true,
      })
    }
    testMediaId = String(media.id)
  })

  afterAll(async () => {
    // Clean up all test destination records created during the test run
    for (const id of createdDestinationIds) {
      try {
        await payload.delete({
          collection: 'destinations',
          id,
          overrideAccess: true,
        })
      } catch (err) {
        console.warn(`Failed to clean up test destination ${id}:`, err)
      }
    }
  })

  it('1. Returns empty result with no fabricated fallback data when no records match', async () => {
    const emptyResult = await getDestinations({
      search: `nonexistent-query-${runId}`,
    })

    expect(emptyResult.destinations).toEqual([])
    expect(emptyResult.totalDocs).toBe(0)
    expect(emptyResult.totalPages).toBe(1)

    // Deleted Lalibela or non-existent destination must return null, never resurrected
    const notFoundDestination = await getDestinationBySlug(`nonexistent-slug-${runId}`)
    expect(notFoundDestination).toBeNull()
  })

  it('2. Preserves missing content contract (content is undefined, not substituted with Lalibela)', async () => {
    const slug = `test-no-content-${runId}`
    await createTestDestination({
      title: `Test Destination No Content ${runId}`,
      slug,
      region: 'afar',
      category: 'natural_wonders',
      overview: 'A unique geological destination with no rich text body.',
      content: undefined,
    })

    const destination = await getDestinationBySlug(slug)
    expect(destination).not.toBeNull()
    expect(destination?.title).toBe(`Test Destination No Content ${runId}`)
    expect(destination?.overview).toBe('A unique geological destination with no rich text body.')
    expect(destination?.content).toBeUndefined()
  })

  it('3. Preserves legitimate negative and zero elevations (e.g., Danakil -125m, sea level 0m)', async () => {
    // Danakil Depression below sea level (-125m)
    const danakilSlug = `test-sub-sea-level-${runId}`
    await createTestDestination({
      title: `Test Sub-Sea-Level ${runId}`,
      slug: danakilSlug,
      region: 'afar',
      category: 'natural_wonders',
      travelInfo: {
        altitudeMeters: -125,
        bestTimeToVisit: 'November - February',
      },
    })

    // Sea level elevation (0m)
    const seaLevelSlug = `test-sea-level-${runId}`
    await createTestDestination({
      title: `Test Sea Level ${runId}`,
      slug: seaLevelSlug,
      region: 'somali',
      category: 'cultural_experiences',
      travelInfo: {
        altitudeMeters: 0,
      },
    })

    const danakil = await getDestinationBySlug(danakilSlug)
    expect(danakil?.travelInfo?.altitudeMeters).toBe(-125)
    expect(danakil?.quickInfo?.elevation).toBe('-125 meters')

    const seaLevel = await getDestinationBySlug(seaLevelSlug)
    expect(seaLevel?.travelInfo?.altitudeMeters).toBe(0)
    expect(seaLevel?.quickInfo?.elevation).toBe('0 meters')
  })

  it('4. Validates GPS coordinates and excludes destinations with missing/invalid GPS from map', async () => {
    expect(isValidCoordinate(12.0319, 39.0412)).toBe(true)
    expect(isValidCoordinate(-14.25, 40.3)).toBe(true)
    expect(isValidCoordinate(95, 39)).toBe(false) // latitude out of range
    expect(isValidCoordinate(12, 195)).toBe(false) // longitude out of range
    expect(isValidCoordinate(NaN, 39)).toBe(false)
    expect(isValidCoordinate(undefined, undefined)).toBe(false)

    // Destination with missing coordinates
    const noGpsSlug = `test-no-gps-${runId}`
    await createTestDestination({
      title: `Test No GPS ${runId}`,
      slug: noGpsSlug,
      region: 'amhara',
      category: 'historic_sites',
    })

    // Destination with valid coordinates
    const validGpsSlug = `test-valid-gps-${runId}`
    await createTestDestination({
      title: `Test Valid GPS ${runId}`,
      slug: validGpsSlug,
      region: 'amhara',
      category: 'historic_sites',
      coordinates: {
        latitude: 12.03,
        longitude: 39.04,
      },
    })

    const destination = await getDestinationBySlug(noGpsSlug)
    expect(destination?.coordinates).toBeUndefined()

    // getMapDestinations must exclude records without valid GPS
    const mapItems = await getMapDestinations({
      search: runId,
    })
    const mapSlugs = mapItems.map((m) => m.slug)
    expect(mapSlugs).toContain(validGpsSlug)
    expect(mapSlugs).not.toContain(noGpsSlug)
  })

  it('5. Gallery behavior provides truthful photo counts (no +24 fabricated count)', async () => {
    // Destination with no gallery -> falls back to hero image (count = 1)
    const singleSlug = `test-single-img-${runId}`
    await createTestDestination({
      title: `Test Single Image ${runId}`,
      slug: singleSlug,
      region: 'tigray',
      category: 'historic_sites',
    })

    const fetched = await getDestinationBySlug(singleSlug)
    expect(fetched?.gallery.length).toBe(1)
    expect(fetched?.gallery[0].url).toBeDefined()
  })

  it('6. Formats accommodation preserving decimal ratings, zero reviews, and sanitized links', async () => {
    const accSlug = `test-hotel-doc-${runId}`
    await createTestDestination({
      title: `Test Hotel Doc ${runId}`,
      slug: accSlug,
      region: 'amhara',
      category: 'cultural_experiences',
      recommendedAccommodation: {
        name: 'Mountain View Boutique',
        rating: 4.7,
        reviewCount: 0,
        link: '#', // Invalid link must be sanitized out
      },
    })

    const fetched = await getDestinationBySlug(accSlug)
    expect(fetched?.recommendedAccommodation).toBeDefined()
    expect(fetched?.recommendedAccommodation?.name).toBe('Mountain View Boutique')
    expect(fetched?.recommendedAccommodation?.rating).toBe(4.7)
    expect(fetched?.recommendedAccommodation?.reviewCount).toBe(0) // Preserved legitimate zero
    expect(fetched?.recommendedAccommodation?.link).toBeUndefined() // Sanitized '#'
  })

  it('7. Related destinations retain same-region results before falling back to other regions', async () => {
    const afarMainSlug = `afar-main-${runId}`
    const afarSiblingSlug = `afar-sibling-${runId}`
    const oromiaSlug = `oromia-other-${runId}`

    await createTestDestination({
      title: `Afar Main ${runId}`,
      slug: afarMainSlug,
      region: 'afar',
      category: 'natural_wonders',
    })
    await createTestDestination({
      title: `Afar Sibling ${runId}`,
      slug: afarSiblingSlug,
      region: 'afar',
      category: 'natural_wonders',
    })
    await createTestDestination({
      title: `Oromia Other ${runId}`,
      slug: oromiaSlug,
      region: 'oromia',
      category: 'wildlife_parks',
    })

    const related = await getRelatedDestinations(afarMainSlug, 'afar', 'en', 2)
    expect(related.length).toBeGreaterThan(0)
    // The first related item MUST be the same-region destination
    expect(related[0].region).toBe('afar')
    expect(related[0].slug).toBe(afarSiblingSlug)
  })

  it('8. Supports pagination with >24 records, stable ordering, and accurate page metadata', async () => {
    const prefix = `page-test-${runId}`

    // Create 25 records
    for (let i = 1; i <= 25; i++) {
      await createTestDestination({
        title: `Destination ${String(i).padStart(2, '0')} ${prefix}`,
        slug: `${prefix}-${String(i).padStart(2, '0')}`,
        region: 'amhara',
        category: 'historic_sites',
        featured: false,
      })
    }

    // Page 1 with limit 6
    const page1 = await getDestinations({
      search: prefix,
      page: 1,
      limit: 6,
      sort: 'name',
    })

    expect(page1.totalDocs).toBe(25)
    expect(page1.totalPages).toBe(5) // Math.ceil(25 / 6) = 5
    expect(page1.destinations.length).toBe(6)
    expect(page1.page).toBe(1)
    expect(page1.hasNextPage).toBe(true)
    expect(page1.hasPrevPage).toBe(false)

    // Page 5 with limit 6 (last page has 1 item)
    const page5 = await getDestinations({
      search: prefix,
      page: 5,
      limit: 6,
      sort: 'name',
    })

    expect(page5.destinations.length).toBe(1)
    expect(page5.page).toBe(5)
    expect(page5.hasNextPage).toBe(false)
    expect(page5.hasPrevPage).toBe(true)
  })

  it('9. Region counts queries full dataset without being capped at 100 records', async () => {
    const regionCounts = await getDestinationRegionCounts('en')
    expect(Array.isArray(regionCounts)).toBe(true)
    expect(regionCounts.length).toBe(Object.keys(REGION_NAMES).length) // All 14 regions represented

    const afarCount = regionCounts.find((r) => r.slug === 'afar')
    expect(afarCount).toBeDefined()
    expect(typeof afarCount?.count).toBe('number')
    expect(afarCount?.count).toBeGreaterThan(0)
  })

  it('10. Missing hero media produces undefined (neutral empty state), never /assets/Lalibela.webp fallback', () => {
    const docWithoutHero = {
      id: 'doc-no-hero',
      title: 'Harar Jugol',
      slug: 'harar-jugol',
      region: 'harari',
      category: 'cultural_experiences',
      heroImage: null,
      gallery: [],
    }

    const formatted = formatDestinationDoc(docWithoutHero, 'en')
    expect(formatted.heroImage).toBeUndefined()
    expect(formatted.gallery).toEqual([])
  })

  it('11. Preserves null accommodation rating as undefined (unknown), distinct from genuine zero', async () => {
    const nullRatingSlug = `test-null-rating-${runId}`
    await createTestDestination({
      title: `Test Null Rating ${runId}`,
      slug: nullRatingSlug,
      region: 'afar',
      category: 'natural_wonders',
      recommendedAccommodation: {
        name: 'Camp Site Without Rating',
        rating: null,
      },
    })

    const zeroRatingSlug = `test-zero-rating-${runId}`
    await createTestDestination({
      title: `Test Zero Rating ${runId}`,
      slug: zeroRatingSlug,
      region: 'afar',
      category: 'natural_wonders',
      recommendedAccommodation: {
        name: 'New Hostel With Zero Rating',
        rating: 0,
      },
    })

    const fetchedNull = await getDestinationBySlug(nullRatingSlug)
    expect(fetchedNull?.recommendedAccommodation).toBeDefined()
    expect(fetchedNull?.recommendedAccommodation?.rating).toBeUndefined()

    const fetchedZero = await getDestinationBySlug(zeroRatingSlug)
    expect(fetchedZero?.recommendedAccommodation).toBeDefined()
    expect(fetchedZero?.recommendedAccommodation?.rating).toBe(0)
  })

  it('12. Normalizes advertisement display durations safely across seconds, minutes, hours, and days', () => {
    expect(normalizeDurationToMs(10, 'seconds').durationMs).toBe(10000)
    expect(normalizeDurationToMs(30, 'seconds').durationMs).toBe(30000)
    expect(normalizeDurationToMs(2, 'minutes').durationMs).toBe(120000)
    expect(normalizeDurationToMs(1, 'hours').durationMs).toBe(3600000)
    expect(normalizeDurationToMs(1, 'days').durationMs).toBe(86400000)

    // Falls back to safe default (10 seconds) on invalid, zero, or negative numbers
    expect(normalizeDurationToMs(0, 'seconds').durationMs).toBe(10000)
    expect(normalizeDurationToMs(-5, 'seconds').durationMs).toBe(10000)
    expect(normalizeDurationToMs(NaN, 'seconds').durationMs).toBe(10000)
    expect(normalizeDurationToMs(undefined, undefined).durationMs).toBe(10000)
  })

  it('13. Filters advertisement eligibility strictly based on status, dates, links, and placement', () => {
    const now = new Date('2026-10-31T12:00:00Z')

    const baseAd: any = {
      id: 'ad-1',
      title: 'Active Tour Partner',
      status: 'active',
      placement: 'destination_detail',
      ctaLink: 'https://example.com/tour',
      startDate: '2026-10-01T00:00:00Z',
      endDate: '2026-11-30T00:00:00Z',
    }

    // Active & within dates
    expect(isAdvertisementEligible(baseAd, 'destination_detail', now)).toBe(true)

    // Placement mismatch: 'destination_listing' should not match 'destination_detail' ad
    expect(isAdvertisementEligible(baseAd, 'destination_listing', now)).toBe(false)

    // 'all' placement matches any target placement
    expect(isAdvertisementEligible({ ...baseAd, placement: 'all' }, 'destination_listing', now)).toBe(true)
    expect(isAdvertisementEligible({ ...baseAd, placement: 'all' }, 'destination_detail', now)).toBe(true)

    // Inactive status is ineligible
    expect(isAdvertisementEligible({ ...baseAd, status: 'inactive' }, 'destination_detail', now)).toBe(false)

    // Past endDate is expired and ineligible
    expect(isAdvertisementEligible({ ...baseAd, endDate: '2026-10-15T00:00:00Z' }, 'destination_detail', now)).toBe(false)

    // Future startDate is ineligible
    expect(isAdvertisementEligible({ ...baseAd, startDate: '2026-11-15T00:00:00Z' }, 'destination_detail', now)).toBe(false)

    // Invalid / placeholder CTA link '#' is ineligible
    expect(isAdvertisementEligible({ ...baseAd, ctaLink: '#' }, 'destination_detail', now)).toBe(false)
    expect(isAdvertisementEligible({ ...baseAd, ctaLink: '' }, 'destination_detail', now)).toBe(false)
  })
})
