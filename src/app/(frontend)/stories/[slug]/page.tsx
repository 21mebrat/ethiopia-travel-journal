import React from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { articleJSXConverters } from '@/components/richText/converters'

import TableOfContents from '@/components/site/TableOfContents'
import SocialShareBar from '@/components/site/SocialShareBar'
import AdvertisementCard from '@/components/site/AdvertisementCard'
import RelatedStoriesWidget from '@/components/site/RelatedStoriesWidget'
import NewsletterWidget from '@/components/site/NewsletterWidget'
import { getStoryDetail, getRelatedStories } from '@/lib/site/stories'
import { getAdvertisements } from '@/lib/site/advertisements'
import { getSiteLocale, type SiteLocale } from '@/lib/site/locale'
import { canUserPreview } from '@/lib/site/auth'

type StoryDetailPageProps = {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    locale?: string
    preview?: string
  }>
}

export async function generateMetadata({
  params,
  searchParams,
}: StoryDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const { locale: localeParam, preview } = await searchParams
  const locale = (await getSiteLocale(localeParam)) as SiteLocale
  const isPreview = preview === 'true'
  const isAuthorized = isPreview ? await canUserPreview() : false

  const data = await getStoryDetail(slug, locale, {
    preview: isPreview,
    canPreview: isAuthorized,
  })

  if (!data) {
    return { title: 'Story Not Found | Ethiopia Travel Journal' }
  }

  const { story } = data

  return {
    title: `${story.title} | Ethiopia Travel Journal`,
    description: story.excerpt,
    alternates: {
      canonical: `/stories/${slug}`,
    },
    openGraph: {
      title: story.title,
      description: story.excerpt,
      images: story.heroImage?.url ? [{ url: story.heroImage.url }] : [],
    },
  }
}

export default async function StoryDetailPage({
  params,
  searchParams,
}: StoryDetailPageProps) {
  const { slug } = await params
  const { locale: localeParam, preview } = await searchParams
  const locale = (await getSiteLocale(localeParam)) as SiteLocale
  const isPreview = preview === 'true'
  const isAuthorized = isPreview ? await canUserPreview() : false

  const [detailData, ads] = await Promise.all([
    getStoryDetail(slug, locale, {
      preview: isPreview,
      canPreview: isAuthorized,
    }),
    getAdvertisements(locale),
  ])

  if (!detailData) {
    return notFound()
  }

  const { story, toc } = detailData
  const categoryIds = story.category.id ? [story.category.id] : []
  const relatedStories = await getRelatedStories(story.id, categoryIds, locale)

  const primaryAd = ads[0]
  const secondaryAd = ads[1]
  const isAmharic = locale === 'am'
  const tags = story.tags || []

  return (
    <article className="story-detail-page bg-background text-foreground min-h-screen pb-20">
      {/* 1. Preview Banner (Only shown to authenticated staff during preview) */}
      {isPreview && isAuthorized && (
        <div className="sticky top-0 z-50 bg-amber-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="bg-white text-amber-700 px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase">
              {isAmharic ? 'ቅድመ-ዕይታ' : 'Live Preview'}
            </span>
            <span>
              {isAmharic
                ? 'ይህ ጽሑፍ በረቂቅ ደረጃ ላይ ነው (ያልታተመ)።'
                : 'Viewing unpublished draft revision in real-time.'}
            </span>
          </div>
          <Link
            href={`/admin/collections/articles/${story.id}`}
            className="text-white underline text-xs hover:text-amber-100"
          >
            {isAmharic ? 'ወደ አርታዒው ተመለስ' : 'Back to Editor'}
          </Link>
        </div>
      )}

      {/* 2. Breadcrumbs navigation */}
      <nav
        aria-label={isAmharic ? 'የዳሰሳ መስመር' : 'Breadcrumb'}
        className="w-full bg-card text-card-foreground border-b border-border py-2.5"
      >
        <div className="container-site flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto no-scrollbar">
          <Link href="/" className="hover:text-foreground transition-colors">
            {isAmharic ? 'መነሻ' : 'Home'}
          </Link>
          <ChevronRight size={12} className="shrink-0" />
          <Link href="/stories" className="hover:text-foreground transition-colors">
            {isAmharic ? 'ታሪኮች' : 'Stories'}
          </Link>
          <ChevronRight size={12} className="shrink-0" />
          <span className="text-foreground font-medium truncate max-w-md">
            {story.title}
          </span>
        </div>
      </nav>

      {/* 3. Hero Header Banner */}
      <section className="relative w-full h-[400px] sm:h-[480px] md:h-[540px] lg:h-[600px] overflow-hidden bg-black flex flex-col justify-end">
        {story.heroImage.url ? (
          <div className="absolute inset-0 z-0">
            <Image
              src={story.heroImage.url}
              alt={story.heroImage.alt || story.title}
              fill
              priority
              unoptimized={story.heroImage.url.startsWith('http')}
              className="object-cover object-center"
            />
            {/* Photographic Scrims for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}

        {/* Hero Overlay Content (Photographic contrast: white text on dark scrim) */}
        <div className="container-site relative z-10 text-white pb-8 sm:pb-10">
          <div className="max-w-4xl">
            {/* Category Tag */}
            {story.category.name && (
              <div className="mb-3">
                <span className="text-xs uppercase tracking-[0.2em] font-bold text-amber-400 drop-shadow-sm">
                  {story.category.name}
                </span>
              </div>
            )}

            {/* Headline */}
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12] mb-4 drop-shadow-sm">
              {story.title}
            </h1>

            {/* Subtitle / Excerpt */}
            {story.excerpt && (
              <p className="text-sm sm:text-base md:text-lg text-stone-200 font-sans leading-relaxed max-w-2xl text-balance drop-shadow-xs mb-6">
                {story.excerpt}
              </p>
            )}

            {/* Meta Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/20">
              <div className="flex items-center gap-3 sm:gap-6 flex-wrap text-xs sm:text-sm text-stone-200">
                <div className="flex items-center gap-2.5">
                  {story.author.avatar ? (
                    <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-white/40">
                      <Image
                        src={story.author.avatar}
                        alt={story.author.name}
                        fill
                        unoptimized={story.author.avatar.startsWith('http')}
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
                      {story.author.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-white block">
                      {isAmharic ? `በ ${story.author.name}` : `By ${story.author.name}`}
                    </span>
                    <span className="text-[11px] text-stone-300">
                      {story.publishedDate ? `${story.publishedDate} • ` : ''}
                      {story.readTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Social Share Bar (Inline photographic variant) */}
              <SocialShareBar title={story.title} variant="inline" locale={locale} />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Main Body Container (3 Columns: Dynamic TOC | Article Content | Sidebar) */}
      <div className="container-site mt-10 sm:mt-14">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
          {/* Left Column: Dynamic Sticky Table of Contents (Only rendered if headings exist) */}
          {toc.length > 0 && (
            <aside className="hidden xl:block w-48 shrink-0 sticky top-24">
              <TableOfContents items={toc} locale={locale} />
            </aside>
          )}

          {/* Center Column: Actual CMS Article Content */}
          <main className="flex-1 min-w-0 max-w-3xl space-y-8 bg-card text-card-foreground p-6 sm:p-10 rounded-xs shadow-xs border border-border">
            {/* Lead Excerpt Callout */}
            {story.excerpt && (
              <div className="pl-5 border-l-4 border-foreground/70 py-1">
                <p className="font-serif text-lg sm:text-xl italic text-foreground leading-relaxed">
                  {story.excerpt}
                </p>
              </div>
            )}

            {/* Real Payload Lexical Content styled with .prose-editorial */}
            {story.richText ? (
              <div className="prose-editorial">
                <RichText data={story.richText} converters={articleJSXConverters} />
              </div>
            ) : (
              <p className="text-muted-foreground italic text-sm">
                {isAmharic ? 'የጽሑፉ ይዘት ባዶ ነው።' : 'No article content available.'}
              </p>
            )}
          </main>

          {/* Right Column: Sidebar */}
          <aside className="w-full lg:w-[320px] xl:w-[360px] shrink-0 space-y-8">
            {/* Primary Real Advertisement */}
            {primaryAd && <AdvertisementCard ad={primaryAd} variant="sidebar" />}

            {/* Genuinely Related Published Stories */}
            <RelatedStoriesWidget items={relatedStories} locale={locale} />

            {/* Secondary Real Advertisement */}
            {secondaryAd && <AdvertisementCard ad={secondaryAd} variant="sidebar" />}

            {/* Newsletter Subscription Widget */}
            <NewsletterWidget locale={locale} />

            {/* Genuine Tags Widget (Only if tags exist) */}
            {tags.length > 0 && (
              <div className="tags-widget pt-2">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xs uppercase tracking-[0.16em] font-bold text-foreground whitespace-nowrap">
                    {isAmharic ? 'መለያዎች' : 'Tags'}
                  </h3>
                  <span className="h-[1px] bg-border flex-1" />
                </div>

                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/stories?category=${encodeURIComponent(tag.toLowerCase())}`}
                      className="px-3 py-1.5 rounded-xs bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground text-xs font-medium transition-colors cursor-pointer border border-border"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Share This Story Widget */}
            <SocialShareBar title={story.title} variant="sidebar" locale={locale} />
          </aside>
        </div>
      </div>
    </article>
  )
}
