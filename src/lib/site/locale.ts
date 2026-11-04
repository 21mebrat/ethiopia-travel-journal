import { cookies } from 'next/headers'

export const SITE_LOCALES = ['en', 'am'] as const

export type SiteLocale = (typeof SITE_LOCALES)[number]

export const DEFAULT_LOCALE: SiteLocale = 'en'

/** Cookie used by the site-wide language switcher. */
export const LOCALE_COOKIE = 'etj_locale'

export function normalizeLocale(value?: string | null): SiteLocale {
  return value === 'am' ? 'am' : 'en'
}

export function isSiteLocale(value?: string | null): value is SiteLocale {
  return value === 'en' || value === 'am'
}

/**
 * Resolve the locale for a public page.
 *
 * Priority: explicit `?locale=` (used by Payload's live preview and by deep
 * links) → the switcher cookie → English.
 */
export async function getSiteLocale(override?: string | null): Promise<SiteLocale> {
  if (isSiteLocale(override)) return override

  const store = await cookies()
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value)
}
