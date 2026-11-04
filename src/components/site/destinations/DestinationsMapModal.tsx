'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, MapPin, ExternalLink, Navigation, Compass } from 'lucide-react'
import type { DestinationItem } from '@/lib/site/destinations-types'
import type { SiteLocale } from '@/lib/site/locale'

type DestinationsMapModalProps = {
  isOpen: boolean
  onClose: () => void
  destinations: DestinationItem[]
  locale?: SiteLocale
}

export default function DestinationsMapModal({
  isOpen,
  onClose,
  destinations,
  locale = 'en',
}: DestinationsMapModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const triggerElementRef = useRef<HTMLElement | null>(null)

  // Derive selected destination from current results
  const validDestinations = destinations.filter((d) => d.coordinates !== undefined)
  const selectedDestination =
    validDestinations.find((d) => d.id === selectedId) ||
    validDestinations[0] ||
    null

  const isAm = locale === 'am'

  // Focus management, Esc key, scroll locking, and focus restoration
  useEffect(() => {
    if (!isOpen) return

    triggerElementRef.current = document.activeElement as HTMLElement
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    if (closeButtonRef.current) {
      closeButtonRef.current.focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
      if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
        triggerElementRef.current.focus()
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Map latitude/longitude to SVG viewport percentage
  // Ethiopia approx: Lat 3.5°N to 15°N, Long 33°E to 48°E
  const getPinPosition = (lat: number, lon: number) => {
    const minLat = 3.5
    const maxLat = 15.0
    const minLon = 33.0
    const maxLon = 48.0

    const y = ((maxLat - lat) / (maxLat - minLat)) * 80 + 10
    const x = ((lon - minLon) / (maxLon - minLon)) * 80 + 10

    return {
      left: `${Math.max(5, Math.min(95, x))}%`,
      top: `${Math.max(5, Math.min(95, y))}%`,
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-modal-title"
      ref={dialogRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 md:p-8 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative flex flex-col h-full max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <h2 id="map-modal-title" className="font-serif text-xl font-bold text-foreground">
                {isAm ? 'የኢትዮጵያ መዳረሻዎች ካርታ' : 'Interactive Ethiopia Destinations Map'}
              </h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Compass className="h-3 w-3 text-amber-500" />
                <span>
                  {isAm
                    ? 'አስተዋዋቂ ካርታ • በGPS መጋጠሚያዎች ላይ የተመሠረተ'
                    : 'Illustrative Geographic Map • Derived from GPS Coordinates'}
                </span>
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={isAm ? 'ዝጋ' : 'Close map'}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Content: Split View on Desktop */}
        <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-3">
          {/* Main Map Canvas (Span 2 on lg, 1 on mobile) */}
          <div className="relative col-span-1 lg:col-span-2 flex items-center justify-center bg-muted/50 p-6 overflow-hidden">
            <svg
              viewBox="0 0 500 400"
              className="h-full w-full max-h-[600px] select-none drop-shadow-md"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Illustrative Ethiopia Map Outline"
            >
              {/* Detailed Ethiopia Country Boundary */}
              <path
                d="M 160 50 L 260 30 L 330 90 L 460 180 L 410 270 L 300 360 L 210 370 L 140 300 L 110 190 L 120 100 Z"
                className="fill-muted stroke-border/80"
                strokeWidth="2.5"
              />
              <path
                d="M 180 110 L 250 120 L 300 180 M 140 200 L 250 220 L 330 260"
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeDasharray="5 5"
                strokeWidth="2"
              />
            </svg>

            {/* Destination Pins on Map */}
            {validDestinations.map((dest) => {
              if (!dest.coordinates) return null
              const pos = getPinPosition(
                dest.coordinates.latitude,
                dest.coordinates.longitude,
              )
              const isSelected = selectedDestination?.id === dest.id

              return (
                <button
                  key={dest.id}
                  type="button"
                  onClick={() => setSelectedId(dest.id)}
                  style={{ left: pos.left, top: pos.top }}
                  aria-label={`Select ${dest.title}`}
                  className={`group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-full transition-all duration-300 ${
                    isSelected ? 'z-30 scale-125' : 'z-10 hover:scale-115'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full shadow-lg transition-colors ${
                      isSelected
                        ? 'bg-amber-500 text-stone-950 ring-4 ring-amber-400/40'
                        : 'bg-primary text-primary-foreground hover:bg-amber-500 hover:text-stone-950'
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span
                    className={`mt-1 max-w-[100px] truncate rounded-md px-1.5 py-0.5 text-[10px] font-bold shadow-md ${
                      isSelected
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-black/80 text-white backdrop-blur-xs'
                    }`}
                  >
                    {dest.title}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Right Panel: Selected Destination Details */}
          <div className="flex flex-col justify-between border-t border-border bg-card p-6 lg:border-t-0 lg:border-l overflow-y-auto">
            {selectedDestination ? (
              <div className="space-y-4">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-muted">
                  {selectedDestination.heroImage?.url ? (
                    <Image
                      src={selectedDestination.heroImage.url}
                      alt={selectedDestination.heroImage.alt || selectedDestination.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                      <MapPin className="h-10 w-10 opacity-30" />
                    </div>
                  )}
                  {selectedDestination.regionName && (
                    <div className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                      {selectedDestination.regionName}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-serif text-2xl font-bold text-foreground">
                    {selectedDestination.title}
                  </h3>
                  {selectedDestination.coordinates && (
                    <p className="mt-1 text-xs font-mono text-muted-foreground">
                      {selectedDestination.coordinates.latitude.toFixed(4)}°N,{' '}
                      {selectedDestination.coordinates.longitude.toFixed(4)}°E
                    </p>
                  )}
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {selectedDestination.overview}
                  </p>
                </div>

                {/* Optional practical metrics */}
                {(selectedDestination.travelInfo?.bestTimeToVisit ||
                  selectedDestination.travelInfo?.altitudeMeters !== undefined) && (
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/60 pt-3">
                    {selectedDestination.travelInfo?.bestTimeToVisit && (
                      <div className="rounded-xl bg-muted/60 p-2.5">
                        <span className="block text-[10px] uppercase font-bold text-muted-foreground">
                          {isAm ? 'ምርጥ ጊዜ' : 'Best Season'}
                        </span>
                        <span className="font-semibold text-foreground">
                          {selectedDestination.travelInfo.bestTimeToVisit}
                        </span>
                      </div>
                    )}
                    {selectedDestination.travelInfo?.altitudeMeters !== undefined && (
                      <div className="rounded-xl bg-muted/60 p-2.5">
                        <span className="block text-[10px] uppercase font-bold text-muted-foreground">
                          {isAm ? 'ከፍታ' : 'Altitude'}
                        </span>
                        <span className="font-semibold text-foreground">
                          {selectedDestination.travelInfo.altitudeMeters.toLocaleString()}m
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2">
                  <Link
                    href={`/destinations/${selectedDestination.slug}${isAm ? '?locale=am' : ''}`}
                    onClick={onClose}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-md transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span>{isAm ? 'ሙሉ መረጃ ይመልከቱ' : 'View Full Guide'}</span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isAm
                  ? 'በካርታው ላይ የሚታይ መዳረሻ የለም።'
                  : 'No destination coordinates available for current filter.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
