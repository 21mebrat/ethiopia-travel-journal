'use client'

import React from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Map, ChevronDown } from 'lucide-react'
import {
  CATEGORIES_LIST,
  REGIONS_LIST,
} from '@/lib/site/destinations-types'
import type { SiteLocale } from '@/lib/site/locale'

type DestinationsFilterBarProps = {
  currentCategory?: string
  currentRegion?: string
  currentSort?: string
  locale?: SiteLocale
  onToggleMap?: () => void
  isMapOpen?: boolean
}

export default function DestinationsFilterBar({
  currentCategory = 'all',
  currentRegion = 'all',
  currentSort = 'featured',
  locale = 'en',
  onToggleMap,
  isMapOpen = false,
}: DestinationsFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isAm = locale === 'am'

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams?.toString() || '')

    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === 'all' || val === '') {
        params.delete(key)
      } else {
        params.set(key, val)
      }
    }

    // Reset pagination to page 1 whenever filters change
    params.delete('page')

    if (locale) {
      params.set('locale', locale)
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  const sortOptions = [
    { value: 'featured', label: isAm ? 'ተመራጭ' : 'Featured' },
    { value: 'name', label: isAm ? 'ስም (A-Z)' : 'Name (A-Z)' },
    { value: 'altitude', label: isAm ? 'ከፍታ (ከፍተኛ ወደ ዝቅተኛ)' : 'Highest Altitude' },
    { value: 'recent', label: isAm ? 'የቅርብ ጊዜ' : 'Recently Added' },
  ]

  return (
    <div className="mb-8 space-y-4">
      {/* Top Filter Bar: Category Tabs & Action Buttons */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Category Pills Rail */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES_LIST.map((cat) => {
            const isActive =
              currentCategory === cat.slug || (currentCategory === '' && cat.slug === 'all')
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => updateFilters({ category: cat.slug === 'all' ? null : cat.slug })}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary/70 text-secondary-foreground hover:bg-secondary border border-border/50'
                }`}
              >
                {cat[locale] || cat.en}
              </button>
            )
          })}
        </div>

        {/* Right Controls: Map Toggle & Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* View on Map Toggle */}
          <button
            type="button"
            onClick={onToggleMap}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 border ${
              isMapOpen
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-foreground border-border hover:bg-muted'
            }`}
          >
            <Map className="h-4 w-4" />
            <span>{isAm ? 'በካርታ ይመልከቱ' : 'View on Map'}</span>
          </button>

          {/* Region Dropdown */}
          <div className="relative">
            <select
              aria-label={isAm ? 'በክልል ይለዩ' : 'Filter by Region'}
              value={currentRegion}
              onChange={(e) => updateFilters({ region: e.target.value })}
              className="appearance-none rounded-xl border border-border bg-card py-2 pl-3.5 pr-8 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {REGIONS_LIST.map((reg) => (
                <option key={reg.slug} value={reg.slug}>
                  {reg[locale] || reg.en}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              aria-label={isAm ? 'አቀማመጥ' : 'Sort by'}
              value={currentSort}
              onChange={(e) => updateFilters({ sort: e.target.value })}
              className="appearance-none rounded-xl border border-border bg-card py-2 pl-3.5 pr-8 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  )
}
