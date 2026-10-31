import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import {
  getDestinations,
  getMapDestinations,
  getFeaturedDestination,
  getDestinationRegionCounts,
} from '@/lib/site/destinations'
import { getAdvertisements } from '@/lib/site/advertisements'
import { getSiteLocale } from '@/lib/site/locale'
import DestinationsListingContent from '@/components/site/destinations/DestinationsListingContent'

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolvedParams = await searchParams
  const locale = await getSiteLocale(
    typeof resolvedParams.locale === 'string' ? resolvedParams.locale : undefined,
  )
  const siteUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const canonicalUrl = `${siteUrl}/destinations${locale === 'am' ? '?locale=am' : ''}`

  return {
    metadataBase: new URL(siteUrl),
    title:
      locale === 'am'
        ? 'የኢትዮጵያ መዳረሻዎች | የጉዞ ማስታወሻ'
        : 'Destinations of Ethiopia | Ethiopia Travel Journal',
    description:
      locale === 'am'
        ? 'ጥንታዊ ታሪካዊ ቦታዎችን፣ አስደናቂ የተፈጥሮ ገጽታዎችን እና ደማቅ ባህሎችን በመላው ኢትዮጵያ ያስሱ።'
        : 'Discover ancient historic sites, dramatic landscapes, and vibrant cultures across diverse regions of Ethiopia.',
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${siteUrl}/destinations`,
        am: `${siteUrl}/destinations?locale=am`,
      },
    },
  }
}

export default async function DestinationsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const locale = await getSiteLocale(
    typeof resolvedParams.locale === 'string' ? resolvedParams.locale : undefined,
  )
  const category = typeof resolvedParams.category === 'string' ? resolvedParams.category : 'all'
  const region = typeof resolvedParams.region === 'string' ? resolvedParams.region : 'all'
  const sort = typeof resolvedParams.sort === 'string' ? resolvedParams.sort : 'featured'
  const rawPage = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page, 10) : 1
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1

  const search =
    typeof resolvedParams.q === 'string'
      ? resolvedParams.q
      : typeof resolvedParams.search === 'string'
        ? resolvedParams.search
        : undefined

  const [destResult, featuredDestination, regionCounts, mapDestinations, listingAds] =
    await Promise.all([
      getDestinations({
        category,
        region,
        sort,
        search,
        locale,
        page,
        limit: 6,
      }),
      getFeaturedDestination(locale),
      getDestinationRegionCounts(locale),
      getMapDestinations({
        category,
        region,
        search,
        locale,
      }),
      getAdvertisements(locale, 'destination_listing'),
    ])

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <DestinationsListingContent
        destinations={destResult.destinations}
        mapDestinations={mapDestinations}
        featuredDestination={featuredDestination}
        regionCounts={regionCounts}
        currentCategory={category}
        currentRegion={region}
        currentSort={sort}
        currentPage={destResult.page}
        totalPages={destResult.totalPages}
        locale={locale}
        ads={listingAds}
      />
    </Suspense>
  )
}
