'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import BookmarkButton from '@/components/site/BookmarkButton'
import type { StoryItem } from '@/lib/site/stories'

type JournalStoryCardProps = {
  story: StoryItem
  locale?: string
  priority?: boolean
}

export default function JournalStoryCard({
  story,
  locale = 'en',
  priority = false,
}: JournalStoryCardProps) {
  const isAmharic = locale === 'am'
  const saveLabel = isAmharic ? 'ታሪኩን አስቀምጥ' : 'Save story'
  const removeLabel = isAmharic ? 'የተቀመጠውን ታሪክ አስወግድ' : 'Remove saved story'

  return (
    <article className="group flex flex-col h-full bg-card text-card-foreground rounded-sm border border-border overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Media frame with bookmark button */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-muted">
        {story.heroImage.url ? (
          <Link
            href={`/stories/${story.slug}`}
            tabIndex={-1}
            aria-hidden="true"
            className="block w-full h-full relative"
          >
            <Image
              src={story.heroImage.url}
              alt={story.heroImage.alt || story.title}
              fill
              priority={priority}
              unoptimized={story.heroImage.url.startsWith('http')}
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          </Link>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            {isAmharic ? 'ምስል የለም' : 'No image'}
          </div>
        )}

        {/* Bookmark button */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <BookmarkButton
            itemId={story.id}
            itemType="story"
            saveLabel={saveLabel}
            removeLabel={removeLabel}
          />
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-col flex-1 p-4 sm:p-5">
        {/* Category Label */}
        {story.category.name && (
          <div className="mb-2">
            <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
              {story.category.name}
            </span>
          </div>
        )}

        {/* Headline */}
        <h3 className="font-serif text-lg sm:text-xl font-semibold leading-snug text-card-foreground group-hover:text-primary transition-colors">
          <Link href={`/stories/${story.slug}`} className="text-inherit hover:underline">
            {story.title}
          </Link>
        </h3>

        {/* Excerpt */}
        {story.excerpt && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
            {story.excerpt}
          </p>
        )}

        {/* Author & Published Details */}
        <div className="mt-auto pt-4 border-t border-border/60 flex items-center gap-2.5 text-xs text-muted-foreground">
          {story.author.avatar ? (
            <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 ring-1 ring-border">
              <Image
                src={story.author.avatar}
                alt={story.author.name}
                fill
                unoptimized={story.author.avatar.startsWith('http')}
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold uppercase shrink-0 ring-1 ring-border">
              {story.author.name.charAt(0)}
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-wrap min-w-0 truncate">
            <span className="font-medium text-foreground truncate">
              {isAmharic ? `በ ${story.author.name}` : `By ${story.author.name}`}
            </span>
            {story.publishedDate && (
              <>
                <span aria-hidden="true">•</span>
                <span className="whitespace-nowrap">{story.publishedDate}</span>
              </>
            )}
            {story.readTime && (
              <>
                <span aria-hidden="true">•</span>
                <span className="whitespace-nowrap">{story.readTime}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
