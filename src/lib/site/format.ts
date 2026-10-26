import type { Category, Destination, Media, User } from '@/payload-types'
import type { SiteLocale } from './locale'

/* --------------------------------------------------------------------------
 * Relationship helpers
 * ------------------------------------------------------------------------ */

export function isPopulated<T extends { id: string }>(value: unknown): value is T {
  return typeof value === 'object' && value !== null && typeof (value as T).id === 'string'
}

export function getMedia(value: unknown): Media | null {
  return isPopulated<Media>(value) ? value : null
}

/* --------------------------------------------------------------------------
 * Authors
 * ------------------------------------------------------------------------ */

export type AuthorSummary = {
  id: string
  name: string
  role: string | null
  bio: string | null
  avatar: Media | null
}

export function toAuthor(user: unknown): AuthorSummary | null {
  if (!isPopulated<User>(user)) return null

  const name =
    user.displayName?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.email

  return {
    id: user.id,
    name,
    role: user.role ?? null,
    bio: user.bio ?? null,
    avatar: getMedia(user.avatar),
  }
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/* --------------------------------------------------------------------------
 * Regions
 *
 * Mirrors the option labels defined in `src/collections/Destinations.ts`.
 * The collection stores the raw value, so short display labels live here.
 * ------------------------------------------------------------------------ */

export const REGION_LABELS: Record<string, { en: string; am: string }> = {
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

export function regionLabel(region: string | null | undefined, locale: SiteLocale): string {
  if (!region) return ''
  return REGION_LABELS[region]?.[locale] ?? region.replace(/_/g, ' ')
}

/* --------------------------------------------------------------------------
 * Categories
 * ------------------------------------------------------------------------ */

export type CategorySummary = {
  id: string
  name: string
  slug: string
  description: string | null
  color: string | null
  featured: boolean
  icon: Media | null
}

export function toCategory(category: unknown): CategorySummary | null {
  if (!isPopulated<Category>(category)) return null

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? null,
    color: category.color ?? null,
    featured: Boolean(category.featured),
    icon: getMedia(category.icon),
  }
}

/* --------------------------------------------------------------------------
 * Destinations
 * ------------------------------------------------------------------------ */

export type DestinationSummary = {
  id: string
  title: string
  slug: string
  region: string | null
  overview: string
  featured: boolean
  heroImage: Media | null
  isUnesco: boolean
  altitudeMeters: number | null
  bestTimeToVisit: string | null
  latitude: number | null
  longitude: number | null
}

export function toDestination(destination: unknown): DestinationSummary | null {
  if (!isPopulated<Destination>(destination)) return null

  return {
    id: destination.id,
    title: destination.title,
    slug: destination.slug,
    region: destination.region ?? null,
    overview: destination.overview ?? '',
    featured: Boolean(destination.featured),
    heroImage: getMedia(destination.heroImage),
    isUnesco: Boolean(destination.travelInfo?.isUnescoSite),
    altitudeMeters: destination.travelInfo?.altitudeMeters ?? null,
    bestTimeToVisit: destination.travelInfo?.bestTimeToVisit ?? null,
    latitude: destination.coordinates?.latitude ?? null,
    longitude: destination.coordinates?.longitude ?? null,
  }
}

/* --------------------------------------------------------------------------
 * Formatting
 * ------------------------------------------------------------------------ */

export function formatDate(value: string | null | undefined, locale: SiteLocale): string {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(locale === 'am' ? 'am-ET' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatMonthDay(value: string | null | undefined, locale: SiteLocale): string {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(locale === 'am' ? 'am-ET' : 'en-US', {
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export function formatNumber(value: number, locale: SiteLocale): string {
  return new Intl.NumberFormat(locale === 'am' ? 'am-ET' : 'en-US').format(value)
}

export function mapsHref(latitude: number | null, longitude: number | null): string | null {
  if (latitude == null || longitude == null) return null
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
}

export function pluralStories(count: number, locale: SiteLocale): string {
  if (locale === 'am') return `${count} ታሪክ`
  return count === 1 ? '1 story' : `${count} stories`
}
