'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { StoryItem } from '@/lib/site/stories'

type FeaturedStoryWidgetProps = {
  stories: StoryItem[]
  locale?: string
}

export default function FeaturedStoryWidget({
  stories,
  locale = 'en',
}: FeaturedStoryWidgetProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const isAmharic = locale === 'am'

  if (!stories || stories.length === 0) return null

  const story = stories[currentIndex]

  const handlePrev = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev === 0 ? stories.length - 1 : prev - 1))
    setTimeout(() => setIsAnimating(false), 250)
  }

  const handleNext = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev === stories.length - 1 ? 0 : prev + 1))
    setTimeout(() => setIsAnimating(false), 250)
  }

  return (
    <section className="featured-story-widget mb-8" aria-label="Featured Story">
      {/* Widget Header with Line and Arrows */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-1">
          <h3 className="text-xs uppercase tracking-[0.16em] font-bold text-foreground whitespace-nowrap">
            {isAmharic ? 'ተለይቶ የቀረበ ታሪክ' : 'Featured Story'}
          </h3>
          <span className="h-[1px] bg-border flex-1" />
        </div>

        {/* Prev / Next controls (only if more than 1 story) */}
        {stories.length > 1 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous featured story"
              className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next featured story"
              className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Card Content */}
      <article
        className={`group flex flex-col transition-opacity duration-250 ${
          isAnimating ? 'opacity-40 scale-[0.99]' : 'opacity-100 scale-100'
        }`}
      >
        {/* Media Frame with photographic badge overlay */}
        <Link
          href={`/stories/${story.slug}`}
          className="relative w-full aspect-[16/10] overflow-hidden rounded-xs bg-muted block"
        >
          {story.heroImage.url ? (
            <Image
              src={story.heroImage.url}
              alt={story.heroImage.alt || story.title}
              fill
              unoptimized={story.heroImage.url.startsWith('http')}
              sizes="(min-width: 1024px) 380px, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              {isAmharic ? 'ምስል የለም' : 'No image'}
            </div>
          )}

          {/* Overlaid Category Badge (Preserves intentional photographic contrast) */}
          {story.category.name && (
            <div className="absolute bottom-2 left-2 z-10">
              <span className="bg-black/80 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-xs backdrop-blur-xs">
                {story.category.name}
              </span>
            </div>
          )}
        </Link>

        {/* Story Body */}
        <div className="pt-3">
          <Link href={`/stories/${story.slug}`} className="block group-hover:text-primary transition-colors">
            <h4 className="font-serif text-lg font-semibold leading-snug text-foreground group-hover:underline">
              {story.title}
            </h4>
          </Link>

          {story.excerpt && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
              {story.excerpt}
            </p>
          )}

          {/* Author and Date Meta */}
          <div className="flex items-center gap-2 mt-3 pt-2 text-xs text-muted-foreground">
            {story.author.avatar && (
              <div className="relative w-5 h-5 rounded-full overflow-hidden shrink-0 ring-1 ring-border">
                <Image
                  src={story.author.avatar}
                  alt={story.author.name}
                  fill
                  unoptimized={story.author.avatar.startsWith('http')}
                  className="object-cover"
                />
              </div>
            )}
            <span className="font-medium text-foreground">
              {isAmharic ? `በ ${story.author.name}` : `By ${story.author.name}`}
            </span>
            {story.publishedDate && (
              <>
                <span>•</span>
                <span>{story.publishedDate}</span>
              </>
            )}
            {story.readTime && (
              <>
                <span>•</span>
                <span>{story.readTime}</span>
              </>
            )}
          </div>
        </div>
      </article>
    </section>
  )
}
