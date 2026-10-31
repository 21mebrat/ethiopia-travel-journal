import React from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { articleJSXConverters } from '@/components/richText/converters'
import { getAdvertisementBySlug } from '@/lib/site/advertisements'
import { getSiteLocale, type SiteLocale } from '@/lib/site/locale'

type AdvertisementPageProps = {
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
}: AdvertisementPageProps): Promise<Metadata> {
  const { slug } = await params
  const { locale: localeParam } = await searchParams
  const locale = (await getSiteLocale(localeParam)) as SiteLocale
  const ad = await getAdvertisementBySlug(slug, locale)

  if (!ad) {
    return { title: 'Advertisement Not Found | Ethiopia Travel Journal' }
  }

  return {
    title: `${ad.title} | Ethiopia Travel Journal`,
    description: ad.title,
    alternates: {
      canonical: `/advertisement/${slug}`,
    },
  }
}

export default async function AdvertisementDetailPage({
  params,
  searchParams,
}: AdvertisementPageProps) {
  const { slug } = await params
  const { locale: localeParam } = await searchParams
  const locale = (await getSiteLocale(localeParam)) as SiteLocale
  const ad = await getAdvertisementBySlug(slug, locale)

  if (!ad) {
    return notFound()
  }

  const isAmharic = locale === 'am'
  const heroImage = ad.heroImage && typeof ad.heroImage === 'object' ? ad.heroImage : null

  return (
    <article className="advertisement-detail-page bg-background text-foreground min-h-screen pb-20">
      {/* 1. Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
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
            {ad.title}
          </span>
        </div>
      </nav>

      {/* 2. Hero Banner */}
      <section className="relative w-full h-[320px] sm:h-[400px] overflow-hidden bg-black flex flex-col justify-end">
        {heroImage?.url ? (
          <div className="absolute inset-0 z-0">
            <Image
              src={heroImage.url}
              alt={heroImage.alt || ad.title}
              fill
              priority
              unoptimized={heroImage.url.startsWith('http')}
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}

        <div className="container-site relative z-10 text-white pb-8">
          <div className="max-w-3xl">
            <div className="mb-2">
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-amber-400">
                {isAmharic ? 'ማስታወቂያ' : 'Featured Partner'}
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              {ad.title}
            </h1>
          </div>
        </div>
      </section>

      {/* 3. Content Body */}
      <div className="container-site mt-10">
        <main className="max-w-3xl mx-auto bg-card text-card-foreground p-6 sm:p-10 rounded-xs border border-border shadow-xs">
          {ad.content ? (
            <div className="prose-editorial">
              <RichText data={ad.content} converters={articleJSXConverters} />
            </div>
          ) : (
            <p className="text-muted-foreground italic text-sm">
              {isAmharic ? 'የማስታወቂያው ዝርዝር አልተገኘም።' : 'No advertisement details available.'}
            </p>
          )}
        </main>
      </div>
    </article>
  )
}
