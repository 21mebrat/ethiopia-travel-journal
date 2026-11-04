'use client'

import React from 'react'
import Link from 'next/link'
import { Plane, Star, ArrowRight, ShieldCheck } from 'lucide-react'

type AnimatedFlightAdProps = {
  destinationTitle?: string
  locale?: 'en' | 'am'
  bookingUrl?: string
}

export default function AnimatedFlightAd({
  destinationTitle = 'Ethiopia',
  locale = 'en',
  bookingUrl = 'https://www.ethiopianairlines.com',
}: AnimatedFlightAdProps) {
  const isAm = locale === 'am'

  const title = isAm
    ? `ወደ ${destinationTitle} ይብረሩ`
    : `FLY TO ${destinationTitle.toUpperCase()}`

  const subtitle = isAm
    ? 'በኢትዮጵያ አየር መንገድ የሀገር ውስጥ እና ዓለም አቀፍ በረራዎችን ያስይዙ።'
    : 'Book domestic and international flights with Ethiopian Airlines for seamless travel across the country.'

  const officialCarrier = isAm ? 'ብሔራዊ አየር መንገድ' : 'Official Carrier'
  const ctaText = isAm ? 'በረራዎን ያስይዙ' : 'BOOK YOUR FLIGHT'

  return (
    <section
      aria-label="Ethiopian Airlines Flight Offer"
      className="group relative my-10 overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-stone-900 via-neutral-900 to-black p-6 md:p-8 text-white shadow-xl transition-all duration-300 hover:border-amber-500/40 hover:shadow-2xl"
    >
      {/* Decorative ambient radial glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-amber-600/15 blur-3xl" />

      <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
        {/* Left Column: Verified Information */}
        <div className="max-w-xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold tracking-wider text-amber-300 border border-amber-500/30">
              <Plane className="h-3.5 w-3.5" />
              <span className="uppercase text-[10px] tracking-widest">{officialCarrier}</span>
            </span>
            <span className="text-xs text-stone-400">Ethiopian Airlines</span>
          </div>

          <h3 className="font-serif text-2xl md:text-3xl font-extrabold tracking-tight text-stone-100">
            {title}
          </h3>

          <p className="text-sm md:text-base leading-relaxed text-stone-300">
            {subtitle}
          </p>

          {/* Verified Badges */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-1.5 rounded-lg bg-stone-800/80 px-3 py-1 text-xs font-medium text-stone-200 border border-stone-700/60">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>{isAm ? 'የሀገር ውስጥ በረራዎች' : 'Domestic Network'}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-stone-800/80 px-3 py-1 text-xs font-medium text-stone-200 border border-stone-700/60">
              <Star className="h-3.5 w-3.5 text-amber-400" />
              <span>Star Alliance Member</span>
            </div>
          </div>
        </div>

        {/* Center: Animated Flight Trajectory Graphic */}
        <div className="hidden xl:flex flex-col items-center justify-center px-4" aria-hidden="true">
          <div className="flex items-center gap-3 text-xs font-mono font-semibold tracking-wider text-stone-300">
            <span className="rounded bg-stone-800 px-2 py-0.5 border border-stone-700">ADD</span>
            <div className="relative w-40 flex items-center justify-center">
              <svg className="h-8 w-full overflow-visible" viewBox="0 0 160 30" fill="none">
                <path
                  d="M 5 22 Q 80 2 155 22"
                  stroke="rgba(251, 191, 36, 0.4)"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  className="animate-trail-dash"
                />
              </svg>
              <div className="absolute animate-flight-glide">
                <Plane className="h-5 w-5 text-amber-400 transform rotate-45 drop-shadow-md" />
              </div>
            </div>
            <span className="rounded bg-stone-800 px-2 py-0.5 border border-stone-700 text-amber-300">
              {destinationTitle.substring(0, 3).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Right Column: CTA Button */}
        <div className="w-full sm:w-auto shrink-0 flex flex-col items-start sm:items-end gap-2">
          <Link
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ad-shimmer-btn inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-stone-950 shadow-lg shadow-amber-500/20 transition-all duration-300 hover:shadow-amber-500/40 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <span>{ctaText}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="text-[11px] text-stone-400">
            Official Star Alliance Carrier
          </span>
        </div>
      </div>
    </section>
  )
}
