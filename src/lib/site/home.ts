import { getPayload, type Where } from 'payload'

import config from '@/payload.config'
import type { Article, Destination, Media } from '@/payload-types'
import {
  getMedia,
  regionLabel,
  toCategory,
  type CategorySummary,
} from '@/lib/site/format'
import type { SiteLocale } from '@/lib/site/locale'

export type SiteImage = {
  url: string
  alt: string
  width: number
  height: number
}

export type SiteCard = {
  id: string
  title: string
  excerpt: string
  kicker: string
  kickerColor?: string | null
  href?: string
  image: SiteImage
}

export type HomeHeroSlide = {
  id: string
  title: string
  excerpt: string
  href: string
  image: SiteImage
}

export type HomepageView = 'stories' | 'all' | 'destinations'

export type HomepageContent = {
  view: HomepageView
  heroSlides: HomeHeroSlide[]
  cards: SiteCard[]
  topics: CategorySummary[]
  activeCategory: CategorySummary | null
  query: string
}

/**
 * Public pages should not surface QA fixtures or half-finished records. A
 * homepage story must have a real headline, teaser and hero photograph.
 */
const TEST_SLUG = /^(e2e-|zz-|trace-)/

function isCompleteStory(article: Article): boolean {
  if (!article?.title || !article?.excerpt || !article?.slug) return false
  if (TEST_SLUG.test(article.slug)) return false
  if (article.title.trim().length < 8) return false
  if (article.excerpt.trim().length < 30) return false
  if (!getMedia(article.heroImage)?.url) return false
  return true
}

function toImage(media: Media | null): SiteImage | null {
  if (!media?.url) return null
  return {
    url: media.url,
    alt: media.alt || '',
    width: media.width ?? 1200,
    height: media.height ?? 675,
  }
}

export async function getSiteTopics(): Promise<CategorySummary[]> {
  const payload = await getPayload({ config: await config })

  const result = await payload.find({
    collection: 'categories',
    depth: 0,
    limit: 12,
    sort: 'name',
  })

  return result.docs
    .map((category) => toCategory(category))
    .filter((category): category is CategorySummary => Boolean(category))
}

function toArticleCard(article: Article, locale: SiteLocale): SiteCard | null {
  const image = toImage(getMedia(article.heroImage))
  if (!image) return null

  const category = toCategory(article.categories?.[0])

  return {
    id: article.id,
    title: article.title,
    excerpt: article.excerpt,
    kicker: category?.name ?? (locale === 'am' ? 'ታሪክ' : 'Story'),
    kickerColor: category?.color ?? 'amber',
    href: `/articles/${article.slug}?locale=${locale}`,
    image,
  }
}

function toHeroSlide(article: Article, locale: SiteLocale): HomeHeroSlide | null {
  const image = toImage(getMedia(article.heroImage))
  if (!image) return null

  return {
    id: article.id,
    title: article.title,
    excerpt: article.excerpt,
    href: `/articles/${article.slug}?locale=${locale}`,
    image,
  }
}

function toDestinationCard(destination: Destination, locale: SiteLocale): SiteCard | null {
  const image = toImage(getMedia(destination.heroImage))
  if (!image) return null

  return {
    id: destination.id,
    title: destination.title,
    excerpt: destination.overview,
    kicker: regionLabel(destination.region, locale),
    kickerColor: 'emerald',
    image,
  }
}

export async function getHomepageContent(args: {
  locale: SiteLocale
  query?: string
  category?: string
  view?: string
}): Promise<HomepageContent> {
  const { locale, query = '', category = '', view: rawView } = args
  const view: HomepageView =
    rawView === 'destinations' ? 'destinations' : rawView === 'all' ? 'all' : 'stories'

  const payload = await getPayload({ config: await config })
  const topics = await getSiteTopics()

  const activeCategory = category
    ? topics.find((topic) => topic.slug === category) ?? null
    : null

  if (view === 'destinations') {
    const [destinations, articles] = await Promise.all([
      payload.find({
        collection: 'destinations',
        depth: 1,
        limit: 24,
        locale,
        sort: 'title',
      }),
      payload.find({
        collection: 'articles',
        depth: 2,
        limit: 100,
        locale,
        fallbackLocale: 'en',
        sort: '-publishedDate',
        draft: false,
        where: { _status: { equals: 'published' } },
      }),
    ])

    const heroSlides = articles.docs
      .filter(isCompleteStory)
      .slice(0, 3)
      .map((article) => toHeroSlide(article, locale))
      .filter((slide): slide is HomeHeroSlide => Boolean(slide))

    return {
      view,
      heroSlides,
      cards: destinations.docs
        .map((destination) => toDestinationCard(destination, locale))
        .filter((card): card is SiteCard => Boolean(card)),
      topics,
      activeCategory,
      query,
    }
  }

  const filters: Where[] = [{ _status: { equals: 'published' } }]

  if (query.trim()) {
    filters.push({
      or: [
        { title: { like: query.trim() } },
        { excerpt: { like: query.trim() } },
      ],
    })
  }

  if (category) {
    filters.push({ 'categories.slug': { equals: category } })
  }

  const result = await payload.find({
    collection: 'articles',
    depth: 2,
    limit: 100,
    locale,
    fallbackLocale: 'en',
    sort: '-publishedDate',
    draft: false,
    where: {
      and: filters,
    },
  })

  const articles = result.docs.filter(isCompleteStory)
  const heroSlides = articles
    .slice(0, 3)
    .map((article) => toHeroSlide(article, locale))
    .filter((slide): slide is HomeHeroSlide => Boolean(slide))

  const heroIds = new Set(heroSlides.map((slide) => slide.id))
  const remaining = articles.filter((article) => !heroIds.has(article.id))
  // When only one complete story exists, keep the editorial grid populated by
  // showing that story again rather than rendering an empty section.
  const pool = remaining.length > 0 ? remaining : articles
  const cardSource = view === 'all' ? pool : pool.slice(0, 4)
  const cards = cardSource
    .map((article) => toArticleCard(article, locale))
    .filter((card): card is SiteCard => Boolean(card))

  return {
    view,
    heroSlides,
    cards,
    topics,
    activeCategory,
    query,
  }
}
