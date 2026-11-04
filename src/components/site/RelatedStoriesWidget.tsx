'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { RelatedStoryItem } from '@/lib/site/stories'

type RelatedStoriesWidgetProps = {
  items: RelatedStoryItem[]
  locale?: string
  className?: string
}

export default function RelatedStoriesWidget({
  items,
  locale = 'en',
  className = '',
}: RelatedStoriesWidgetProps) {
  const isAmharic = locale === 'am'

  if (!items || items.length === 0) {
    return (
      <section className={`related-stories-widget mb-8 ${className}`} aria-label="Related Stories">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 flex-1">
            <h3 className="text-xs uppercase tracking-[0.16em] font-bold text-foreground whitespace-nowrap">
              {isAmharic ? 'ተዛማጅ ታሪኮች' : 'Related Stories'}
            </h3>
            <span className="h-[1px] bg-border flex-1" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground italic">
          {isAmharic ? 'ተዛማጅ ታሪኮች አልተገኙም።' : 'No related stories found at this time.'}
        </p>
      </section>
    )
  }

  return (
    <section className={`related-stories-widget mb-8 ${className}`} aria-label="Related Stories">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-1">
          <h3 className="text-xs uppercase tracking-[0.16em] font-bold text-foreground whitespace-nowrap">
            {isAmharic ? 'ተዛማጅ ታሪኮች' : 'Related Stories'}
          </h3>
          <span className="h-[1px] bg-border flex-1" />
        </div>
        <Link
          href="/stories"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>{isAmharic ? 'ሁሉንም እይ' : 'View All'}</span>
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* List */}
      <div className="space-y-4">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/stories/${item.slug}`}
            className="group flex gap-3.5 items-start transition-colors"
          >
            {/* Thumbnail */}
            <div className="relative w-20 h-16 rounded-xs overflow-hidden bg-muted shrink-0">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  unoptimized={item.image.startsWith('http')}
                  sizes="80px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                  ETJ
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-serif text-xs sm:text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:underline transition-colors">
                {item.title}
              </h4>
              <p className="text-[11px] text-muted-foreground mt-1">
                {item.date ? `${item.date} • ` : ''}
                {item.readTime}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
