'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { SiteLocale } from '@/lib/site/locale'

type DestinationsPaginationProps = {
  page: number
  totalPages: number
  locale?: SiteLocale
}

export default function DestinationsPagination({
  page,
  totalPages,
  locale = 'en',
}: DestinationsPaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (totalPages <= 1) return null

  const isAm = locale === 'am'

  const buildPageUrl = (targetPage: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (targetPage <= 1) {
      params.delete('page')
    } else {
      params.set('page', String(targetPage))
    }
    if (locale) {
      params.set('locale', locale)
    }
    return `${pathname}?${params.toString()}`
  }

  // Generate page numbers array (with truncation if > 5 pages)
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('ellipsis')
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (page < totalPages - 2) pages.push('ellipsis')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <nav
      aria-label={isAm ? 'የገጽ አሰሳ' : 'Destinations pagination'}
      className="mt-12 flex flex-wrap items-center justify-center gap-1 sm:gap-2 border-t border-border/60 pt-8 max-w-full px-1"
    >
      {/* Previous Button */}
      {page > 1 ? (
        <Link
          href={buildPageUrl(page - 1)}
          aria-label={isAm ? 'ቀዳሚ ገጽ' : 'Previous page'}
          className="inline-flex h-8 sm:h-10 items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border border-border bg-card px-2 sm:px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{isAm ? 'ቀዳሚ' : 'Previous'}</span>
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex h-8 sm:h-10 items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border border-border/50 bg-muted/40 px-2 sm:px-3.5 text-xs font-semibold text-muted-foreground/50 cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{isAm ? 'ቀዳሚ' : 'Previous'}</span>
        </span>
      )}

      {/* Numbered Page Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {getPageNumbers().map((p, idx) => {
          if (p === 'ellipsis') {
            return (
              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground">
                …
              </span>
            )
          }

          const isCurrent = p === page
          return (
            <Link
              key={p}
              href={buildPageUrl(p)}
              aria-current={isCurrent ? 'page' : undefined}
              className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isCurrent
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'border border-border bg-card text-foreground hover:bg-muted'
              }`}
            >
              {p}
            </Link>
          )
        })}
      </div>

      {/* Next Button */}
      {page < totalPages ? (
        <Link
          href={buildPageUrl(page + 1)}
          aria-label={isAm ? 'ቀጣይ ገጽ' : 'Next page'}
          className="inline-flex h-8 sm:h-10 items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border border-border bg-card px-2 sm:px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="hidden sm:inline">{isAm ? 'ቀጣይ' : 'Next'}</span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex h-8 sm:h-10 items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border border-border/50 bg-muted/40 px-2 sm:px-3.5 text-xs font-semibold text-muted-foreground/50 cursor-not-allowed"
        >
          <span className="hidden sm:inline">{isAm ? 'ቀጣይ' : 'Next'}</span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </span>
      )}
    </nav>
  )
}
