import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { MapPin, Award, Calendar, Mountain, ChevronRight } from 'lucide-react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { articleJSXConverters } from '@/components/richText/converters'
import {
  getDestinationBySlug,
  getRelatedDestinations,
} from '@/lib/site/destinations'
import { getAdvertisements } from '@/lib/site/advertisements'
import { getSiteLocale } from '@/lib/site/locale'
import DestinationGallery from '@/components/site/destinations/DestinationGallery'
import QuickInfoCard from '@/components/site/destinations/QuickInfoCard'
import TopAttractionsGrid from '@/components/site/destinations/TopAttractionsGrid'
import DestinationLocationMap from '@/components/site/destinations/DestinationLocationMap'
import RecommendedTripCard from '@/components/site/destinations/RecommendedTripCard'
import RelatedDestinationsWidget from '@/components/site/destinations/RelatedDestinationsWidget'
import DestinationAdRotator from '@/components/site/DestinationAdRotator'
import NewsletterWidget from '@/components/site/NewsletterWidget'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ locale?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const { locale: localeParam } = await searchParams
  const locale = await getSiteLocale(localeParam)
  const siteUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

  const destination = await getDestinationBySlug(slug, locale)

  if (!destination) {
    return {
      metadataBase: new URL(siteUrl),
      title: 'Destination Not Found | Ethiopia Travel Journal',
    }
  }

  const canonicalUrl = `${siteUrl}/destinations/${slug}${locale === 'am' ? '?locale=am' : ''}`

  return {
    metadataBase: new URL(siteUrl),
    title: `${destination.title} — Travel Guide | Ethiopia Travel Journal`,
    description: destination.overview || destination.title,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${siteUrl}/destinations/${slug}`,
        am: `${siteUrl}/destinations/${slug}?locale=am`,
      },
    },
    openGraph: {
      title: `${destination.title} — Ethiopia Travel Journal`,
      description: destination.overview || destination.title,
      images: destination.heroImage?.url
        ? [
            {
              url: destination.heroImage.url,
              alt: destination.heroImage.alt || destination.title,
            },
          ]
        : [],
    },
  }
}

export default async function DestinationDetailPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { locale: localeParam } = await searchParams
  const locale = await getSiteLocale(localeParam)

  const destination = await getDestinationBySlug(slug, locale)

  if (!destination) {
    notFound()
  }

  const [relatedDestinations, ads] = await Promise.all([
    getRelatedDestinations(slug, destination.region, locale, 2),
    getAdvertisements(locale, 'destination_detail'),
  ])

  const isAm = locale === 'am'
  const withLoc = (href: string) => `${href}${isAm ? '?locale=am' : ''}`
  const hasHeroImage = Boolean(destination.heroImage?.url)

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {hasHeroImage ? (
        /* 1. Hero Photographic Header with Restrained Scrim */
        <section className="relative overflow-hidden bg-stone-950 text-white min-h-[360px] md:min-h-[440px] flex flex-col justify-between border-b border-border/40">
          <div className="absolute inset-0 z-0">
            <Image
              src={destination.heroImage!.url}
              alt={destination.heroImage!.alt || destination.title}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center brightness-90 contrast-105"
            />
            {/* Restrained directional scrim: keeps photograph vibrant while ensuring readable text */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
          </div>

          {/* Top Breadcrumbs Strip */}
          <div className="relative z-10 container-site py-4 border-b border-white/10">
            <nav
              aria-label={isAm ? 'የመንገድ ማሳያ' : 'Breadcrumb'}
              className="flex items-center gap-2 text-xs text-stone-300"
            >
              <Link href={withLoc('/')} className="hover:text-white transition-colors">
                {isAm ? 'ዋና ገጽ' : 'Home'}
              </Link>
              <ChevronRight className="h-3 w-3 opacity-60" />
              <Link
                href={withLoc('/destinations')}
                className="hover:text-white transition-colors"
              >
                {isAm ? 'መዳረሻዎች' : 'Destinations'}
              </Link>
              <ChevronRight className="h-3 w-3 opacity-60" />
              <span className="font-semibold text-white truncate">{destination.title}</span>
            </nav>
          </div>

          {/* Hero Title & Badges Overlay */}
          <div className="relative z-10 container-site py-10 md:py-16 max-w-4xl">
            {/* Category Badge */}
            {destination.categoryName && (
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center rounded-full bg-amber-500/25 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 border border-amber-400/40 backdrop-blur-xs">
                  {destination.categoryName}
                </span>
              </div>
            )}

            {/* Large Editorial Title */}
            <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-sm">
              {destination.title}
            </h1>

            {/* Subtitle / Overview */}
            {destination.overview && (
              <p className="mt-3 text-base sm:text-lg md:text-xl leading-relaxed text-stone-200 font-light max-w-2xl drop-shadow-xs">
                {destination.overview}
              </p>
            )}

            {/* Metadata Badges Row */}
            <div className="flex flex-wrap items-center gap-2.5 pt-4">
              {destination.regionName && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-stone-200 border border-white/15 backdrop-blur-xs">
                  <MapPin className="h-3.5 w-3.5 text-amber-400" />
                  <span>{destination.regionName}</span>
                </div>
              )}

              {destination.travelInfo?.isUnescoSite && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-stone-200 border border-white/15 backdrop-blur-xs">
                  <Award className="h-3.5 w-3.5 text-emerald-400" />
                  <span>UNESCO World Heritage</span>
                </div>
              )}

              {destination.travelInfo?.bestTimeToVisit && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-stone-200 border border-white/15 backdrop-blur-xs">
                  <Calendar className="h-3.5 w-3.5 text-blue-400" />
                  <span>
                    {isAm ? 'ምርጥ ጊዜ፡ ' : 'Best: '}
                    {destination.travelInfo.bestTimeToVisit}
                  </span>
                </div>
              )}

              {destination.travelInfo?.altitudeMeters !== undefined &&
                destination.travelInfo?.altitudeMeters !== null && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-stone-200 border border-white/15 backdrop-blur-xs">
                    <Mountain className="h-3.5 w-3.5 text-purple-400" />
                    <span>{destination.travelInfo.altitudeMeters.toLocaleString()}m</span>
                  </div>
                )}
            </div>
          </div>
        </section>
      ) : (
        /* Neutral Empty State when heroImage is absent */
        <>
          <div className="border-b border-border/60 bg-muted/20">
            <div className="container-site py-4">
              <nav
                aria-label={isAm ? 'የመንገድ ማሳያ' : 'Breadcrumb'}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Link href={withLoc('/')} className="hover:text-foreground transition-colors">
                  {isAm ? 'ዋና ገጽ' : 'Home'}
                </Link>
                <ChevronRight className="h-3 w-3 opacity-50" />
                <Link
                  href={withLoc('/destinations')}
                  className="hover:text-foreground transition-colors"
                >
                  {isAm ? 'መዳረሻዎች' : 'Destinations'}
                </Link>
                <ChevronRight className="h-3 w-3 opacity-50" />
                <span className="font-semibold text-foreground truncate">{destination.title}</span>
              </nav>
            </div>
          </div>

          <div className="container-site pt-8">
            <div className="max-w-4xl space-y-4">
              {destination.categoryName && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-500 border border-amber-500/30">
                    {destination.categoryName}
                  </span>
                </div>
              )}

              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground">
                {destination.title}
              </h1>

              {destination.overview && (
                <p className="text-lg md:text-xl leading-relaxed text-muted-foreground font-light">
                  {destination.overview}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {destination.regionName && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-3 py-1 text-xs font-medium text-secondary-foreground">
                    <MapPin className="h-3.5 w-3.5 text-amber-500" />
                    <span>{destination.regionName}</span>
                  </div>
                )}

                {destination.travelInfo?.isUnescoSite && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-3 py-1 text-xs font-medium text-secondary-foreground">
                    <Award className="h-3.5 w-3.5 text-emerald-500" />
                    <span>UNESCO World Heritage</span>
                  </div>
                )}

                {destination.travelInfo?.bestTimeToVisit && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-3 py-1 text-xs font-medium text-secondary-foreground">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <span>
                      {isAm ? 'ምርጥ ጊዜ፡ ' : 'Best: '}
                      {destination.travelInfo.bestTimeToVisit}
                    </span>
                  </div>
                )}

                {destination.travelInfo?.altitudeMeters !== undefined &&
                  destination.travelInfo?.altitudeMeters !== null && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-3 py-1 text-xs font-medium text-secondary-foreground">
                      <Mountain className="h-3.5 w-3.5 text-purple-500" />
                      <span>{destination.travelInfo.altitudeMeters.toLocaleString()}m</span>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content Area (Using div to preserve single main landmark from layout.tsx) */}
      <div className="container-site pt-8">
        {/* Photo Gallery Strip */}
        <DestinationGallery
          gallery={destination.gallery}
          title={destination.title}
          locale={locale}
        />

        {/* Split Main Content & Sidebar Layout */}
        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Main Content Column (2/3) */}
          <div className="lg:col-span-2 space-y-10">
            {/* Database-Driven Advertisement Rotator (Renders only if eligible ads exist) */}
            {ads && ads.length > 0 && (
              <DestinationAdRotator
                ads={ads}
                locale={locale}
                destinationTitle={destination.title}
                placement="destination_detail"
              />
            )}

            {/* "About [Destination]" Section */}
            {destination.content ? (
              <section
                aria-label={isAm ? `ስለ ${destination.title}` : `About ${destination.title}`}
                className="space-y-6"
              >
                <div className="border-b-2 border-amber-500/60 pb-2">
                  <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground">
                    {isAm ? `ስለ ${destination.title}` : `About ${destination.title}`}
                  </h2>
                </div>

                <div className="prose-editorial">
                  <RichText data={destination.content} converters={articleJSXConverters} />
                </div>
              </section>
            ) : destination.overview && hasHeroImage ? (
              <section
                aria-label={isAm ? `ስለ ${destination.title}` : `About ${destination.title}`}
                className="space-y-6"
              >
                <div className="border-b-2 border-amber-500/60 pb-2">
                  <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground">
                    {isAm ? `ስለ ${destination.title}` : `About ${destination.title}`}
                  </h2>
                </div>

                <div className="space-y-4 text-base leading-relaxed text-muted-foreground font-normal">
                  <p>{destination.overview}</p>
                </div>
              </section>
            ) : null}

            {/* Quick Information Box */}
            <QuickInfoCard destination={destination} locale={locale} />

            {/* Top Attractions in Destination */}
            <TopAttractionsGrid
              attractions={destination.attractions}
              destinationTitle={destination.title}
              locale={locale}
            />
          </div>

          {/* Sidebar Column (1/3) */}
          <aside aria-label={isAm ? 'ተጨማሪ መረጃ' : 'Sidebar'} className="space-y-8">
            {/* Mini Map & GPS Directions */}
            <DestinationLocationMap
              latitude={destination.coordinates?.latitude}
              longitude={destination.coordinates?.longitude}
              destinationTitle={destination.title}
              regionName={destination.regionName}
              locale={locale}
            />

            {/* Recommended Accommodation */}
            <RecommendedTripCard
              accommodation={destination.recommendedAccommodation}
              locale={locale}
            />

            {/* Related Destinations */}
            <RelatedDestinationsWidget
              destinations={relatedDestinations}
              locale={locale}
            />

            {/* Travel Inspiration Newsletter Signup */}
            <NewsletterWidget
              title={isAm ? 'የጉዞ ማነቃቂያ' : 'Travel Inspiration'}
              subtitle={
                isAm
                  ? 'የጉዞ ታሪኮችን እና የውስጥ መረጃዎችን በኢሜይልዎ ያግኙ።'
                  : 'Subscribe to our newsletter for travel stories, hidden gems, and insider guides delivered to your inbox.'
              }
              locale={locale}
              source="destination_detail_sidebar"
            />
          </aside>
        </div>
      </div>
    </div>
  )
}
