'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X, Maximize2, Image as ImageIcon } from 'lucide-react'

type GalleryItem = {
  url: string
  alt: string
  caption?: string
}

type DestinationGalleryProps = {
  gallery: GalleryItem[]
  title: string
  locale?: 'en' | 'am'
}

export default function DestinationGallery({
  gallery,
  title,
  locale = 'en',
}: DestinationGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const isAm = locale === 'am'
  const lastActiveElementRef = useRef<HTMLElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  const openLightbox = (index: number) => {
    lastActiveElementRef.current = document.activeElement as HTMLElement
    setLightboxIndex(index)
  }

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
    if (lastActiveElementRef.current && typeof lastActiveElementRef.current.focus === 'function') {
      lastActiveElementRef.current.focus()
    }
  }, [])

  const showNext = useCallback(() => {
    if (lightboxIndex === null) return
    setLightboxIndex((prev) => ((prev ?? 0) + 1) % gallery.length)
  }, [lightboxIndex, gallery.length])

  const showPrev = useCallback(() => {
    if (lightboxIndex === null) return
    setLightboxIndex((prev) => ((prev ?? 0) - 1 + gallery.length) % gallery.length)
  }, [lightboxIndex, gallery.length])

  // Handle keyboard focus containment (Tab/Shift+Tab), arrow keys, Esc, and scroll locking
  useEffect(() => {
    if (lightboxIndex === null) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    if (closeButtonRef.current) {
      closeButtonRef.current.focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeLightbox()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        showNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        showPrev()
      } else if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) {
          e.preventDefault()
          return
        }

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [lightboxIndex, showNext, showPrev, closeLightbox])

  if (!gallery || gallery.length === 0) return null

  // Display up to 6 thumbnails in the strip
  const maxVisible = 6
  const visibleThumbnails = gallery.slice(0, maxVisible)
  const remainingCount = Math.max(0, gallery.length - maxVisible)

  return (
    <section aria-label={isAm ? 'የፎቶ ማሳያ' : 'Photo Gallery'} className="my-8">
      {/* 6-Thumbnail Grid Strip */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
        {visibleThumbnails.map((item, index) => {
          const isLastWithMore = index === maxVisible - 1 && remainingCount > 0
          return (
            <button
              key={index}
              type="button"
              onClick={() => openLightbox(index)}
              aria-label={`View photo ${index + 1} of ${gallery.length}: ${item.caption || title}`}
              className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl border-2 border-transparent transition-all duration-300 hover:border-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              <Image
                src={item.url}
                alt={item.alt || `${title} photo ${index + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 200px"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-transparent" />

              {/* Zoom icon hint on hover */}
              <div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-xs">
                <Maximize2 className="h-3 w-3" />
              </div>

              {/* Truthful remaining photo count */}
              {isLastWithMore && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 font-semibold text-white backdrop-blur-xs">
                  <ImageIcon className="h-5 w-5 mb-1" />
                  <span className="text-sm font-bold">+{remainingCount} {isAm ? 'ተጨማሪ' : 'Photos'}</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={isAm ? 'የፎቶ ማሳያ ተመልካች' : 'Photo Gallery Lightbox'}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeLightbox()
            }
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md animate-in fade-in duration-200"
        >
          {/* Close button */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeLightbox}
            aria-label={isAm ? 'ዝጋ' : 'Close viewer'}
            className="absolute top-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Previous Button */}
          {gallery.length > 1 && (
            <button
              type="button"
              onClick={showPrev}
              aria-label={isAm ? 'ቀዳሚ' : 'Previous photo'}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
          )}

          {/* Next Button */}
          {gallery.length > 1 && (
            <button
              type="button"
              onClick={showNext}
              aria-label={isAm ? 'ቀጣይ' : 'Next photo'}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          )}

          {/* Active Image and Caption */}
          <div className="relative flex max-h-[85vh] max-w-5xl flex-col items-center">
            <div className="relative h-[65vh] w-[85vw] max-w-4xl overflow-hidden rounded-2xl">
              <Image
                src={gallery[lightboxIndex].url}
                alt={gallery[lightboxIndex].alt}
                fill
                sizes="(max-width: 1200px) 100vw, 1200px"
                className="object-contain"
                priority
              />
            </div>

            <div className="mt-4 text-center text-white">
              <p className="text-sm font-medium text-stone-200 max-w-2xl">
                {gallery[lightboxIndex].caption || gallery[lightboxIndex].alt}
              </p>
              <span className="mt-1 block text-xs font-mono text-stone-400">
                {lightboxIndex + 1} / {gallery.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
