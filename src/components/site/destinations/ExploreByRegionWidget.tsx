'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { MapPin, Compass } from 'lucide-react'
import type { RegionCount } from '@/lib/site/destinations-types'
import type { SiteLocale } from '@/lib/site/locale'

type ExploreByRegionWidgetProps = {
  regionCounts: RegionCount[]
  currentRegion?: string
  locale?: SiteLocale
}

export default function ExploreByRegionWidget({
  regionCounts,
  currentRegion = 'all',
  locale = 'en',
}: ExploreByRegionWidgetProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)

  const isAm = locale === 'am'

  const selectRegion = (regionSlug: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (regionSlug === 'all') {
      params.delete('region')
    } else {
      params.set('region', regionSlug)
    }
    // Reset to page 1 on filter change
    params.delete('page')
    if (locale) params.set('locale', locale)
    router.push(`${pathname}?${params.toString()}`)
  }

  // Coordinated pins on the stylized illustrative Ethiopia map
  const regionPins = [
    { slug: 'tigray', label: isAm ? 'ትግራይ' : 'Tigray', x: '46%', y: '20%' },
    { slug: 'afar', label: isAm ? 'አፋር' : 'Afar', x: '65%', y: '32%' },
    { slug: 'amhara', label: isAm ? 'አማራ' : 'Amhara', x: '42%', y: '36%' },
    { slug: 'oromia', label: isAm ? 'ኦሮሚያ' : 'Oromia', x: '50%', y: '56%' },
    { slug: 'southern_ethiopia', label: isAm ? 'ደቡብ' : 'Southern', x: '38%', y: '72%' },
    { slug: 'somali', label: isAm ? 'ሶማሌ' : 'Somali', x: '75%', y: '60%' },
  ]

  // Filter to regions that have destinations or are actively selected
  const activeRegionCounts = regionCounts.filter(
    (rc) => rc.count > 0 || currentRegion === rc.region,
  )

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold tracking-tight text-foreground">
            {isAm ? 'በክልል ያስሱ' : 'Explore by Region'}
          </h3>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Compass className="h-3 w-3 text-amber-500" />
            <span>{isAm ? 'አስተዋዋቂ ካርታ' : 'Illustrative Map'}</span>
          </p>
        </div>
        {currentRegion !== 'all' && (
          <button
            type="button"
            onClick={() => selectRegion('all')}
            className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1"
          >
            {isAm ? 'ሁሉንም አሳይ' : 'Reset'}
          </button>
        )}
      </div>

      {/* Stylized SVG Map of Ethiopia with interactive pins */}
      <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted/40 p-2 flex items-center justify-center border border-border/40">
        <svg
          viewBox="0 0 400 320"
          className="h-full w-full drop-shadow-sm select-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Illustrative Ethiopia Map Outline"
        >
          {/* Stylized geometric polygon representing Ethiopia's borders */}
          <path
            d="M 120 40 L 220 25 L 290 80 L 370 140 L 330 220 L 250 290 L 170 295 L 110 240 L 90 150 L 95 80 Z"
            className="fill-muted/80 stroke-border transition-colors duration-300"
            strokeWidth="2"
          />

          {/* Regional border hints */}
          <path
            d="M 140 85 L 210 90 L 250 140 M 110 160 L 200 170 L 270 210 M 160 220 L 220 230"
            stroke="currentColor"
            strokeOpacity="0.15"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
        </svg>

        {/* Interactive Region Pins */}
        {regionPins.map((pin) => {
          const isSelected = currentRegion === pin.slug
          const isHovered = hoveredRegion === pin.slug
          return (
            <button
              key={pin.slug}
              type="button"
              onClick={() => selectRegion(pin.slug)}
              onMouseEnter={() => setHoveredRegion(pin.slug)}
              onMouseLeave={() => setHoveredRegion(null)}
              style={{ left: pin.x, top: pin.y }}
              aria-label={`Filter by ${pin.label}`}
              className={`group/pin absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-full ${
                isSelected ? 'scale-110 z-20' : 'hover:scale-110 z-10'
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full shadow-md transition-all duration-200 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : isHovered
                      ? 'bg-amber-500 text-white ring-2 ring-amber-400/40'
                      : 'bg-card text-foreground border border-border'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
              </div>
              <span
                className={`mt-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold shadow-xs transition-colors duration-200 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background/90 text-foreground border border-border/60'
                }`}
              >
                {pin.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Region List with Truthful Destination Counts */}
      <div className="mt-4 divide-y divide-border/50 max-h-60 overflow-y-auto">
        {activeRegionCounts.length > 0 ? (
          activeRegionCounts.map((rc) => {
            const isSelected = currentRegion === rc.region
            return (
              <button
                key={rc.region}
                type="button"
                onClick={() => selectRegion(rc.region)}
                className={`flex w-full items-center justify-between py-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs ${
                  isSelected
                    ? 'font-bold text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isSelected ? 'bg-primary' : 'bg-muted-foreground/40'
                    }`}
                  />
                  <span>{rc.name}</span>
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                  {rc.count}
                </span>
              </button>
            )
          })
        ) : (
          <p className="py-3 text-center text-xs text-muted-foreground">
            {isAm ? 'ምንም ክልል አልተገኘም' : 'No region data available'}
          </p>
        )}
      </div>
    </div>
  )
}
