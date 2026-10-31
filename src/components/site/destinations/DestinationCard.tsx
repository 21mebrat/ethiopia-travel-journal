'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, ArrowUpRight } from 'lucide-react'
import type { DestinationItem } from '@/lib/site/destinations-types'
import type { SiteLocale } from '@/lib/site/locale'

type DestinationCardProps = {
  destination: DestinationItem
  locale?: SiteLocale
}

export default function DestinationCard({ destination, locale = 'en' }: DestinationCardProps) {
  const detailHref = `/destinations/${destination.slug}${locale === 'am' ? '?locale=am' : ''}`

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-xl hover:border-border">
      {/* Photo Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {destination.heroImage?.url ? (
          <Image
            src={destination.heroImage.url}
            alt={destination.heroImage.alt || destination.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground/40">
            <MapPin className="h-10 w-10 stroke-1" />
          </div>
        )}
        {/* Subtle dark gradient for high contrast badge */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

        {/* Region Badge top-left */}
        <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-md border border-white/20">
          <MapPin className="h-3 w-3 text-amber-400" />
          <span>{destination.regionName}</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <h3 className="font-serif text-2xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
            <Link href={detailHref} className="focus-visible:outline-none focus-visible:underline">
              {destination.title}
            </Link>
          </h3>

          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {destination.overview}
          </p>
        </div>

        {/* Tags & Action Row */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/50 pt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {destination.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center rounded-md bg-secondary/80 px-2.5 py-1 text-[11px] font-medium text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          <Link
            href={detailHref}
            aria-label={`View ${destination.title}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105"
          >
            <ArrowUpRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </article>
  )
}
