import { getPayload } from 'payload'
import config from '@/payload.config'
import { Advertisements } from '@/collections/Advertisements'
import type { SiteLocale } from '@/lib/site/locale'

export type AdvertisementDurationUnit = 'seconds' | 'minutes' | 'hours' | 'days'
export type AdvertisementVariant = 'standard' | 'lodge' | 'airline'

export type AdvertisementItem = {
  id: string
  title: string
  description: string
  slug: string
  image?: {
    url: string
    alt: string
    width?: number
    height?: number
  }
  badge?: string
  badgePosition?: 'top-left' | 'top-right'
  ctaText: string
  ctaLink: string
  variant: AdvertisementVariant
  placement: string
  durationValue: number
  durationUnit: AdvertisementDurationUnit
  durationMs: number
  status?: 'active' | 'inactive'
  startDate?: string | null
  endDate?: string | null
}

export const DEFAULT_AD_DURATION_SECONDS = 10
export const DEFAULT_AD_DURATION_MS = DEFAULT_AD_DURATION_SECONDS * 1000

export function normalizeDurationToMs(
  value: unknown,
  unit: unknown,
): { durationValue: number; durationUnit: AdvertisementDurationUnit; durationMs: number } {
  const rawVal = typeof value === 'number' ? value : Number(value)
  const isValidVal = Number.isFinite(rawVal) && rawVal > 0
  const durationValue = isValidVal ? rawVal : DEFAULT_AD_DURATION_SECONDS

  let durationUnit: AdvertisementDurationUnit = 'seconds'
  if (typeof unit === 'string') {
    const lower = unit.toLowerCase().trim()
    if (lower === 'minutes' || lower === 'minute') durationUnit = 'minutes'
    else if (lower === 'hours' || lower === 'hour') durationUnit = 'hours'
    else if (lower === 'days' || lower === 'day') durationUnit = 'days'
    else if (lower === 'seconds' || lower === 'second') durationUnit = 'seconds'
  }

  let multiplier = 1000
  if (durationUnit === 'minutes') multiplier = 60 * 1000
  else if (durationUnit === 'hours') multiplier = 60 * 60 * 1000
  else if (durationUnit === 'days') multiplier = 24 * 60 * 60 * 1000

  const durationMs = durationValue * multiplier

  return {
    durationValue,
    durationUnit,
    durationMs,
  }
}

export function isValidCtaUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed || trimmed === '#') return false
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  ) {
    return true
  }
  return false
}

export function isAdvertisementEligible(
  doc: any,
  placement?: string,
  targetDate: Date = new Date(),
): boolean {
  if (!doc || !doc.title) return false

  // Status check: must be active (or undefined/empty for backward compatibility with existing seeds)
  if (doc.status && doc.status !== 'active') return false

  // Scheduling start date
  if (doc.startDate) {
    const start = new Date(doc.startDate)
    if (!isNaN(start.getTime()) && targetDate < start) return false
  }

  // Scheduling expiration end date
  if (doc.endDate) {
    const end = new Date(doc.endDate)
    if (!isNaN(end.getTime()) && targetDate > end) return false
  }

  // Placement check: matches 'all' or specific placement
  if (placement) {
    const docPlacement = doc.placement || 'all'
    if (docPlacement !== 'all' && docPlacement !== placement) {
      return false
    }
  }

  // CTA destination URL validation: if link is defined, it must be valid
  if (doc.ctaLink !== undefined && doc.ctaLink !== null) {
    if (!isValidCtaUrl(doc.ctaLink)) return false
  }

  return true
}

function extractTextFromRichText(content: any): string {
  if (!content) return ''
  try {
    if (typeof content === 'string') return content
    if (content.root?.children) {
      const texts: string[] = []
      const traverse = (node: any) => {
        if (!node) return
        if (node.text) texts.push(node.text)
        if (Array.isArray(node.children)) {
          node.children.forEach(traverse)
        }
      }
      traverse(content.root)
      return texts.join(' ').trim()
    }
  } catch {
    return ''
  }
  return ''
}

export function formatAdvertisementDoc(
  doc: any,
  locale: SiteLocale = 'en',
  index: number = 0,
): AdvertisementItem {
  const title = doc.title || ''
  const rawContent = extractTextFromRichText(doc.content)
  const description = rawContent || ''
  const heroImg = doc.heroImage && typeof doc.heroImage === 'object' ? doc.heroImage : null

  const isAm = locale === 'am'
  const defaultCta = isAm ? 'ይመልከቱ' : 'Learn More'
  const ctaText = (typeof doc.ctaText === 'string' && doc.ctaText.trim()) || defaultCta

  const defaultLink = doc.slug ? `/advertisement/${doc.slug}` : `/advertisement/${doc.id || index}`
  const rawLink = typeof doc.ctaLink === 'string' && doc.ctaLink.trim() ? doc.ctaLink.trim() : ''
  const ctaLink = isValidCtaUrl(rawLink) ? rawLink : defaultLink

  const defaultBadge = isAm ? 'ስፖንሰር የተደረገ' : 'SPONSORED'
  const badge =
    (typeof doc.sponsorLabel === 'string' && doc.sponsorLabel.trim()) ||
    (typeof doc.badge === 'string' && doc.badge.trim()) ||
    defaultBadge

  const variant: AdvertisementVariant =
    doc.variant === 'lodge' || doc.variant === 'airline' ? doc.variant : 'standard'

  const placement = typeof doc.placement === 'string' && doc.placement.trim() ? doc.placement.trim() : 'all'

  const { durationValue, durationUnit, durationMs } = normalizeDurationToMs(
    doc.durationValue,
    doc.durationUnit,
  )

  return {
    id: String(doc.id || `ad-${index}`),
    title,
    description,
    slug: doc.slug || `ad-${doc.id || index}`,
    image: heroImg?.url
      ? {
          url: heroImg.url,
          alt: heroImg.alt || title,
          width: heroImg.width || 1200,
          height: heroImg.height || 800,
        }
      : undefined,
    badge,
    badgePosition: index % 2 === 0 ? ('top-right' as const) : ('top-left' as const),
    ctaText,
    ctaLink,
    variant,
    placement,
    durationValue,
    durationUnit,
    durationMs,
    status: doc.status || 'active',
    startDate: doc.startDate || null,
    endDate: doc.endDate || null,
  }
}

/**
 * Fetches published eligible advertisement records from Payload's Advertisements collection.
 * The collection uses slug 'title' as declared in src/collections/Advertisements.ts.
 */
export async function getAdvertisements(
  locale: SiteLocale = 'en',
  placement?: string,
): Promise<AdvertisementItem[]> {
  try {
    const payload = await getPayload({ config: await config })
    const result = await payload.find({
      collection: Advertisements.slug as any, // 'title'
      depth: 1,
      locale,
      fallbackLocale: 'en',
      limit: 50,
      overrideAccess: true,
    })

    const eligibleDocs = result.docs.filter((doc: any) =>
      isAdvertisementEligible(doc, placement),
    )

    return eligibleDocs.map((doc: any, index: number) =>
      formatAdvertisementDoc(doc, locale, index),
    )
  } catch (err) {
    console.error('Error fetching advertisements:', err)
    return []
  }
}

/**
 * Fetches a single advertisement by slug for the advertisement detail page.
 */
export async function getAdvertisementBySlug(
  slug: string,
  locale: SiteLocale = 'en',
): Promise<any | null> {
  try {
    const payload = await getPayload({ config: await config })
    const result = await payload.find({
      collection: Advertisements.slug as any,
      where: {
        slug: { equals: slug },
      },
      depth: 2,
      locale,
      fallbackLocale: 'en',
      limit: 1,
      overrideAccess: true,
    })

    return result.docs[0] || null
  } catch (err) {
    console.error('Error fetching advertisement by slug:', err)
    return null
  }
}
