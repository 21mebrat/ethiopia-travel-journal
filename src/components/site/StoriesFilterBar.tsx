'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import { ChevronDown, Check } from 'lucide-react'
import type { CategoryItem } from '@/lib/site/stories'

type StoriesFilterBarProps = {
  categories?: CategoryItem[]
  initialCategory?: string
  initialSort?: string
  locale?: string
}

export default function StoriesFilterBar({
  categories = [],
  initialCategory = 'all',
  initialSort = 'latest',
  locale = 'en',
}: StoriesFilterBarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAmharic = locale === 'am'

  const sortOptions = [
    { label: isAmharic ? 'የቅርብ ጊዜ' : 'Latest', value: 'latest' },
    { label: isAmharic ? 'ተወዳጅ' : 'Most Popular', value: 'popular' },
    { label: isAmharic ? 'የቀደመ' : 'Oldest', value: 'oldest' },
  ]

  const allCategoryPill = {
    id: 'all',
    name: isAmharic ? 'ሁሉም ታሪኮች' : 'All Stories',
    slug: 'all',
  }

  const categoryOptions = [allCategoryPill, ...categories]

  const activeCategory = searchParams.get('category') || initialCategory
  const activeSort = searchParams.get('sort') || initialSort

  const [sortOpen, setSortOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const buildHref = (cat: string, sortVal: string) => {
    const next = new URLSearchParams()
    if (locale && locale !== 'en') {
      next.set('locale', locale)
    }
    if (cat && cat !== 'all') {
      next.set('category', cat)
    }
    if (sortVal && sortVal !== 'latest') {
      next.set('sort', sortVal)
    }
    const query = next.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  const activeSortLabel =
    sortOptions.find((s) => s.value === activeSort)?.label || (isAmharic ? 'የቅርብ ጊዜ' : 'Latest')

  return (
    <div className="relative z-30 w-full border-b border-border bg-background/80 backdrop-blur-xs py-3 mb-8 sm:mb-10">
      <div className="container-site flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Filter Pills (Scrollable horizontally on narrow screens) */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
          {categoryOptions.map((cat) => {
            const isSelected =
              activeCategory === cat.slug ||
              (cat.slug === 'all' && (!activeCategory || activeCategory === 'all'))

            return (
              <Link
                key={cat.id}
                href={buildHref(cat.slug, activeSort)}
                scroll={false}
                className={`relative px-3.5 py-1.5 rounded-xs text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {cat.name}
              </Link>
            )
          })}
        </div>

        {/* Sort Dropdown */}
        <div className="relative flex items-center justify-end shrink-0" ref={dropdownRef}>
          <span className="text-xs text-muted-foreground mr-2 font-medium">
            {isAmharic ? 'ደርድር በ' : 'Sort by'}
          </span>
          <button
            type="button"
            onClick={() => setSortOpen(!sortOpen)}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors cursor-pointer"
            aria-expanded={sortOpen}
            aria-haspopup="listbox"
          >
            <span>{activeSortLabel}</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {sortOpen && (
            <div
              role="listbox"
              className="absolute right-0 top-full mt-2 w-44 rounded-xs bg-popover text-popover-foreground border border-border shadow-lg py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150"
            >
              {sortOptions.map((opt) => (
                <Link
                  key={opt.value}
                  href={buildHref(activeCategory, opt.value)}
                  scroll={false}
                  role="option"
                  aria-selected={activeSort === opt.value}
                  onClick={() => setSortOpen(false)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors cursor-pointer ${
                    activeSort === opt.value
                      ? 'bg-muted text-foreground font-semibold'
                      : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <span>{opt.label}</span>
                  {activeSort === opt.value && <Check size={13} className="text-foreground" />}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
