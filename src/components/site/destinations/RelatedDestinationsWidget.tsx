'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { DestinationItem } from '@/lib/site/destinations-types'
import type { SiteLocale } from '@/lib/site/locale'

type RelatedDestinationsWidgetProps = {
  destinations: DestinationItem[]
  locale?: SiteLocale
}

export default function RelatedDestinationsWidget({
  destinations,
  locale = 'en',
}: RelatedDestinationsWidgetProps) {
  if (!destinations || destinations.length === 0) return null

  const isAm = locale === 'am'

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card p-5 text-card-foreground shadow-sm">
      <h4 className="font-serif text-lg font-bold text-foreground pb-3">
        {isAm ? 'ተዛማጅ መዳረሻዎች' : 'Related Destinations'}
      </h4>

      <div className="space-y-3.5 divide-y divide-border/40">
        {destinations.map((dest) => {
          const detailHref = `/destinations/${dest.slug}${isAm ? '?locale=am' : ''}`
          return (
            <div key={dest.id} className="group flex items-center justify-between gap-3 pt-3.5 first:pt-0">
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {dest.heroImage?.url ? (
                    <Image
                      src={dest.heroImage.url}
                      alt={dest.title}
                      fill
                      sizes="56px"
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground/40 text-[10px]">
                      {dest.title.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h5 className="font-serif text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    <Link href={detailHref}>{dest.title}</Link>
                  </h5>
                  <span className="text-xs text-muted-foreground">{dest.regionName}</span>
                </div>
              </div>

              <Link
                href={detailHref}
                aria-label={`View ${dest.title}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
