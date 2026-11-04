'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { AdvertisementItem } from '@/lib/site/advertisements'

type AdvertisementCardProps = {
  ad: AdvertisementItem
  variant?: 'sidebar' | 'inline' | 'hero'
  className?: string
}

export default function AdvertisementCard({
  ad,
  variant: _variant = 'sidebar',
  className = '',
}: AdvertisementCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isTopRight = ad.badgePosition === 'top-right'

  return (
    <aside
      className={`group relative overflow-hidden rounded-xs border border-border bg-card text-card-foreground shadow-xs transition-all duration-300 hover:shadow-md ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`Sponsored: ${ad.title}`}
    >
      {/* Background Image Container */}
      <div className="relative w-full h-[280px] sm:h-[320px] overflow-hidden bg-muted">
        {ad.image?.url ? (
          <Image
            src={ad.image.url}
            alt={ad.image.alt || ad.title}
            fill
            unoptimized={ad.image.url.startsWith('http')}
            sizes="(min-width: 1024px) 340px, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            Advertisement
          </div>
        )}

        {/* Photographic Scrims (Preserves intentional photographic contrast for readability) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/25" />

        {/* Ambient subtle warm sheen on hover */}
        <div
          className={`absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none transition-opacity duration-500 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* "Ad" Sponsored Badge (Overlaid on photograph) */}
        <div
          className={`absolute top-3 ${
            isTopRight ? 'right-3' : 'left-3'
          } z-10 flex items-center gap-1 px-2.5 py-1 rounded-xs bg-black/80 text-white backdrop-blur-xs shadow-xs border border-white/10`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
          </span>
          <span className="text-[10px] font-bold tracking-wider uppercase">
            {ad.badge || 'Ad'}
          </span>
        </div>

        {/* Content Overlay (White text over dark scrim) */}
        <div className="absolute inset-0 p-6 flex flex-col justify-end text-white z-10">
          <h4 className="font-serif text-xl sm:text-2xl font-semibold leading-snug tracking-tight text-white drop-shadow-sm group-hover:underline">
            {ad.title}
          </h4>

          {ad.description && (
            <p className="text-xs sm:text-sm text-stone-200 mt-2 line-clamp-2 leading-relaxed font-sans drop-shadow-xs">
              {ad.description}
            </p>
          )}

          <div className="mt-4 pt-1">
            <Link
              href={ad.ctaLink}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xs bg-white hover:bg-stone-100 text-stone-900 text-xs font-bold uppercase tracking-wider shadow-sm transition-all duration-200 active:scale-95"
            >
              <span>{ad.ctaText}</span>
              <ArrowRight
                size={14}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  )
}
