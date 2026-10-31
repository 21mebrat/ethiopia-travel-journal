'use client'

import React, { useEffect, useState } from 'react'
import type { TocItem } from '@/lib/site/toc'

type TableOfContentsProps = {
  items: TocItem[]
  locale?: string
  className?: string
}

export default function TableOfContents({
  items,
  locale = 'en',
  className = '',
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashId = window.location.hash.replace('#', '')
      const matched = items.find((item) => item.id === hashId)
      if (matched) return matched.id
    }
    return items[0]?.id || ''
  })
  const isAmharic = locale === 'am'

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
            setActiveId(entry.target.id)
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
    setActiveId(id)
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

  return (
    <nav className={`table-of-contents ${className}`} aria-label={isAmharic ? 'የይዘት ማውጫ' : 'Table of Contents'}>
      <h3 className="text-[11px] uppercase tracking-[0.16em] font-bold text-foreground mb-4">
        {isAmharic ? 'የይዘት ማውጫ' : 'Table of Contents'}
      </h3>

      <div className="relative pl-3 border-l border-border space-y-3">
        {items.map((item) => {
          const isActive = activeId === item.id

          return (
            <div key={item.id} className="relative flex items-center">
              {/* Active Marker Dot */}
              <span
                aria-hidden="true"
                className={`absolute -left-[17px] w-2 h-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-primary ring-4 ring-primary/20 scale-125'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'
                }`}
              />

              <a
                href={`#${item.id}`}
                onClick={(e) => scrollToSection(e, item.id)}
                className={`text-xs block py-0.5 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'font-bold text-foreground translate-x-1'
                    : 'font-normal text-muted-foreground hover:text-foreground hover:translate-x-0.5'
                }`}
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
