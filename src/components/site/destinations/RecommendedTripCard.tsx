'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, ExternalLink, Sparkles, Building2 } from 'lucide-react'
import type { DestinationItem } from '@/lib/site/destinations-types'
import type { SiteLocale } from '@/lib/site/locale'

type RecommendedTripCardProps = {
  accommodation?: DestinationItem['recommendedAccommodation']
  locale?: SiteLocale
}

export default function RecommendedTripCard({
  accommodation,
  locale = 'en',
}: RecommendedTripCardProps) {
  if (!accommodation || !accommodation.name) return null

  const isAm = locale === 'am'
  const rating = typeof accommodation.rating === 'number' ? accommodation.rating : undefined
  const reviewCount =
    typeof accommodation.reviewCount === 'number' ? accommodation.reviewCount : undefined

  return (
    <div className="group overflow-hidden rounded-2xl border border-border/70 bg-card p-5 text-card-foreground shadow-sm transition-all duration-300 hover:shadow-lg">
      <div className="flex items-center gap-1.5 pb-3 text-xs font-bold uppercase tracking-wider text-amber-500">
        <Sparkles className="h-3.5 w-3.5" />
        <span>{isAm ? 'ለጉዞዎ የተመከረ' : 'Recommended for Your Trip'}</span>
      </div>

      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted flex items-center justify-center">
        {accommodation.image?.url ? (
          <Image
            src={accommodation.image.url}
            alt={accommodation.name}
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <Building2 className="h-10 w-10 text-muted-foreground/40" />
        )}
        {accommodation.category && (
          <div className="absolute top-3 left-3 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
            {accommodation.category}
          </div>
        )}
      </div>

      <div className="mt-4">
        <h4 className="font-serif text-xl font-bold text-foreground group-hover:text-primary transition-colors">
          {accommodation.name}
        </h4>

        {/* Rating stars & review count */}
        {(rating !== undefined || reviewCount !== undefined) && (
          <div className="mt-2 flex items-center gap-2">
            {rating !== undefined && (
              <div className="flex items-center text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => {
                  const isFilled = i < Math.round(rating)
                  return (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        isFilled
                          ? 'fill-current text-amber-400'
                          : 'text-stone-300 dark:text-stone-700'
                      }`}
                    />
                  )
                })}
              </div>
            )}
            {rating !== undefined && (
              <span className="text-xs font-semibold text-foreground">
                {rating.toFixed(1)}
              </span>
            )}
            {reviewCount !== undefined && (
              <span className="text-xs text-muted-foreground">
                ({reviewCount} {isAm ? 'ግምገማዎች' : 'reviews'})
              </span>
            )}
          </div>
        )}

        {accommodation.description && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {accommodation.description}
          </p>
        )}

        {/* Valid booking link only */}
        {accommodation.link ? (
          <div className="mt-4">
            <Link
              href={accommodation.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-xs transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{isAm ? 'ዝርዝር ይመልከቱ' : 'View Details'}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}
