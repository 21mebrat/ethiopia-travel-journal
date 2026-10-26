import type { CollectionSlug, Payload, Where } from 'payload'
import type { Article, User } from '@/payload-types'

type DashboardUser = User | null | undefined
type DashboardLocale = 'en' | 'am'

type ChartArticle = {
  id: string
  createdAt: string
  publishedDate?: string | null
  _status?: 'draft' | 'published' | null
}

type RegionDestination = {
  region?: string | null
  featured?: boolean | null
}

type TeamUser = {
  role?: User['role'] | null
  createdAt: string
}

export type DashboardStatId = 'articles' | 'destinations' | 'media' | 'team'

export type DashboardStat = {
  id: DashboardStatId
  label: string
  value: number
  /** Percentage change vs. the previous month. `null` means "no previous data". */
  delta: number | null
  /** Absolute number of new records this month (used when there is no baseline). */
  deltaValue: number
  insight: string
  note: string
  href: string
}

export type DashboardRegion = {
  value: string
  label: { en: string; am: string }
  count: number
}

export type DashboardChartPoint = {
  month: string
  published: number
  drafts: number
}

export type DashboardArticle = {
  id: string
  title: string
  slug: string
  status: 'published' | 'draft'
  featured: boolean
  updatedAt: string
  updatedRelative: string
  updatedLabel: string
  publishedDate: string | null
  author: string | null
  destinations: string[]
  categories: string[]
  thumbnail: string | null
}

export type DashboardData = {
  stats: DashboardStat[]
  chart: {
    points: DashboardChartPoint[]
    publishedTotal: number
    draftsTotal: number
  }
  regions: {
    items: DashboardRegion[]
    covered: number
    total: number
  }
  recentArticles: DashboardArticle[]
  totals: {
    articles: number
    published: number
    drafts: number
    destinations: number
    media: number
    categories: number
    users: number
  }
}

const REGION_LABELS: Record<string, { en: string; am: string }> = {
  amhara: { en: 'Amhara', am: 'አማራ' },
  oromia: { en: 'Oromia', am: 'ኦሮሚያ' },
  tigray: { en: 'Tigray', am: 'ትግራይ' },
  afar: { en: 'Afar', am: 'አፋር' },
  sidama: { en: 'Sidama', am: 'ሲዳማ' },
  southern_ethiopia: { en: 'South Ethiopia', am: 'ደቡብ ኢትዮጵያ' },
  central_ethiopia: { en: 'Central Ethiopia', am: 'መካከለኛ ኢትዮጵያ' },
  south_west_ethiopia: { en: 'South West Ethiopia', am: 'ደቡብ ምዕራብ ኢትዮጵያ' },
  benishangul_gumuz: { en: 'Benishangul-Gumuz', am: 'ቤኒሻንጉል ጉሙዝ' },
  gambella: { en: 'Gambella', am: 'ጋምቤላ' },
  harari: { en: 'Harari', am: 'ሐረሪ' },
  somali: { en: 'Somali', am: 'ሶማሌ' },
  addis_ababa: { en: 'Addis Ababa', am: 'አዲስ አበባ' },
  dire_dawa: { en: 'Dire Dawa', am: 'ድሬዳዋ' },
}

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const startOfNextMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 1)
const startOfMonthOffset = (date: Date, offset: number) =>
  new Date(date.getFullYear(), date.getMonth() + offset, 1)

const monthRange = (start: Date): Where => ({
  createdAt: {
    greater_than_equal: start.toISOString(),
    less_than: startOfNextMonth(start).toISOString(),
  },
})

const percentChange = (current: number, previous: number): number | null => {
  if (previous === 0) {
    return current === 0 ? 0 : null
  }

  return Math.round(((current - previous) / previous) * 1000) / 10
}

const countLabel = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`

async function safeCount(
  payload: Payload,
  collection: CollectionSlug,
  user: DashboardUser,
  where?: Where,
): Promise<number> {
  try {
    const result = await payload.count({
      collection,
      overrideAccess: false,
      user: user ?? undefined,
      where,
    })

    return result.totalDocs
  } catch {
    return 0
  }
}

async function safeFind<T>(
  promise: Promise<{ docs: T[] }>,
): Promise<T[]> {
  try {
    const result = await promise
    return result.docs ?? []
  } catch {
    return []
  }
}

const getRelationLabel = (value: unknown, key: 'title' | 'name'): string | null => {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const label = record[key]
  return typeof label === 'string' ? label : null
}

const getAuthorName = (author: Article['author'] | null | undefined): string | null => {
  if (!author || typeof author !== 'object') return null

  const user = author as User
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()

  return user.displayName || fullName || user.email || null
}

const getThumbnail = (media: unknown): string | null => {
  if (!media || typeof media !== 'object') return null

  const url = (media as { url?: string | null }).url

  return typeof url === 'string' ? url : null
}

const getRelativeTime = (
  value: string,
  now: Date,
  locale: DashboardLocale,
): string => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  const formatter = new Intl.RelativeTimeFormat(locale === 'am' ? 'am' : 'en', {
    numeric: 'auto',
  })

  const diffInMinutes = Math.round((date.getTime() - now.getTime()) / 60_000)

  if (Math.abs(diffInMinutes) < 60) {
    return formatter.format(diffInMinutes, 'minute')
  }

  const diffInHours = Math.round(diffInMinutes / 60)

  if (Math.abs(diffInHours) < 24) {
    return formatter.format(diffInHours, 'hour')
  }

  const diffInDays = Math.round(diffInHours / 24)

  if (Math.abs(diffInDays) < 30) {
    return formatter.format(diffInDays, 'day')
  }

  const diffInMonths = Math.round(diffInDays / 30)

  if (Math.abs(diffInMonths) < 12) {
    return formatter.format(diffInMonths, 'month')
  }

  return formatter.format(Math.round(diffInMonths / 12), 'year')
}

export async function getDashboardData({
  locale,
  payload,
  user,
}: {
  locale: DashboardLocale
  payload: Payload
  user: DashboardUser
}): Promise<DashboardData> {
  const now = new Date()
  const currentMonth = startOfMonth(now)
  const previousMonth = startOfMonthOffset(now, -1)

  const [
    articles,
    published,
    drafts,
    articlesThisMonth,
    articlesPreviousMonth,
    destinations,
    destinationsThisMonth,
    destinationsPreviousMonth,
    media,
    mediaThisMonth,
    mediaPreviousMonth,
    categories,
    recentArticles,
    chartArticles,
    destinationDocs,
    userDocs,
  ] = await Promise.all([
    safeCount(payload, 'articles', user),
    safeCount(payload, 'articles', user, { _status: { equals: 'published' } }),
    safeCount(payload, 'articles', user, { _status: { equals: 'draft' } }),
    safeCount(payload, 'articles', user, monthRange(currentMonth)),
    safeCount(payload, 'articles', user, monthRange(previousMonth)),
    safeCount(payload, 'destinations', user),
    safeCount(payload, 'destinations', user, monthRange(currentMonth)),
    safeCount(payload, 'destinations', user, monthRange(previousMonth)),
    safeCount(payload, 'media', user),
    safeCount(payload, 'media', user, monthRange(currentMonth)),
    safeCount(payload, 'media', user, monthRange(previousMonth)),
    safeCount(payload, 'categories', user),
    safeFind(
      payload.find({
        collection: 'articles',
        depth: 1,
        limit: 8,
        overrideAccess: false,
        sort: '-updatedAt',
        user: user ?? undefined,
      }) as Promise<{ docs: Article[] }>,
    ),
    safeFind(
      payload.find({
        collection: 'articles',
        depth: 0,
        overrideAccess: false,
        pagination: false,
        select: {
          _status: true,
          createdAt: true,
          publishedDate: true,
        },
        user: user ?? undefined,
      }) as Promise<{ docs: ChartArticle[] }>,
    ),
    safeFind(
      payload.find({
        collection: 'destinations',
        depth: 0,
        overrideAccess: false,
        pagination: false,
        select: {
          featured: true,
          region: true,
        },
        user: user ?? undefined,
      }) as Promise<{ docs: RegionDestination[] }>,
    ),
    safeFind(
      payload.find({
        collection: 'users',
        depth: 0,
        overrideAccess: false,
        pagination: false,
        select: {
          createdAt: true,
          role: true,
        },
        user: user ?? undefined,
      }) as Promise<{ docs: TeamUser[] }>,
    ),
  ])

  const featuredDestinations = destinationDocs.filter((destination) => destination.featured).length
  const regionCounts = new Map<string, number>()

  for (const destination of destinationDocs) {
    const region = destination.region

    if (!region) continue
    regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1)
  }

  const regions = [...regionCounts.entries()]
    .map(([value, count]) => ({
      value,
      count,
      label: REGION_LABELS[value] ?? { en: value, am: value },
    }))
    .sort((a, b) => b.count - a.count || a.label.en.localeCompare(b.label.en))

  const roleCounts = { admin: 0, author: 0, editor: 0, other: 0 }

  for (const teamMember of userDocs) {
    if (teamMember.role === 'admin') roleCounts.admin += 1
    else if (teamMember.role === 'editor') roleCounts.editor += 1
    else if (teamMember.role === 'author') roleCounts.author += 1
    else roleCounts.other += 1
  }

  const usersThisMonth = userDocs.filter((teamMember) => {
    const createdAt = teamMember.createdAt ? new Date(teamMember.createdAt) : null
    return createdAt !== null && createdAt >= currentMonth
  }).length

  const usersPreviousMonth = userDocs.filter((teamMember) => {
    const createdAt = teamMember.createdAt ? new Date(teamMember.createdAt) : null
    return (
      createdAt !== null &&
      createdAt >= previousMonth &&
      createdAt < currentMonth
    )
  }).length

  // Six rolling months for the publishing chart.
  const monthFormatter = new Intl.DateTimeFormat(locale === 'am' ? 'am' : 'en', {
    month: 'short',
  })

  const chartPoints: DashboardChartPoint[] = []

  for (let offset = 5; offset >= 0; offset -= 1) {
    const monthStart = startOfMonthOffset(now, -offset)
    const nextMonthStart = startOfNextMonth(monthStart)

    let publishedThisMonth = 0
    let draftsThisMonth = 0

    for (const article of chartArticles) {
      const isPublished = (article._status ?? 'published') === 'published'
      const relevantDate = article.publishedDate || article.createdAt

      if (!relevantDate) continue

      const date = new Date(relevantDate)
      if (date < monthStart || date >= nextMonthStart) continue

      if (isPublished) publishedThisMonth += 1
      else draftsThisMonth += 1
    }

    chartPoints.push({
      month: monthFormatter.format(monthStart),
      published: publishedThisMonth,
      drafts: draftsThisMonth,
    })
  }

  const publishedTotal = chartPoints.reduce((sum, point) => sum + point.published, 0)
  const draftsTotal = chartPoints.reduce((sum, point) => sum + point.drafts, 0)

  const dateFormatter = new Intl.DateTimeFormat(locale === 'am' ? 'am' : 'en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const stats: DashboardStat[] = [
    {
      id: 'articles',
      label: locale === 'am' ? 'ጽሑፎች' : 'Articles',
      value: articles,
      delta: percentChange(articlesThisMonth, articlesPreviousMonth),
      deltaValue: articlesThisMonth,
      insight:
        locale === 'am'
          ? `${published} የታተመ · ${drafts} ረቂቅ`
          : `${published} published · ${countLabel(drafts, 'draft', 'drafts')}`,
      note:
        locale === 'am'
          ? 'በሁሉም መዳረሻዎች የታተመ ይዘት'
          : 'Stories, guides and travel dispatches',
      href: '/admin/collections/articles',
    },
    {
      id: 'destinations',
      label: locale === 'am' ? 'መዳረሻዎች' : 'Destinations',
      value: destinations,
      delta: percentChange(destinationsThisMonth, destinationsPreviousMonth),
      deltaValue: destinationsThisMonth,
      insight:
        locale === 'am'
          ? `${featuredDestinations} ተመራጭ · ${regions.length} ክልሎች`
          : `${featuredDestinations} featured · ${countLabel(regions.length, 'region', 'regions')}`,
      note:
        locale === 'am'
          ? 'በኢትዮጵያ የተሸፈኑ የጉዞ አካባቢዎች'
          : 'Travel places covered across Ethiopia',
      href: '/admin/collections/destinations',
    },
    {
      id: 'media',
      label: locale === 'am' ? 'የሚዲያ ፋይሎች' : 'Media assets',
      value: media,
      delta: percentChange(mediaThisMonth, mediaPreviousMonth),
      deltaValue: mediaThisMonth,
      insight:
        locale === 'am'
          ? `${mediaThisMonth} በዚህ ወር ተጨምረዋል`
          : `${mediaThisMonth} added this month`,
      note:
        locale === 'am'
          ? 'ፎቶዎች፣ ጋለሪዎች እና የጉዞ ምስሎች'
          : 'Photos, galleries and travel imagery',
      href: '/admin/collections/media',
    },
    {
      id: 'team',
      label: locale === 'am' ? 'የቡድን አባላት' : 'Team members',
      value: userDocs.length,
      delta: percentChange(usersThisMonth, usersPreviousMonth),
      deltaValue: usersThisMonth,
      insight:
        locale === 'am'
          ? `${roleCounts.admin} አስተዳዳሪ · ${roleCounts.editor} አርታዒ · ${roleCounts.author} ጸሐፊ`
          : `${countLabel(roleCounts.admin, 'admin', 'admins')} · ${countLabel(roleCounts.editor, 'editor', 'editors')} · ${countLabel(roleCounts.author, 'author', 'authors')}`,
      note:
        locale === 'am'
          ? 'የይዘት ቡድንዎ እና የመዳረሻ ሚናዎች'
          : 'Your editorial team and access roles',
      href: '/admin/collections/users',
    },
  ]

  return {
    chart: {
      points: chartPoints,
      publishedTotal,
      draftsTotal,
    },
    recentArticles: recentArticles.map((article) => ({
      id: String(article.id),
      title: article.title || 'Untitled article',
      slug: article.slug || '',
      status: article._status === 'published' ? 'published' : 'draft',
      featured: Boolean(article.featured),
      updatedAt: article.updatedAt,
      updatedLabel: dateFormatter.format(new Date(article.updatedAt)),
      updatedRelative: getRelativeTime(article.updatedAt, now, locale),
      publishedDate: article.publishedDate ?? null,
      author: getAuthorName(article.author),
      destinations: Array.isArray(article.destinations)
        ? article.destinations
            .map((destination) => getRelationLabel(destination, 'title'))
            .filter((label): label is string => Boolean(label))
        : [],
      categories: Array.isArray(article.categories)
        ? article.categories
            .map((category) => getRelationLabel(category, 'name'))
            .filter((label): label is string => Boolean(label))
        : [],
      thumbnail: getThumbnail(article.heroImage),
    })),
    regions: {
      covered: regions.length,
      items: regions.slice(0, 6),
      total: Object.keys(REGION_LABELS).length,
    },
    stats,
    totals: {
      articles,
      categories,
      destinations,
      drafts,
      media,
      published,
      users: userDocs.length,
    },
  }
}
