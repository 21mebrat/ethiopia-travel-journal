'use client'

import React, { useState, Suspense } from 'react'
import Image from 'next/image'
import type { DestinationItem, RegionCount } from '@/lib/site/destinations-types'
import type { AdvertisementItem } from '@/lib/site/advertisements'
import type { SiteLocale } from '@/lib/site/locale'
import DestinationCard from './DestinationCard'
import DestinationsFilterBar from './DestinationsFilterBar'
import ExploreByRegionWidget from './ExploreByRegionWidget'
import FeaturedDestinationWidget from './FeaturedDestinationWidget'
import DestinationsMapModal from './DestinationsMapModal'
import DestinationsPagination from './DestinationsPagination'
import DestinationAdRotator from '@/components/site/DestinationAdRotator'
import NewsletterWidget from '@/components/site/NewsletterWidget'

type DestinationsListingContentProps = {
  destinations: DestinationItem[]
  mapDestinations: DestinationItem[]
  featuredDestination: DestinationItem | null
  regionCounts: RegionCount[]
  currentCategory: string
  currentRegion: string
  currentSort: string
  currentPage: number
  totalPages: number
  locale: SiteLocale
  ads?: AdvertisementItem[]
}

export default function DestinationsListingContent({
  destinations,
  mapDestinations,
  featuredDestination,
  regionCounts,
  currentCategory,
  currentRegion,
  currentSort,
  currentPage,
  totalPages,
  locale,
  ads = [],
}: DestinationsListingContentProps) {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const isAm = locale === 'am'

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Panoramic Banner */}
      <section className="relative overflow-hidden bg-stone-950 py-20 md:py-28 text-white border-b border-border/40">
        <div className="absolute inset-0 z-0">
          <Image
            src="/assets/Lalibela.webp"
            alt="Ethiopia Destinations Panorama"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center brightness-90 contrast-105"
          />
          {/* Restrained directional scrim: keeps photograph vibrant while ensuring readable text */}
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>

        <div className="container-site relative z-10 text-center max-w-4xl mx-auto px-4">
          <span className="inline-block rounded-full bg-amber-500/20 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-amber-300 border border-amber-500/30 mb-4 backdrop-blur-xs">
            {isAm ? 'የኢትዮጵያ መዳረሻዎች' : 'Destinations of Ethiopia'}
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-sm">
            {isAm ? 'ኢትዮጵያን ያስሱ' : 'Explore Ethiopia'}
          </h1>
          <p className="mt-4 text-base sm:text-lg md:text-xl leading-relaxed text-stone-200 font-light max-w-2xl mx-auto drop-shadow-xs">
            {isAm
              ? 'ጥንታዊ ታሪካዊ ቦታዎችን፣ አስደናቂ የተፈጥሮ ገጽታዎችን እና ደማቅ ባህሎችን በተለያዩ ክልሎች ያግኙ።'
              : 'Discover ancient historic sites, dramatic landscapes, and vibrant cultures across diverse regions.'}
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container-site py-10 md:py-14">
        {/* Filter Bar */}
        <Suspense fallback={<div className="h-12 w-full rounded-xl bg-muted/40 mb-8" />}>
          <DestinationsFilterBar
            currentCategory={currentCategory}
            currentRegion={currentRegion}
            currentSort={currentSort}
            locale={locale}
            isMapOpen={isMapModalOpen}
            onToggleMap={() => setIsMapModalOpen(true)}
          />
        </Suspense>

        {/* 2-Column Main Layout: Grid (2/3) + Sidebar (1/3) */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Main Grid: Destinations (2 columns on lg) */}
          <div className="lg:col-span-2">
            {destinations.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {destinations.map((dest) => (
                    <DestinationCard key={dest.id} destination={dest} locale={locale} />
                  ))}
                </div>
                <DestinationsPagination
                  page={currentPage}
                  totalPages={totalPages}
                  locale={locale}
                />
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
                <p className="text-base font-semibold text-foreground">
                  {isAm
                    ? 'ምንም የተገኘ መዳረሻ የለም።'
                    : 'No destinations found matching your filters.'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isAm
                    ? 'እባክዎ ሌሎች ማጣሪያዎችን ይሞክሩ።'
                    : 'Try clearing your filters to explore other regions.'}
                </p>
              </div>
            )}
          </div>

          {/* Right Sidebar (1 column) */}
          <aside aria-label={isAm ? 'ተጨማሪ መረጃ' : 'Sidebar'} className="space-y-8">
            {/* Explore by Region Interactive Map */}
            <Suspense fallback={<div className="h-64 rounded-2xl bg-muted/40" />}>
              <ExploreByRegionWidget
                regionCounts={regionCounts}
                currentRegion={currentRegion}
                locale={locale}
              />
            </Suspense>

            {/* Featured Destination */}
            <FeaturedDestinationWidget
              destination={featuredDestination}
              locale={locale}
            />

            {/* Database-driven Destination Advertisement (Rotator) */}
            {ads && ads.length > 0 && (
              <DestinationAdRotator
                ads={ads}
                locale={locale}
                placement="destination_listing"
              />
            )}

            {/* Travel Inspiration Newsletter Signup */}
            <NewsletterWidget
              title={isAm ? 'የጉዞ ማነቃቂያ' : 'Travel Inspiration'}
              subtitle={
                isAm
                  ? 'የጉዞ ታሪኮችን፣ ድብቅ ድንቆችን እና የውስጥ መረጃዎችን በኢሜይልዎ ያግኙ።'
                  : 'Subscribe to our newsletter for travel stories, hidden gems, and insider guides delivered to your inbox.'
              }
              locale={locale}
              source="destinations_sidebar"
            />
          </aside>
        </div>
      </div>

      {/* Interactive Map Modal */}
      <DestinationsMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        destinations={mapDestinations}
        locale={locale}
      />
    </div>
  )
}
