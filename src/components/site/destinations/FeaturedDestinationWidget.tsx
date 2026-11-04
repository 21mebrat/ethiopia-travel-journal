'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { DestinationItem } from '@/lib/site/destinations-types'
import type { SiteLocale } from '@/lib/site/locale'

type FeaturedDestinationWidgetProps = {
  destination: DestinationItem | null
  locale?: SiteLocale
}

export default function FeaturedDestinationWidget({
  destination,
  locale = 'en',
}: FeaturedDestinationWidgetProps) {
  if (!destination) return null

  const isAm = locale === 'am'
  const detailHref = `/destinations/${destination.slug}${isAm ? '?locale=am' : ''}`

  return (
    <div className="group overflow-hidden rounded-2xl border border-border/70 bg-card p-5 text-card-foreground shadow-sm transition-all duration-300 hover:shadow-lg">
      <div className="flex items-center justify-between pb-3">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{isAm ? 'ተመራጭ መዳረሻ' : 'Featured Destination'}</span>
        </span>
      </div>

      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted">
        {destination.heroImage?.url ? (
          <Image
            src={destination.heroImage.url}
            alt={destination.title}
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground/40">
            <Sparkles className="h-8 w-8 stroke-1" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className="absolute bottom-3 left-3 text-xs font-medium text-white/90">
          {destination.regionName}
        </span>
      </div>

      <div className="mt-4">
        <h4 className="font-serif text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
          <Link href={detailHref}>{destination.title}</Link>
        </h4>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {destination.overview}
        </p>

        <div className="mt-4">
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:underline"
          >
            <span>{isAm ? 'መዳረሻውን ያስሱ' : 'Explore Destination'}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  )
}
