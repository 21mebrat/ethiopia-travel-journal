'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { AdvertisementItem } from '@/lib/site/advertisements'

type AnimatedLodgeAdProps = {
  ad?: AdvertisementItem | null
  locale?: 'en' | 'am'
  title?: string
  subtitle?: string
  ctaText?: string
  ctaLink?: string
  imageUrl?: string
  sponsorLabel?: string
}

export default function AnimatedLodgeAd({
  ad,
  locale = 'en',
  title: defaultTitle,
  subtitle: defaultSubtitle,
  ctaText: defaultCtaText,
  ctaLink: defaultCtaLink,
  imageUrl: defaultImageUrl,
  sponsorLabel,
}: AnimatedLodgeAdProps) {
  const isAm = locale === 'am'

  const title =
    ad?.title ||
    defaultTitle ||
    (isAm ? 'የኢትዮጵያን ድንቆች በቅርበት ያግኙ' : "Stay Closer to Ethiopia's Wonders")

  const subtitle =
    ad?.description ||
    defaultSubtitle ||
    (isAm
      ? 'በአስደናቂ መዳረሻዎች ዙሪያ የቅንጦት ሎጆችን እና ለአካባቢ ተስማሚ ሪዞርቶችን ይለማመዱ።'
      : 'Experience luxury lodges and eco-friendly resorts across breathtaking destinations.')

  const ctaText =
    ad?.ctaText || defaultCtaText || (isAm ? 'ሎጆችን ያስሱ' : 'EXPLORE LODGES')

  const ctaLink = ad?.ctaLink || defaultCtaLink || '/destinations?category=cultural_experiences'

  const imageUrl =
    ad?.image?.url ||
    defaultImageUrl ||
    '/assets/laiblela_feast.jpeg'

  const label = sponsorLabel || (isAm ? 'ስፖንሰር የተደረገ' : 'SPONSORED')
  const badge = ad?.badge || label

  return (
    <aside
      aria-label={label}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card text-card-foreground shadow-lg transition-all duration-300 hover:shadow-2xl hover:border-border"
    >
      {/* Background Image Container with Ken Burns effect */}
      <div className="relative h-64 w-full overflow-hidden bg-muted">
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover transition-transform duration-700 animate-ken-burns group-hover:scale-110"
        />
        {/* Editorial gradient overlays for high text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

        {/* Live Sponsor Beacon */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md border border-white/20">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[10px] tracking-widest">{badge}</span>
        </div>

        {/* Curated Badge */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-200 backdrop-blur-md border border-amber-400/30">
          <Sparkles className="h-3 w-3 text-amber-300" />
          <span>Curated Stays</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="relative p-6 bg-card">
        <h3 className="font-serif text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {subtitle}
        </p>

        {/* Animated Shimmer CTA Button with Valid Link */}
        <div className="mt-5">
          <Link
            href={ctaLink}
            className="ad-shimmer-btn inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm transition-all duration-300 hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>{ctaText}</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </aside>
  )
}
