import { getPayload } from 'payload'
import config from '@/payload.config'
import type { SiteLocale } from '@/lib/site/locale'
import {
  type DestinationItem,
  type RegionCount,
  type PaginatedDestinationsResult,
  isValidCoordinate,
  getRegionName,
  getCategoryName,
  CATEGORIES_LIST,
  REGIONS_LIST,
  REGION_NAMES,
  CATEGORY_NAMES,
} from './destinations-types'

export type { DestinationItem, RegionCount, PaginatedDestinationsResult }
export {
  getRegionName,
  getCategoryName,
  CATEGORIES_LIST,
  REGIONS_LIST,
  REGION_NAMES,
  CATEGORY_NAMES,
  isValidCoordinate,
}

export type DestinationsQueryParams = {
  region?: string
  category?: string
  sort?: string
  search?: string
  locale?: SiteLocale
  limit?: number
  page?: number
}

export function formatDestinationDoc(doc: any, locale: SiteLocale): DestinationItem {
  const regionSlug = doc.region || ''
  const categorySlug = doc.category || ''

  const heroUrl =
    typeof doc.heroImage === 'object' && doc.heroImage?.url
      ? doc.heroImage.url
      : typeof doc.heroImage === 'string' && doc.heroImage.startsWith('/')
        ? doc.heroImage
        : undefined

  const heroAlt =
    typeof doc.heroImage === 'object' && doc.heroImage?.alt
      ? doc.heroImage.alt
      : doc.title || ''

  // Parse tags
  const parsedTags: string[] = []
  if (typeof doc.tags === 'string' && doc.tags.trim()) {
    parsedTags.push(
      ...doc.tags
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean),
    )
  } else if (Array.isArray(doc.tags)) {
    parsedTags.push(...doc.tags.filter(Boolean))
  } else {
    if (doc.travelInfo?.isUnescoSite) parsedTags.push('UNESCO Site')
    if (categorySlug) parsedTags.push(getCategoryName(categorySlug, locale))
  }

  // Gallery formatting: use genuine gallery if present, otherwise use genuine hero image
  const galleryItems: Array<{ url: string; alt: string; caption?: string }> = []
  if (Array.isArray(doc.gallery) && doc.gallery.length > 0) {
    for (const g of doc.gallery) {
      const gUrl =
        typeof g.image === 'object' && g.image?.url
          ? g.image.url
          : typeof g.image === 'string' && g.image.startsWith('/')
            ? g.image
            : null
      if (gUrl) {
        galleryItems.push({
          url: gUrl,
          alt: g.caption || doc.title || '',
          caption: g.caption || undefined,
        })
      }
    }
  }

  // If gallery is empty or absent, use the genuine hero image
  if (galleryItems.length === 0 && heroUrl) {
    galleryItems.push({
      url: heroUrl,
      alt: heroAlt || doc.title || '',
      caption: doc.title || undefined,
    })
  }

  // Coordinates validation: preserve null/undefined; never default to Lalibela
  const rawLat = doc.coordinates?.latitude
  const rawLng = doc.coordinates?.longitude
  const hasValidCoordinates = isValidCoordinate(rawLat, rawLng)

  const coordinates = hasValidCoordinates
    ? {
        latitude: Number(rawLat),
        longitude: Number(rawLng),
      }
    : undefined

  // Altitude validation: preserve legitimate zero and negative elevation (e.g. Danakil -125m)
  const rawAltitude = doc.travelInfo?.altitudeMeters
  const hasValidAltitude =
    typeof rawAltitude === 'number' && Number.isFinite(rawAltitude)
  const altitudeMeters = hasValidAltitude ? rawAltitude : undefined

  const bestTimeToVisit =
    typeof doc.travelInfo?.bestTimeToVisit === 'string' && doc.travelInfo.bestTimeToVisit.trim()
      ? doc.travelInfo.bestTimeToVisit.trim()
      : undefined

  const isUnescoSite =
    typeof doc.travelInfo?.isUnescoSite === 'boolean'
      ? doc.travelInfo.isUnescoSite
      : undefined

  const travelInfo =
    bestTimeToVisit !== undefined || altitudeMeters !== undefined || isUnescoSite !== undefined
      ? {
          bestTimeToVisit,
          altitudeMeters,
          isUnescoSite,
        }
      : undefined

  // Quick info formatting
  const mainAttractions =
    typeof doc.quickInfo?.mainAttractions === 'string' && doc.quickInfo.mainAttractions.trim()
      ? doc.quickInfo.mainAttractions.trim()
      : undefined

  const idealFor =
    typeof doc.quickInfo?.idealFor === 'string' && doc.quickInfo.idealFor.trim()
      ? doc.quickInfo.idealFor.trim()
      : undefined

  const visitDuration =
    typeof doc.quickInfo?.visitDuration === 'string' && doc.quickInfo.visitDuration.trim()
      ? doc.quickInfo.visitDuration.trim()
      : undefined

  const elevationStr =
    altitudeMeters !== undefined ? `${altitudeMeters.toLocaleString()} meters` : undefined

  const quickInfo = {
    region: regionSlug ? getRegionName(regionSlug, locale) : undefined,
    elevation: elevationStr,
    bestTime: bestTimeToVisit,
    mainAttractions,
    idealFor,
    visitDuration,
  }

  // Attractions formatting
  const attractionsItems: Array<{ name: string; description?: string; image?: { url: string; alt: string } }> = []
  if (Array.isArray(doc.attractions)) {
    for (const a of doc.attractions) {
      if (a && a.name) {
        const aUrl =
          typeof a.image === 'object' && a.image?.url
            ? a.image.url
            : typeof a.image === 'string' && a.image.startsWith('/')
              ? a.image
              : undefined

        attractionsItems.push({
          name: a.name,
          description: a.description || undefined,
          image: aUrl ? { url: aUrl, alt: a.name } : undefined,
        })
      }
    }
  }

  // Recommended accommodation formatting: preserve legitimate zero reviews and decimal rating
  let accommodation: DestinationItem['recommendedAccommodation'] = undefined
  if (doc.recommendedAccommodation && typeof doc.recommendedAccommodation.name === 'string' && doc.recommendedAccommodation.name.trim()) {
    const acc = doc.recommendedAccommodation
    const accUrl =
      typeof acc.image === 'object' && acc.image?.url
        ? acc.image.url
        : typeof acc.image === 'string' && acc.image.startsWith('/')
          ? acc.image
          : undefined

    const rawRating = acc.rating
    let rating: number | undefined = undefined
    if (rawRating !== null && rawRating !== undefined && rawRating !== '') {
      const parsed = typeof rawRating === 'number' ? rawRating : Number(rawRating)
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 5) {
        rating = parsed
      }
    }

    const rawReviews = Number(acc.reviewCount)
    const reviewCount = Number.isFinite(rawReviews) && rawReviews >= 0 ? rawReviews : 0

    const rawLink = typeof acc.link === 'string' ? acc.link.trim() : ''
    const link = rawLink && rawLink !== '#' ? rawLink : undefined

    accommodation = {
      name: acc.name.trim(),
      rating,
      reviewCount,
      category: acc.category || undefined,
      description: acc.description || undefined,
      image: accUrl ? { url: accUrl, alt: acc.name } : undefined,
      link,
    }
  }

  return {
    id: String(doc.id),
    title: doc.title || '',
    slug: doc.slug || '',
    region: regionSlug,
    regionName: regionSlug ? getRegionName(regionSlug, locale) : '',
    category: categorySlug,
    categoryName: categorySlug ? getCategoryName(categorySlug, locale) : '',
    tags: parsedTags,
    featured: Boolean(doc.featured),
    heroImage: heroUrl
      ? {
          url: heroUrl,
          alt: heroAlt,
        }
      : undefined,
    overview: doc.overview || '',
    content: doc.content || undefined,
    travelInfo,
    coordinates,
    quickInfo,
    attractions: attractionsItems.length > 0 ? attractionsItems : undefined,
    recommendedAccommodation: accommodation,
    gallery: galleryItems,
  }
}

/**
 * Fetch paginated destinations matching filters from Payload CMS
 */
export async function getDestinations(
  params: DestinationsQueryParams = {},
): Promise<PaginatedDestinationsResult> {
  const {
    region,
    category,
    sort = 'featured',
    search,
    locale = 'en',
    limit: rawLimit = 6,
    page: rawPage = 1,
  } = params

  const page = Math.max(1, Math.floor(Number(rawPage)) || 1)
  const limit = Math.max(1, Math.min(100, Math.floor(Number(rawLimit)) || 6))

  const payload = await getPayload({ config: await config })

  const whereConditions: any[] = []

  if (region && region !== 'all') {
    whereConditions.push({ region: { equals: region } })
  }

  if (category && category !== 'all') {
    whereConditions.push({ category: { equals: category } })
  }

  if (search && search.trim()) {
    const q = search.trim()
    whereConditions.push({
      or: [
        { title: { like: q } },
        { overview: { like: q } },
        { tags: { like: q } },
      ],
    })
  }

  const where = whereConditions.length > 0 ? ({ and: whereConditions } as any) : undefined

  let sortOption = '-featured'
  if (sort === 'alpha_asc' || sort === 'name') {
    sortOption = 'title'
  } else if (sort === 'alpha_desc') {
    sortOption = '-title'
  } else if (sort === 'altitude') {
    sortOption = '-travelInfo.altitudeMeters'
  } else if (sort === 'recent') {
    sortOption = '-createdAt'
  }

  const result = await payload.find({
    collection: 'destinations',
    where,
    sort: sortOption,
    limit,
    page,
    depth: 1,
    locale,
    fallbackLocale: 'en',
  })

  const items = result.docs.map((doc: any) => formatDestinationDoc(doc, locale))

  return {
    destinations: items,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages || 1,
    page: result.page || page,
    limit: result.limit || limit,
    hasNextPage: Boolean(result.hasNextPage),
    hasPrevPage: Boolean(result.hasPrevPage),
  }
}

/**
 * Fetch all matching destinations with verified GPS coordinates for the map modal.
 * This guarantees the map reflects all matching filtered destinations, not just the current page.
 */
export async function getMapDestinations(
  params: Omit<DestinationsQueryParams, 'limit' | 'page'> = {},
): Promise<DestinationItem[]> {
  const { region, category, search, locale = 'en' } = params

  const payload = await getPayload({ config: await config })

  const whereConditions: any[] = []

  if (region && region !== 'all') {
    whereConditions.push({ region: { equals: region } })
  }

  if (category && category !== 'all') {
    whereConditions.push({ category: { equals: category } })
  }

  if (search && search.trim()) {
    const q = search.trim()
    whereConditions.push({
      or: [
        { title: { like: q } },
        { overview: { like: q } },
        { tags: { like: q } },
      ],
    })
  }

  const where = whereConditions.length > 0 ? ({ and: whereConditions } as any) : undefined

  // Fetch all matching records through pagination/batching to prevent truncating at 100
  const allDocs: any[] = []
  let page = 1
  let hasNext = true

  while (hasNext) {
    const result = await payload.find({
      collection: 'destinations',
      where,
      limit: 100,
      page,
      depth: 1,
      locale,
      fallbackLocale: 'en',
      overrideAccess: true,
    })

    allDocs.push(...result.docs)
    hasNext = Boolean(result.hasNextPage)
    page++
  }

  // Return all matching destinations that have valid GPS coordinates
  return allDocs
    .map((doc: any) => formatDestinationDoc(doc, locale))
    .filter((d) => d.coordinates !== undefined)
}

/**
 * Fetch a single destination by slug. Returns null if not found.
 * Never falls back to hardcoded data.
 */
export async function getDestinationBySlug(
  slug: string,
  locale: SiteLocale = 'en',
): Promise<DestinationItem | null> {
  const payload = await getPayload({ config: await config })
  const result = await payload.find({
    collection: 'destinations',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
    locale,
    fallbackLocale: 'en',
  })

  if (result.docs.length > 0) {
    return formatDestinationDoc(result.docs[0], locale)
  }

  return null
}

/**
 * Fetch the featured destination for the sidebar widget.
 * Falls back to the latest destination in the database, or null if none exist.
 */
export async function getFeaturedDestination(
  locale: SiteLocale = 'en',
): Promise<DestinationItem | null> {
  const payload = await getPayload({ config: await config })
  const result = await payload.find({
    collection: 'destinations',
    where: { featured: { equals: true } },
    sort: '-updatedAt',
    limit: 1,
    depth: 1,
    locale,
    fallbackLocale: 'en',
  })

  if (result.docs.length > 0) {
    return formatDestinationDoc(result.docs[0], locale)
  }

  // If no destination is flagged featured, pick the most recent one
  const fallback = await payload.find({
    collection: 'destinations',
    sort: '-createdAt',
    limit: 1,
    depth: 1,
    locale,
    fallbackLocale: 'en',
  })

  if (fallback.docs.length > 0) {
    return formatDestinationDoc(fallback.docs[0], locale)
  }

  return null
}

/**
 * Fetch related destinations (excluding current slug).
 * Retains same-region related results when adding other recommendations.
 */
export async function getRelatedDestinations(
  currentSlug: string,
  region?: string,
  locale: SiteLocale = 'en',
  limit: number = 2,
): Promise<DestinationItem[]> {
  const payload = await getPayload({ config: await config })

  let sameRegionDocs: any[] = []

  if (region) {
    const sameRegionRes = await payload.find({
      collection: 'destinations',
      where: {
        and: [
          { slug: { not_equals: currentSlug } },
          { region: { equals: region } },
        ],
      },
      limit,
      depth: 1,
      locale,
      fallbackLocale: 'en',
    })
    sameRegionDocs = sameRegionRes.docs
  }

  if (sameRegionDocs.length >= limit) {
    return sameRegionDocs.map((d) => formatDestinationDoc(d, locale))
  }

  const needed = limit - sameRegionDocs.length
  const existingIds = sameRegionDocs.map((d) => d.id)

  const otherWhereConditions: any[] = [
    { slug: { not_equals: currentSlug } },
  ]
  if (existingIds.length > 0) {
    otherWhereConditions.push({ id: { not_in: existingIds } })
  }

  const otherRes = await payload.find({
    collection: 'destinations',
    where: { and: otherWhereConditions },
    limit: needed,
    depth: 1,
    locale,
    fallbackLocale: 'en',
  })

  const combined = [...sameRegionDocs, ...otherRes.docs]
  return combined.map((d) => formatDestinationDoc(d, locale))
}

/**
 * Get count of destinations grouped by region for the "Explore by Region" map widget.
 * Counts the FULL dataset without 100-record limits.
 */
export async function getDestinationRegionCounts(
  locale: SiteLocale = 'en',
): Promise<RegionCount[]> {
  const counts: Record<string, number> = {}
  for (const r of REGIONS_LIST) {
    if (r.slug !== 'all') {
      counts[r.slug] = 0
    }
  }

  try {
    const payload = await getPayload({ config: await config })
    // Count full collection across all documents
    const result = await payload.find({
      collection: 'destinations',
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })

    for (const doc of result.docs) {
      const reg = (doc as any).region
      if (reg && counts[reg] !== undefined) {
        counts[reg] = (counts[reg] || 0) + 1
      }
    }
  } catch (error) {
    console.error('Error fetching destination region counts:', error)
  }

  return Object.entries(counts).map(([region, count]) => ({
    region,
    slug: region,
    name: getRegionName(region, locale),
    count,
  }))
}
