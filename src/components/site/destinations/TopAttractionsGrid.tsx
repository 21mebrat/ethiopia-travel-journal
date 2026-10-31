'use client'

import React from 'react'
import Image from 'next/image'
import type { DestinationItem } from '@/lib/site/destinations-types'
import type { SiteLocale } from '@/lib/site/locale'

type TopAttractionsGridProps = {
  attractions: DestinationItem['attractions']
  destinationTitle: string
  locale?: SiteLocale
}

export default function TopAttractionsGrid({
  attractions,
  destinationTitle,
  locale = 'en',
}: TopAttractionsGridProps) {
  if (!attractions || attractions.length === 0) return null

  const isAm = locale === 'am'
  const title = isAm
    ? `በ${destinationTitle} ውስጥ ያሉ ዋና መስህቦች`
    : `Top Attractions in ${destinationTitle}`

  return (
    <section aria-label={title} className="my-12">
      <div className="flex items-center justify-between border-b border-border/80 pb-4 mb-6">
        <h3 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {attractions.map((attraction, index) => (
          <div
            key={index}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-lg hover:border-border"
          >
            {attraction.image?.url && (
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                <Image
                  src={attraction.image.url}
                  alt={attraction.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              </div>
            )}

            <div className="flex flex-1 flex-col justify-between p-5">
              <div>
                <h4 className="font-serif text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                  {attraction.name}
                </h4>
                {attraction.description && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                    {attraction.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
