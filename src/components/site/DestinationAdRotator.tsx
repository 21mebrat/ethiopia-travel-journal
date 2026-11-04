'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Sparkles,
  Plane,
  ShieldCheck,
  Pause,
  Play,
} from 'lucide-react'
import type { AdvertisementItem } from '@/lib/site/advertisements'
import type { SiteLocale } from '@/lib/site/locale'

type DestinationAdRotatorProps = {
  ads: AdvertisementItem[]
  locale?: SiteLocale
  destinationTitle?: string
  className?: string
  placement?: string
}

export default function DestinationAdRotator({
  ads,
  locale = 'en',
  destinationTitle,
  className = '',
}: DestinationAdRotatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const deadlineRef = useRef<number>(0)
  const remainingRef = useRef<number>(0)

  const isAm = locale === 'am'

  // If no ads exist, do not render an advertisement slot
  if (!ads || ads.length === 0) {
    return null
  }

  // Bound index safely in case ads array changes dynamically
  const safeIndex = currentIndex < ads.length ? currentIndex : 0
  const currentAd = ads[safeIndex]

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [])

  const advanceToNext = useCallback(() => {
    if (ads.length <= 1) return
    setCurrentIndex((prev) => (prev + 1) % ads.length)
  }, [ads.length])

  // Deadline and elapsed-time tracking for rotation
  useEffect(() => {
    // Single ad: display without timers or rotation
    if (ads.length <= 1) return

    // If reduced motion is requested, pause automatic rotation
    if (prefersReducedMotion) return

    const duration = currentAd.durationMs || 10000
    deadlineRef.current = Date.now() + duration
    remainingRef.current = duration

    const interval = setInterval(() => {
      // Pause conditions: manual pause, mouse hover, or active keyboard focus inside ad
      if (isPaused || isHovered || isFocused) {
        remainingRef.current = Math.max(0, deadlineRef.current - Date.now())
        return
      }

      // Check if user has active focus inside container
      if (
        containerRef.current &&
        document.activeElement &&
        containerRef.current.contains(document.activeElement)
      ) {
        return
      }

      const now = Date.now()
      if (now >= deadlineRef.current) {
        advanceToNext()
      }
    }, 250)

    // Hidden-tab handling: avoid rapid catch-up flashes on tab return
    const handleVisibilityChange = () => {
      if (document.hidden) {
        remainingRef.current = Math.max(0, deadlineRef.current - Date.now())
      } else {
        // Upon returning, if deadline already elapsed while hidden, advance once smoothly
        if (Date.now() >= deadlineRef.current) {
          advanceToNext()
        } else {
          // Otherwise resume with whatever time was remaining
          deadlineRef.current = Date.now() + remainingRef.current
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [ads.length, currentAd.id, currentAd.durationMs, isPaused, isHovered, isFocused, prefersReducedMotion, advanceToNext])

  const label = currentAd.badge || (isAm ? 'ስፖንሰር የተደረገ' : 'SPONSORED')
  const isAirline = currentAd.variant === 'airline'

  return (
    <div
      ref={containerRef}
      className={`relative group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsFocused(false)
        }
      }}
    >
      {/* Rotation Control Strip (rendered only when multiple ads exist) */}
      {ads.length > 1 && (
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground font-sans">
          <div className="flex items-center gap-1.5">
            {ads.map((ad, idx) => (
              <button
                key={ad.id}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx)
                  deadlineRef.current = Date.now() + (ad.durationMs || 10000)
                }}
                aria-label={
                  isAm
                    ? `ማስታወቂያ ${idx + 1} ከ ${ads.length}`
                    : `View advertisement ${idx + 1} of ${ads.length}`
                }
                aria-current={idx === safeIndex ? 'true' : undefined}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === safeIndex
                    ? 'w-6 bg-amber-500'
                    : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            aria-label={
              isPaused
                ? isAm
                  ? 'ማስታወቂያዎችን ማሽከርከር ቀጥል'
                  : 'Resume advertisement rotation'
                : isAm
                  ? 'ማስታወቂያዎችን ማሽከርከር አቁም'
                  : 'Pause advertisement rotation'
            }
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {isPaused ? (
              <>
                <Play className="h-3 w-3 text-amber-500" />
                <span>{isAm ? 'አጫውት' : 'Resume'}</span>
              </>
            ) : (
              <>
                <Pause className="h-3 w-3" />
                <span>{isAm ? 'አቁም' : 'Pause'}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Ad Card Container: airline variant vs standard/lodge card */}
      {isAirline ? (
        <section
          aria-label={label}
          className="group relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-stone-900 via-neutral-900 to-black p-6 md:p-8 text-white shadow-xl transition-all duration-300 hover:border-amber-500/40 hover:shadow-2xl"
        >
          {/* Ambient Glows */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-600/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-amber-600/15 blur-3xl" />

          <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            {/* Left Copy */}
            <div className="max-w-xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold tracking-wider text-amber-300 border border-amber-500/30">
                  <Plane className="h-3.5 w-3.5" />
                  <span className="uppercase text-[10px] tracking-widest">{label}</span>
                </span>
              </div>

              <h3 className="font-serif text-2xl md:text-3xl font-extrabold tracking-tight text-stone-100">
                {currentAd.title}
              </h3>

              {currentAd.description && (
                <p className="text-sm md:text-base leading-relaxed text-stone-300">
                  {currentAd.description}
                </p>
              )}

              {/* Verified partner badge */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-1.5 rounded-lg bg-stone-800/80 px-3 py-1 text-xs font-medium text-stone-200 border border-stone-700/60">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{isAm ? 'የተረጋገጠ አጋር' : 'Verified Partner'}</span>
                </div>
              </div>
            </div>

            {/* Flight trajectory illustration */}
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
                  {(destinationTitle || currentAd.title).substring(0, 3).toUpperCase()}
                </span>
              </div>
            </div>

            {/* CTA Link Button */}
            <div className="w-full sm:w-auto shrink-0 flex flex-col items-start sm:items-end gap-2">
              <Link
                href={currentAd.ctaLink}
                target={currentAd.ctaLink.startsWith('http') ? '_blank' : undefined}
                rel={currentAd.ctaLink.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="ad-shimmer-btn inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-stone-950 shadow-lg shadow-amber-500/20 transition-all duration-300 hover:shadow-amber-500/40 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <span>{currentAd.ctaText}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <aside
          aria-label={label}
          className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card text-card-foreground shadow-lg transition-all duration-300 hover:shadow-2xl hover:border-border"
        >
          {/* Background Image Container */}
          <div className="relative h-64 w-full overflow-hidden bg-muted">
            {currentAd.image?.url ? (
              <Image
                src={currentAd.image.url}
                alt={currentAd.image.alt || currentAd.title}
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-cover transition-transform duration-700 animate-ken-burns group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted/60 text-muted-foreground text-xs">
                {label}
              </div>
            )}

            {/* Restrained Scrims for text contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

            {/* Live Sponsor Beacon */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md border border-white/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] tracking-widest">{label}</span>
            </div>

            {/* Curated Tag */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-200 backdrop-blur-md border border-amber-400/30">
              <Sparkles className="h-3 w-3 text-amber-300" />
              <span>{isAm ? 'የተመረጠ' : 'Curated'}</span>
            </div>
          </div>

          {/* Card Copy & CTA */}
          <div className="relative p-6 bg-card">
            <h3 className="font-serif text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
              {currentAd.title}
            </h3>
            {currentAd.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                {currentAd.description}
              </p>
            )}

            <div className="mt-5">
              <Link
                href={currentAd.ctaLink}
                target={currentAd.ctaLink.startsWith('http') ? '_blank' : undefined}
                rel={currentAd.ctaLink.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="ad-shimmer-btn inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm transition-all duration-300 hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>{currentAd.ctaText}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}
