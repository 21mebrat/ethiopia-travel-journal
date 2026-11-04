'use client'

import React from 'react'
import Link from 'next/link'
import { MapPin, Navigation, ExternalLink } from 'lucide-react'
import { isValidCoordinate } from '@/lib/site/destinations-types'
import type { SiteLocale } from '@/lib/site/locale'

type DestinationLocationMapProps = {
  latitude?: number | null
  longitude?: number | null
  destinationTitle: string
  regionName: string
  locale?: SiteLocale
}

export default function DestinationLocationMap({
  latitude,
  longitude,
  destinationTitle,
  regionName,
  locale = 'en',
}: DestinationLocationMapProps) {
  if (!isValidCoordinate(latitude, longitude)) {
    return null
  }

  const isAm = locale === 'am'
  const latNum = Number(latitude)
  const lngNum = Number(longitude)

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latNum},${lngNum}`)}`

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card p-5 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between pb-3">
        <h4 className="font-serif text-lg font-bold text-foreground">
          {isAm ? 'አካባቢ እና አቅጣጫ' : 'Location & Coordinates'}
        </h4>
        <span className="text-xs font-mono text-muted-foreground">
          {latNum.toFixed(4)}°N, {lngNum.toFixed(4)}°E
        </span>
      </div>

      {/* Stylized Visual GPS Mini Map */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center">
        {/* Stylized grid pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />

        {/* Center Pulsing Location Pin */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-stone-950 shadow-xl ring-4 ring-amber-400/30">
            <MapPin className="h-5 w-5" />
            <span className="absolute -inset-1 rounded-full bg-amber-400/40 animate-ping pointer-events-none" />
          </div>
          <span className="mt-2 rounded-md bg-black/80 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs backdrop-blur-xs">
            {destinationTitle}
          </span>
          {regionName && (
            <span className="text-[10px] text-stone-500 font-medium">{regionName}</span>
          )}
        </div>
      </div>

      {/* Get Directions Button */}
      <div className="mt-4">
        <Link
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-secondary-foreground transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Navigation className="h-4 w-4" />
          <span>{isAm ? 'አቅጣጫ አሳይ' : 'Get Directions'}</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </Link>
      </div>
    </div>
  )
}
