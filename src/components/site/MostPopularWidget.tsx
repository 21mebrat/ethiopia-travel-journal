'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { PopularStoryItem } from '@/lib/site/stories'

type MostPopularWidgetProps = {
  items: PopularStoryItem[]
  locale?: string
  className?: string
}

export default function MostPopularWidget({
  items,
  locale = 'en',
  className = '',
}: MostPopularWidgetProps) {
  if (!items || items.length === 0) return null
  const isAmharic = locale === 'am'

  return (
    <section className={`most-popular-widget mb-8 ${className}`} aria-label="Most Popular Stories">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-xs uppercase tracking-[0.16em] font-bold text-foreground whitespace-nowrap">
          {isAmharic ? 'ተወዳጅ ታሪኮች' : 'Most Popular'}
        </h3>
        <span className="h-[1px] bg-border flex-1" />
      </div>

      {/* List */}
      <ol className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.slug} className="py-3 first:pt-0 last:pb-0">
            <Link
              href={`/stories/${item.slug}`}
              className="group flex items-center gap-3.5 transition-colors"
            >
              {/* Number Rank */}
              <span className="font-serif text-lg font-bold text-foreground/80 shrink-0 w-6">
                {item.rank}
              </span>

              {/* Thumbnail Image */}
              <div className="relative w-16 h-12 rounded-xs overflow-hidden bg-muted shrink-0">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    unoptimized={item.image.startsWith('http')}
                    sizes="64px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                    ETJ
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="flex-1 min-w-0">
                <h4 className="font-serif text-xs sm:text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:underline transition-colors">
                  {item.title}
                </h4>
                {item.readTime && (
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    {item.readTime}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
