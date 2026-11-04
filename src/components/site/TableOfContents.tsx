'use client'

import React, { useEffect, useState, useSyncExternalStore, useMemo } from 'react'
import type { TocItem } from '@/lib/site/toc'

type TableOfContentsProps = {
  items: TocItem[]
  locale?: string
  className?: string
}

const subscribeHash = (callback: () => void) => {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}
const getHash = () => (typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '')
const getHashServer = () => ''

export default function TableOfContents({
  items,
  locale = 'en',
  className = '',
}: TableOfContentsProps) {
  const hash = useSyncExternalStore(subscribeHash, getHash, getHashServer)
  const [observedActiveId, setObservedActiveId] = useState<string>('')
  const [readingProgress, setReadingProgress] = useState<number>(0)
  const isAmharic = locale === 'am'

  const activeId =
    observedActiveId || (items.some((i) => i.id === hash) ? hash : items[0]?.id || '')

  const activeIndex = useMemo(() => {
    const idx = items.findIndex((item) => item.id === activeId)
    return idx >= 0 ? idx : 0
  }, [items, activeId])

  // Track overall article reading progress as the user scrolls
  useEffect(() => {
    if (typeof window === 'undefined') return

    let ticking = false
    const calculateProgress = () => {
      const article = document.querySelector('main') || document.querySelector('article')
      if (!article) return

      const rect = article.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const totalScrollable = rect.height - windowHeight * 0.5

      if (totalScrollable <= 0) {
        setReadingProgress(100)
        return
      }

      const scrolled = -rect.top
      const progress = Math.min(100, Math.max(0, (scrolled / totalScrollable) * 100))
      setReadingProgress(Math.round(progress))
    }

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          calculateProgress()
          ticking = false
        })
        ticking = true
      }
    }

    calculateProgress()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // Deep linking and intersection observer for active heading
  useEffect(() => {
    if (typeof window === 'undefined' || items.length === 0) return

    // Handle deep links on initial page mount
    if (window.location.hash) {
      const hashId = window.location.hash.replace('#', '')
      const matched = items.find((item) => item.id === hashId)
      if (matched) {
        const targetEl = document.getElementById(matched.id)
        if (targetEl) {
          const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          const y = targetEl.getBoundingClientRect().top + window.pageYOffset - 90
          window.scrollTo({ top: Math.max(0, y), behavior: prefersReduced ? 'auto' : 'smooth' })
        }
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setObservedActiveId(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-80px 0% -65% 0%',
        threshold: 0,
      },
    )

    items.forEach((item) => {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [items])

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    setObservedActiveId(id)
    const element = document.getElementById(id)
    if (element) {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const yOffset = -90 // Header height offset
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset

      if (typeof window !== 'undefined') {
        window.scrollTo({ top: Math.max(0, y), behavior: prefersReduced ? 'auto' : 'smooth' })
        window.history.replaceState(null, '', `#${id}`)
      }
    }
  }

  // If the article has no headings, do not render a table of contents with nonexistent links
  if (!items || items.length === 0) return null

  // Calculate dynamic fill height for the vertical progress track
  const activeLineHeight =
    items.length > 1
      ? Math.min(100, Math.max(0, (activeIndex / (items.length - 1)) * 100))
      : 100

  return (
    <nav
      className={`table-of-contents ${className}`}
      aria-label={isAmharic ? 'የይዘት ማውጫ' : 'Table of Contents'}
    >
      {/* Header with Title and Reading Progress Pill */}
      <div className="mb-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[11px] uppercase tracking-[0.16em] font-bold text-foreground">
            {isAmharic ? 'የይዘት ማውጫ' : 'Table of Contents'}
          </h3>
          <span
            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full transition-all duration-300"
            style={{
              color: 'var(--chart-1)',
              backgroundColor: 'color-mix(in srgb, var(--chart-1) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--chart-1) 28%, transparent)',
            }}
            title={isAmharic ? 'የንባብ ሂደት' : 'Reading progress'}
          >
            {readingProgress}%
          </span>
        </div>

        {/* Horizontal Micro Reading Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={readingProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={isAmharic ? 'የንባብ ሂደት' : 'Reading progress'}
          className="w-full h-1 bg-muted/80 rounded-full overflow-hidden"
        >
          <div
            className="h-full rounded-full transition-[width] duration-200 ease-out"
            style={{
              width: `${readingProgress}%`,
              backgroundColor: 'var(--chart-1)',
            }}
          />
        </div>
      </div>

      {/* Vertical Step Track & Item List */}
      <div className="relative pl-4 space-y-3">
        {/* Background Inactive Vertical Track Line */}
        <div
          aria-hidden="true"
          className="absolute left-[5px] top-1.5 bottom-1.5 w-[2px] bg-border/70 rounded-full"
        />

        {/* Dynamic Active Progress Fill on the Track Line */}
        <div
          aria-hidden="true"
          className="absolute left-[5px] top-1.5 w-[2px] rounded-full transition-all duration-300 ease-out"
          style={{
            height: `${activeLineHeight}%`,
            backgroundColor: 'var(--chart-1)',
          }}
        />

        {items.map((item, index) => {
          const isActive = activeId === item.id
          const isPassed = index < activeIndex

          return (
            <div key={item.id} className="relative flex items-center group">
              {/* Step Marker Dot */}
              <span
                aria-hidden="true"
                className={`absolute -left-[14px] rounded-full transition-all duration-300 ${
                  isActive
                    ? 'w-2.5 h-2.5 ring-4 scale-110'
                    : isPassed
                      ? 'w-2 h-2 ring-2 ring-background'
                      : 'w-1.5 h-1.5 bg-muted-foreground/30 group-hover:bg-muted-foreground/60'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: 'var(--chart-1)',
                        borderColor: 'var(--chart-1)',
                        boxShadow: '0 0 8px color-mix(in srgb, var(--chart-1) 50%, transparent)',
                      }
                    : isPassed
                      ? {
                          backgroundColor: 'var(--chart-1)',
                        }
                      : undefined
                }
              />

              {/* Heading Link */}
              <a
                href={`#${item.id}`}
                onClick={(e) => scrollToSection(e, item.id)}
                aria-current={isActive ? 'location' : undefined}
                className={`text-xs block py-0.5 transition-all duration-200 cursor-pointer select-none ${
                  isActive
                    ? 'font-bold translate-x-1'
                    : isPassed
                      ? 'font-medium text-foreground/85 hover:text-foreground hover:translate-x-0.5'
                      : 'font-normal text-muted-foreground hover:text-foreground hover:translate-x-0.5'
                }`}
                style={
                  isActive
                    ? {
                        color: 'var(--chart-1)',
                      }
                    : undefined
                }
              >
                {item.title}
              </a>
            </div>
          )
        })}
      </div>
    </nav>
  )
}
