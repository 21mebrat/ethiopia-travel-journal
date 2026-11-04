import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import HeroCarousel from '@/components/site/HeroCarousel'
import StoryCard from '@/components/site/StoryCard'
import { getHomepageContent } from '@/lib/site/home'
import { getSiteLocale, type SiteLocale } from '@/lib/site/locale'

type HomeSearchParams = Promise<{
  locale?: string
  q?: string
  category?: string
  view?: string
}>

const COPY: Record<
  SiteLocale,
  {
    explore: string
    featured: string
    destinations: string
    deck: string
    destinationDeck: string
    viewAll: string
    showFewer: string
    clear: string
    results: (query: string) => string
    empty: string
    browseAll: string
    saveStory: string
    removeStory: string
    saveDestination: string
    removeDestination: string
  }
> = {
  en: {
    explore: 'Explore',
    featured: 'Featured Stories',
    destinations: 'Featured Destinations',
    deck: 'Inspiring journeys, cultural insights, and unforgettable places from across Ethiopia.',
    destinationDeck: 'Historic sites, highland landscapes, and the places that give every story its ground.',
    viewAll: 'View all stories',
    showFewer: 'Show fewer stories',
    clear: 'Clear filters',
    results: (query) => `Stories matching “${query}”`,
    empty: 'New stories from across Ethiopia are being prepared. Please check back soon.',
    browseAll: 'Browse all stories',
    saveStory: 'Save story',
    removeStory: 'Remove saved story',
    saveDestination: 'Save destination',
    removeDestination: 'Remove saved destination',
  },
  am: {
    explore: 'ያስሱ',
    featured: 'የተመረጡ ታሪኮች',
    destinations: 'የተመረጡ መዳረሻዎች',
    deck: 'ከመላው ኢትዮጵያ የተገኙ አነሳሽ ጉዞዎች፣ የባሕል ግንዛቤዎች እና የማይረሱ ቦታዎች።',
    destinationDeck: 'ታሪካዊ ቦታዎች፣ የደጋማ መልክዓ ምድር እና ለየትኛውም ታሪክ መሠረት የሚሆኑ ቦታዎች።',
    viewAll: 'ሁሉንም ታሪኮች ይመልከቱ',
    showFewer: 'ያነሱ ታሪኮችን አሳይ',
    clear: 'ማጣሪያዎችን አጽዳ',
    results: (query) => `ከ“${query}” ጋር የሚዛመዱ ታሪኮች`,
    empty: 'ከመላው ኢትዮጵያ አዲስ ታሪኮች በመዘጋጀት ላይ ናቸው። እባክዎ በቅርቡ ይመልከቱ።',
    browseAll: 'ሁሉንም ታሪኮች ያስሱ',
    saveStory: 'ታሪኩን አስቀምጥ',
    removeStory: 'የተቀመጠውን ታሪክ አስወግድ',
    saveDestination: 'መዳረሻውን አስቀምጥ',
    removeDestination: 'የተቀመጠውን መዳረሻ አስወግድ',
  },
}

function filterHref(locale: SiteLocale, args: { q?: string; category?: string; view?: string }) {
  const params = new URLSearchParams({ locale })
  if (args.q) params.set('q', args.q)
  if (args.category) params.set('category', args.category)
  if (args.view) params.set('view', args.view)
  return `/?${params.toString()}#featured-stories`
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: HomeSearchParams
}): Promise<Metadata> {
  const { locale: localeParam } = await searchParams
  const locale = await getSiteLocale(localeParam)

  return {
    title:
      locale === 'am'
        ? 'የኢትዮጵያ ጉዞ ማስታወሻ — ታሪኮች፣ ባሕል እና መዳረሻዎች'
        : 'Ethiopia Travel Journal — Stories, Culture & Destinations',
    description:
      locale === 'am'
        ? 'ከመላው ኢትዮጵያ የተገኙ የጉዞ ታሪኮች፣ የባሕል ቅርስ እና የመዳረሻ መመሪያዎች።'
        : 'Inspiring journeys, cultural insights, and unforgettable places from across Ethiopia.',
    alternates: {
      languages: {
        en: '/?locale=en',
        am: '/?locale=am',
      },
    },
  }
}

export default async function HomePage({ searchParams }: { searchParams: HomeSearchParams }) {
  const params = await searchParams
  const locale = await getSiteLocale(params.locale)
  const copy = COPY[locale]

  const content = await getHomepageContent({
    locale,
    query: params.q,
    category: params.category,
    view: params.view,
  })

  const categoryName = content.activeCategory?.name
  const isDestinationView = content.view === 'destinations'
  const hasFilter = Boolean(content.query || categoryName)

  const deck = content.query
    ? copy.results(content.query)
    : categoryName
      ? content.activeCategory?.description || copy.deck
      : isDestinationView
        ? copy.destinationDeck
        : copy.deck

  const viewAllHref =
    content.view === 'all'
      ? filterHref(locale, { category: params.category })
      : filterHref(locale, { category: params.category, view: 'all' })

  return (
    <div className="home-page">
      {content.heroSlides.length > 0 ? (
        <HeroCarousel slides={content.heroSlides} locale={locale} />
      ) : (
        <section className="home-hero home-hero--empty">
          <div className="container-site home-hero__inner">
            <div className="home-hero__copy">
              <p className="home-hero__kicker kicker">
                <span>{copy.explore}</span>
                <span className="home-hero__rule" aria-hidden="true" />
              </p>
              <h1 className="headline home-hero__title">
                {locale === 'am' ? 'የኢትዮጵያ ጉዞ ማስታወሻ' : 'Ethiopia Travel Journal'}
              </h1>
              <p className="home-hero__excerpt">{copy.deck}</p>
            </div>
          </div>
        </section>
      )}

      <section className="home-section" id="featured-stories" aria-labelledby="home-section-title">
        <div className="container-site">
          <div className="home-section__head">
            <div>
              <p className="home-section__kicker kicker">
                <span>{copy.explore}</span>
                <span className="home-section__rule" aria-hidden="true" />
              </p>
              <h2 id="home-section-title" className="headline home-section__title">
                {isDestinationView ? copy.destinations : copy.featured}
              </h2>
              <p className="deck home-section__deck">{deck}</p>
            </div>

            <div className="home-section__actions">
              {content.view !== 'destinations' && (
                <Link className="home-section__view-all kicker" href={viewAllHref}>
                  {content.view === 'all' ? copy.showFewer : copy.viewAll}
                  <span aria-hidden="true">→</span>
                </Link>
              )}
              {hasFilter && (
                <Link className="home-section__clear kicker" href={filterHref(locale, { view: params.view })}>
                  {copy.clear}
                </Link>
              )}
            </div>
          </div>

          {content.cards.length > 0 ? (
            <div className="story-grid">
              {content.cards.map((card, index) => (
                <StoryCard
                  key={card.id}
                  card={card}
                  locale={locale}
                  itemType={isDestinationView ? 'destination' : 'story'}
                  priority={index < 2}
                />
              ))}
            </div>
          ) : (
            <div className="home-empty">
              <p className="deck">{copy.empty}</p>
              <Link href={filterHref(locale, { view: 'all' })} className="home-section__view-all kicker">
                {copy.browseAll}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
