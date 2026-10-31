import { getPayload } from 'payload'
import config from '@/payload.config'
import type { SiteLocale } from '@/lib/site/locale'
import { extractHeadingsFromContent, type TocItem } from './toc'

export type StoryItem = {
  id: string
  title: string
  excerpt: string
  slug: string
  category: {
    id?: string
    name: string
    slug: string
    color?: string
  }
  author: {
    id?: string
    name: string
    avatar?: string
    role?: string
  }
  publishedDate: string
  readTime: string
  readingTimeMinutes?: number
  heroImage: {
    url: string
    alt: string
    caption?: string
  }
  richText?: any
  tags?: string[]
}

export type PopularStoryItem = {
  rank: string
  title: string
  slug: string
  image: string
  readTime: string
}

export type RelatedStoryItem = {
  title: string
  slug: string
  date: string
  readTime: string
  image: string
}

export type CategoryItem = {
  id: string
  name: string
  slug: string
}

function formatPayloadArticle(article: any, locale: SiteLocale): StoryItem {
  const hero = article.heroImage && typeof article.heroImage === 'object' ? article.heroImage : null
  const cat = article.categories?.[0] && typeof article.categories[0] === 'object' ? article.categories[0] : null
  const auth = article.author && typeof article.author === 'object' ? article.author : null

  const dateStr = article.publishedDate
    ? new Intl.DateTimeFormat(locale === 'am' ? 'am-ET' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(article.publishedDate))
    : ''

  const authorName =
    auth?.displayName ||
    `${auth?.firstName || ''} ${auth?.lastName || ''}`.trim() ||
    auth?.email?.split('@')[0] ||
    (locale === 'am' ? 'ጸሐፊ' : 'Author')

  const readTimeMin = article.readingTimeMinutes || 5
  const readTimeStr = locale === 'am' ? `${readTimeMin} ደቂቃ ንባብ` : `${readTimeMin} min read`

  // Derive genuine tags from assigned categories and destinations
  const tags: string[] = []
  if (Array.isArray(article.categories)) {
    article.categories.forEach((c: any) => {
      if (c && typeof c === 'object' && c.name) tags.push(c.name)
    })
  }
  if (Array.isArray(article.destinations)) {
    article.destinations.forEach((d: any) => {
      if (d && typeof d === 'object' && d.title) tags.push(d.title)
    })
  }

  return {
    id: article.id,
    title: article.title || '',
    excerpt: article.excerpt || '',
    slug: article.slug || '',
    category: {
      id: cat?.id,
      name: cat?.name || (locale === 'am' ? 'አጠቃላይ' : 'General'),
      slug: cat?.slug || 'general',
      color: cat?.color || 'amber',
    },
    author: {
      id: auth?.id,
      name: authorName,
      avatar: auth?.avatar && typeof auth.avatar === 'object' ? auth.avatar.url : undefined,
      role: auth?.role || (locale === 'am' ? 'አስተዋጽዖ አበርካች' : 'Contributor'),
    },
    publishedDate: dateStr,
    readTime: readTimeStr,
    readingTimeMinutes: readTimeMin,
    heroImage: {
      url: hero?.url || '',
      alt: hero?.alt || article.title || '',
      caption: hero?.caption,
    },
    richText: article.content,
    tags,
  }
}

/**
 * Returns available categories directly from the Categories collection.
 */
export async function getCategoriesList(locale: SiteLocale = 'en'): Promise<CategoryItem[]> {
  try {
    const payload = await getPayload({ config: await config })
    const result = await payload.find({
      collection: 'categories',
      depth: 0,
      locale,
      fallbackLocale: 'en',
      limit: 50,
      sort: 'name',
    })

    return result.docs.map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      slug: doc.slug,
    }))
  } catch (err) {
    console.error('Error fetching categories:', err)
    return []
  }
}

/**
 * Queries published articles for the stories listing page with honest category filtering,
 * chronological or metric-based sorting, and pagination.
 */
export async function getStoriesList(args: {
  locale?: SiteLocale
  category?: string
  sort?: string
  page?: number
  limit?: number
}): Promise<{
  stories: StoryItem[]
  featured: StoryItem[]
  popular: PopularStoryItem[]
  totalPages: number
  totalDocs: number
  page: number
}> {
  const { locale = 'en', category = '', sort = 'latest', page = 1, limit = 12 } = args

  try {
    const payload = await getPayload({ config: await config })

    // Determine Payload sort option using legitimate stored schema properties
    let sortQuery: string | string[] = '-publishedDate'
    if (sort === 'oldest') {
      sortQuery = 'publishedDate'
    } else if (sort === 'popular') {
      // Use legitimate stored properties from Articles schema (featured flag & readingTimeMinutes)
      sortQuery = ['-featured', '-readingTimeMinutes', '-publishedDate']
    }

    // Build query conditions
    const whereConditions: any[] = [
      {
        _status: {
          equals: 'published',
        },
      },
    ]

    // If a category filter is selected (and not 'all'), look up its ID
    if (category && category !== 'all') {
      const catResult = await payload.find({
        collection: 'categories',
        where: {
          slug: { equals: category },
        },
        depth: 0,
        limit: 1,
      })

      if (catResult.docs[0]) {
        whereConditions.push({
          categories: {
            contains: catResult.docs[0].id,
          },
        })
      } else {
        // Category slug doesn't exist: honest empty result (do NOT fall back to all stories)
        return {
          stories: [],
          featured: [],
          popular: [],
          totalPages: 0,
          totalDocs: 0,
          page: 1,
        }
      }
    }

    const result = await payload.find({
      collection: 'articles',
      where: {
        and: whereConditions,
      },
      depth: 2,
      locale,
      fallbackLocale: 'en',
      sort: sortQuery,
      page,
      limit,
    })

    const stories = result.docs
      .filter((doc: any) => doc && doc.title && doc.slug)
      .map((doc: any) => formatPayloadArticle(doc, locale))

    // Query genuine featured stories (articles marked featured: true)
    const featuredResult = await payload.find({
      collection: 'articles',
      where: {
        and: [
          { _status: { equals: 'published' } },
          { featured: { equals: true } },
        ],
      },
      depth: 2,
      locale,
      fallbackLocale: 'en',
      limit: 5,
    })

    let featuredStories = featuredResult.docs
      .filter((doc: any) => doc && doc.title && doc.slug)
      .map((doc: any) => formatPayloadArticle(doc, locale))

    // If none marked featured explicitly, take the top published stories as featured
    if (featuredStories.length === 0 && stories.length > 0) {
      featuredStories = stories.slice(0, 2)
    }

    // Query genuine popular stories using legitimate stored metrics
    const popularResult = await payload.find({
      collection: 'articles',
      where: {
        _status: { equals: 'published' },
      },
      depth: 1,
      locale,
      fallbackLocale: 'en',
      sort: ['-featured', '-readingTimeMinutes', '-publishedDate'],
      limit: 4,
    })

    const popular: PopularStoryItem[] = popularResult.docs
      .filter((doc: any) => doc && doc.title && doc.slug)
      .map((doc: any, idx: number) => {
        const hero = doc.heroImage && typeof doc.heroImage === 'object' ? doc.heroImage : null
        const readTimeMin = doc.readingTimeMinutes || 5
        const readTimeStr = locale === 'am' ? `${readTimeMin} ደቂቃ ንባብ` : `${readTimeMin} min read`

        return {
          rank: String(idx + 1).padStart(2, '0'),
          title: doc.title,
          slug: doc.slug,
          image: hero?.url || '',
          readTime: readTimeStr,
        }
      })

    return {
      stories,
      featured: featuredStories,
      popular,
      totalPages: result.totalPages || 1,
      totalDocs: result.totalDocs || stories.length,
      page: result.page || 1,
    }
  } catch (err) {
    console.error('Error in getStoriesList:', err)
    return {
      stories: [],
      featured: [],
      popular: [],
      totalPages: 0,
      totalDocs: 0,
      page: 1,
    }
  }
}

/**
 * Retrieves a single published story by slug, or an unpublished draft IF authorized.
 * Returns null if the article does not exist or access is unauthorized.
 */
export async function getStoryDetail(
  slug: string,
  locale: SiteLocale = 'en',
  options?: {
    preview?: boolean
    canPreview?: boolean
  },
): Promise<{ story: StoryItem; toc: TocItem[] } | null> {
  try {
    const payload = await getPayload({ config: await config })
    const isAuthorizedPreview = Boolean(options?.preview && options?.canPreview)

    const whereClause: any = {
      slug: { equals: slug },
    }

    if (!isAuthorizedPreview) {
      whereClause._status = { equals: 'published' }
    }

    const result = await payload.find({
      collection: 'articles',
      where: whereClause,
      depth: 2,
      locale,
      fallbackLocale: 'en',
      draft: isAuthorizedPreview,
      limit: 1,
    })

    const doc = result.docs[0]
    if (!doc) {
      return null
    }

    const story = formatPayloadArticle(doc, locale)
    const toc = extractHeadingsFromContent(doc.content)

    return { story, toc }
  } catch (err) {
    console.error('Error in getStoryDetail:', err)
    return null
  }
}

/**
 * Queries genuinely related published articles, excluding the current article.
 */
export async function getRelatedStories(
  currentArticleId: string,
  categoryIds: string[] = [],
  locale: SiteLocale = 'en',
): Promise<RelatedStoryItem[]> {
  try {
    const payload = await getPayload({ config: await config })

    const whereConditions: any[] = [
      { _status: { equals: 'published' } },
      { id: { not_equals: currentArticleId } },
    ]

    if (categoryIds.length > 0) {
      whereConditions.push({
        categories: { in: categoryIds },
      })
    }

    let result = await payload.find({
      collection: 'articles',
      where: {
        and: whereConditions,
      },
      depth: 1,
      locale,
      fallbackLocale: 'en',
      sort: '-publishedDate',
      limit: 3,
    })

    // If no stories in the exact same category, fallback to other recent published stories
    if (result.docs.length === 0 && categoryIds.length > 0) {
      result = await payload.find({
        collection: 'articles',
        where: {
          and: [
            { _status: { equals: 'published' } },
            { id: { not_equals: currentArticleId } },
          ],
        },
        depth: 1,
        locale,
        fallbackLocale: 'en',
        sort: '-publishedDate',
        limit: 3,
      })
    }

    return result.docs
      .filter((doc: any) => doc && doc.title && doc.slug)
      .map((doc: any) => {
        const hero = doc.heroImage && typeof doc.heroImage === 'object' ? doc.heroImage : null
        const readTimeMin = doc.readingTimeMinutes || 5
        const dateStr = doc.publishedDate
          ? new Intl.DateTimeFormat(locale === 'am' ? 'am-ET' : 'en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }).format(new Date(doc.publishedDate))
          : ''

        return {
          title: doc.title,
          slug: doc.slug,
          date: dateStr,
          readTime: locale === 'am' ? `${readTimeMin} ደቂቃ ንባብ` : `${readTimeMin} min read`,
          image: hero?.url || '',
        }
      })
  } catch (err) {
    console.error('Error fetching related stories:', err)
    return []
  }
}
