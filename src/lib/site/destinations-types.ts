import type { SiteLocale } from '@/lib/site/locale'

export type DestinationCoordinates = {
  latitude: number
  longitude: number
}

export type DestinationItem = {
  id: string
  title: string
  slug: string
  region: string
  regionName: string
  category: string
  categoryName: string
  tags: string[]
  featured: boolean
  heroImage?: {
    url: string
    alt: string
  }
  overview: string
  content?: any
  travelInfo?: {
    bestTimeToVisit?: string
    altitudeMeters?: number
    isUnescoSite?: boolean
  }
  coordinates?: DestinationCoordinates
  quickInfo?: {
    region?: string
    elevation?: string
    bestTime?: string
    mainAttractions?: string
    idealFor?: string
    visitDuration?: string
  }
  attractions?: Array<{
    name: string
    description?: string
    image?: {
      url: string
      alt: string
    }
  }>
  recommendedAccommodation?: {
    name: string
    rating?: number
    reviewCount?: number
    category?: string
    description?: string
    image?: {
      url: string
      alt: string
    }
    link?: string
  }
  gallery: Array<{
    url: string
    alt: string
    caption?: string
  }>
}

export type RegionCount = {
  region: string
  slug?: string
  name: string
  count: number
}

export type PaginatedDestinationsResult = {
  destinations: DestinationItem[]
  totalDocs: number
  totalPages: number
  page: number
  limit: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export function isValidCoordinate(
  latitude: unknown,
  longitude: unknown,
): latitude is number {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

export const REGION_NAMES: Record<string, { en: string; am: string }> = {
  amhara: { en: 'Amhara', am: 'አማራ' },
  oromia: { en: 'Oromia', am: 'ኦሮሚያ' },
  tigray: { en: 'Tigray', am: 'ትግራይ' },
  afar: { en: 'Afar', am: 'አፋር' },
  sidama: { en: 'Sidama', am: 'ሲዳማ' },
  southern_ethiopia: { en: 'Southern Ethiopia', am: 'ደቡብ ኢትዮጵያ' },
  central_ethiopia: { en: 'Central Ethiopia', am: 'ማዕከላዊ ኢትዮጵያ' },
  south_west_ethiopia: { en: 'South West Ethiopia', am: 'ደቡብ ምዕራብ ኢትዮጵያ' },
  benishangul_gumuz: { en: 'Benishangul-Gumuz', am: 'ቤኒሻንጉል ጉሙዝ' },
  gambella: { en: 'Gambella', am: 'ጋምቤላ' },
  harari: { en: 'Harari', am: 'ሐረሪ' },
  somali: { en: 'Somali', am: 'ሶማሌ' },
  addis_ababa: { en: 'Addis Ababa', am: 'አዲስ አበባ' },
  dire_dawa: { en: 'Dire Dawa', am: 'ድሬዳዋ' },
}

export const CATEGORY_NAMES: Record<string, { en: string; am: string }> = {
  all: { en: 'All Destinations', am: 'ሁሉም መዳረሻዎች' },
  historic_sites: { en: 'Historic Sites', am: 'ታሪካዊ ቦታዎች' },
  natural_wonders: { en: 'Natural Wonders', am: 'የተፈጥሮ ድንቆች' },
  cities_towns: { en: 'Cities & Towns', am: 'ከተሞች' },
  cultural_experiences: { en: 'Cultural Experiences', am: 'ባሕላዊ ልምዶች' },
  wildlife_parks: { en: 'Wildlife & Parks', am: 'የዱር እንስሳትና ፓርኮች' },
}

export function getRegionName(region: string, locale: SiteLocale = 'en'): string {
  if (!region) return ''
  const norm = region.toLowerCase().replace(/[\s-]+/g, '_')
  const entry = REGION_NAMES[norm]
  if (entry) return entry[locale] || entry.en
  return region.replace(/_/g, ' ')
}

export function getCategoryName(category: string, locale: SiteLocale = 'en'): string {
  if (!category) return ''
  const norm = category.toLowerCase().replace(/[\s-]+/g, '_')
  const entry = CATEGORY_NAMES[norm]
  if (entry) return entry[locale] || entry.en
  return category.replace(/_/g, ' ')
}

export const CATEGORIES_LIST = [
  { slug: 'all', en: 'All Destinations', am: 'ሁሉም መዳረሻዎች' },
  { slug: 'historic_sites', en: 'Historic Sites', am: 'ታሪካዊ ቦታዎች' },
  { slug: 'natural_wonders', en: 'Natural Wonders', am: 'የተፈጥሮ ድንቆች' },
  { slug: 'cities_towns', en: 'Cities & Towns', am: 'ከተሞች' },
  { slug: 'cultural_experiences', en: 'Cultural Experiences', am: 'ባሕላዊ ልምዶች' },
  { slug: 'wildlife_parks', en: 'Wildlife & Parks', am: 'የዱር እንስሳትና ፓርኮች' },
]

export const REGIONS_LIST = [
  { slug: 'all', en: 'All Regions', am: 'ሁሉም ክልሎች' },
  { slug: 'amhara', en: 'Amhara', am: 'አማራ' },
  { slug: 'oromia', en: 'Oromia', am: 'ኦሮሚያ' },
  { slug: 'tigray', en: 'Tigray', am: 'ትግራይ' },
  { slug: 'afar', en: 'Afar', am: 'አፋር' },
  { slug: 'sidama', en: 'Sidama', am: 'ሲዳማ' },
  { slug: 'southern_ethiopia', en: 'Southern Ethiopia', am: 'ደቡብ ኢትዮጵያ' },
  { slug: 'central_ethiopia', en: 'Central Ethiopia', am: 'ማዕከላዊ ኢትዮጵያ' },
  { slug: 'south_west_ethiopia', en: 'South West Ethiopia', am: 'ደቡብ ምዕራብ ኢትዮጵያ' },
  { slug: 'benishangul_gumuz', en: 'Benishangul-Gumuz', am: 'ቤኒሻንጉል ጉሙዝ' },
  { slug: 'gambella', en: 'Gambella', am: 'ጋምቤላ' },
  { slug: 'harari', en: 'Harari', am: 'ሐረሪ' },
  { slug: 'somali', en: 'Somali', am: 'ሶማሌ' },
  { slug: 'addis_ababa', en: 'Addis Ababa', am: 'አዲስ አበባ' },
  { slug: 'dire_dawa', en: 'Dire Dawa', am: 'ድሬዳዋ' },
]
