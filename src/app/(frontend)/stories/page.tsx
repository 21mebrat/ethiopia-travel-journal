import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import StoriesFilterBar from '@/components/site/StoriesFilterBar'
import JournalStoryCard from '@/components/site/JournalStoryCard'
import FeaturedStoryWidget from '@/components/site/FeaturedStoryWidget'
import MostPopularWidget from '@/components/site/MostPopularWidget'
import AdvertisementCard from '@/components/site/AdvertisementCard'
import NewsletterWidget from '@/components/site/NewsletterWidget'
import { getStoriesList, getCategoriesList } from '@/lib/site/stories'
import { getAdvertisements } from '@/lib/site/advertisements'
import { getSiteLocale, type SiteLocale } from '@/lib/site/locale'

type StoriesPageProps = {
  searchParams: Promise<{
    locale?: string
    category?: string
    sort?: string
    page?: string
  }>
}

export async function generateMetadata({ searchParams }: StoriesPageProps): Promise<Metadata> {
  const { locale: localeParam } = await searchParams
  const locale = await getSiteLocale(localeParam)

  return {
    title:
      locale === 'am'
        ? 'የጉዞ ታሪኮች — የኢትዮጵያ ጉዞ ማስታወሻ'
        : 'Travel Stories from Ethiopia — Ethiopia Travel Journal',
    description:
      locale === 'am'
        ? 'ከመላው ኢትዮጵያ የተገኙ አነሳሽ ጉዞዎች፣ የባሕል ግንዛቤዎች እና የማይረሱ ቦታዎች።'
        : 'Inspiring journeys, cultural insights, practical guides, and unforgettable places from across the Land of Origins.',
  }
}

export default async function StoriesPage({ searchParams }: StoriesPageProps) {
  const params = await searchParams
  const locale = (await getSiteLocale(params.locale)) as SiteLocale
  const { category = 'all', sort = 'latest', page: pageParam = '1' } = params
  const currentPage = Math.max(1, parseInt(pageParam, 10) || 1)

  const [categories, { stories, featured, popular, totalPages, page }, ads] =
    await Promise.all([
      getCategoriesList(locale),
      getStoriesList({ locale, category, sort, page: currentPage, limit: 12 }),
      getAdvertisements(locale),
    ])

  const primaryAd = ads[0]
  const secondaryAd = ads[1]
  const isAmharic = locale === 'am'

  return (
    <div className="stories-page bg-background text-foreground pb-20">
      {/* 1. Panoramic Hero Banner */}
      <section className="relative w-full h-[320px] sm:h-[380px] md:h-[440px] overflow-hidden bg-black flex items-center">
        {/* Background Panoramic Landscape */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=1920&q=85"
            alt={isAmharic ? 'የኢትዮጵያ ተራሮችና መልክዓ ምድር' : 'Ethiopian Highlands and Mountain Range'}
            fill
            priority
            unoptimized
            className="object-cover object-center opacity-85 brightness-90"
          />
          {/* Photographic Scrims for text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
        </div>

        {/* Hero Content (White text over photographic banner) */}
        <div className="container-site relative z-10 text-white">
          <div className="max-w-2xl">
            {/* Kicker with Rule */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-amber-400">
                {isAmharic ? 'ታሪኮች' : 'Stories'}
              </span>
              <span className="w-12 h-[1px] bg-amber-400/80" />
            </div>

            {/* Headline */}
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-4">
              {isAmharic ? 'ከኢትዮጵያ የጉዞ ታሪኮች' : 'Travel Stories from Ethiopia'}
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base md:text-lg text-stone-200 font-sans leading-relaxed max-w-xl text-balance">
              {isAmharic
                ? 'ከመላው ኢትዮጵያ የተገኙ አነሳሽ ጉዞዎች፣ የባሕል ግንዛቤዎች እና የማይረሱ ቦታዎች።'
                : 'Inspiring journeys, cultural insights, practical guides, and unforgettable places from across the Land of Origins.'}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Filter & Sort Bar */}
      <Suspense fallback={<div className="w-full h-14 border-b border-border" />}>
        <StoriesFilterBar
          categories={categories}
          initialCategory={category}
          initialSort={sort}
          locale={locale}
        />
      </Suspense>

      {/* 3. Main Content Container */}
      <div className="container-site">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Main Column: Story Cards Grid */}
          <main className="flex-1 min-w-0" id="stories-grid-container">
            {stories.length > 0 ? (
              <div className="space-y-10">
                {/* 3-Column Story Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                  {stories.map((story, index) => (
                    <JournalStoryCard
                      key={story.id}
                      story={story}
                      locale={locale}
                      priority={index < 3}
                    />
                  ))}
                </div>

                {/* Optional In-Feed Real Advertisement */}
                {secondaryAd && (
                  <div className="pt-4">
                    <AdvertisementCard ad={secondaryAd} variant="inline" />
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <nav
                    aria-label={isAmharic ? 'የገጽ ማውጫ' : 'Pagination'}
                    className="flex items-center justify-center gap-2 pt-8 border-t border-border"
                  >
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1
                      const isActive = pageNum === page
                      const pageParams = new URLSearchParams()
                      if (category && category !== 'all') pageParams.set('category', category)
                      if (sort && sort !== 'latest') pageParams.set('sort', sort)
                      pageParams.set('page', String(pageNum))

                      return (
                        <Link
                          key={pageNum}
                          href={`/stories?${pageParams.toString()}`}
                          className={`w-9 h-9 rounded-xs text-xs font-semibold flex items-center justify-center transition-colors ${
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'bg-card text-card-foreground border border-border hover:bg-muted'
                          }`}
                        >
                          {pageNum}
                        </Link>
                      )
                    })}
                  </nav>
                )}
              </div>
            ) : (
              /* Honest empty state */
              <div className="text-center py-20 px-4 bg-card text-card-foreground rounded-xs border border-border">
                <p className="font-serif text-lg text-foreground">
                  {isAmharic
                    ? 'በተመረጠው ምድብ ውስጥ ምንም ታሪኮች አልተገኙም።'
                    : 'No stories found for the selected category.'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {isAmharic
                    ? 'እባክዎ "ሁሉንም ታሪኮች" ይምረጡ ወይም ማጣሪያዎን ያጽዱ።'
                    : 'Try selecting "All Stories" or clearing your filter.'}
                </p>
                <div className="mt-4">
                  <Link
                    href="/stories"
                    className="inline-flex items-center px-4 py-2 rounded-xs bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                  >
                    {isAmharic ? 'ሁሉንም ታሪኮች አሳይ' : 'Show All Stories'}
                  </Link>
                </div>
              </div>
            )}
          </main>

          {/* Right Sidebar */}
          <aside className="w-full lg:w-[320px] xl:w-[360px] shrink-0 space-y-8">
            {/* Featured Story Widget */}
            <FeaturedStoryWidget stories={featured} locale={locale} />

            {/* Most Popular Widget */}
            <MostPopularWidget items={popular} locale={locale} />

            {/* Primary Real Advertisement */}
            {primaryAd && (
              <AdvertisementCard ad={primaryAd} variant="sidebar" />
            )}

            {/* Newsletter Subscription Widget */}
            <NewsletterWidget locale={locale} />
          </aside>
        </div>
      </div>
    </div>
  )
}
