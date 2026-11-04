'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, MoveRight } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { HomeHeroSlide } from '@/lib/site/home'

type HeroCarouselProps = {
  slides: HomeHeroSlide[]
  locale: 'en' | 'am'
}

export default function HeroCarousel({ slides, locale }: HeroCarouselProps) {
  const [index, setIndex] = useState(0)
  const safeIndex = Math.min(index, Math.max(0, slides.length - 1))
  const slide = slides[safeIndex]
  const multiple = slides.length > 1

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(0, slides.length - 1)))
  }, [slides.length])

  if (!slide) return null

  const labels =
    locale === 'am'
      ? {
          featured: 'የተመረጠ ታሪክ',
          read: 'ታሪኩን ያንብቡ',
          previous: 'የቀድሞው ታሪክ',
          next: 'ቀጣዩ ታሪክ',
          show: 'ታሪክ አሳይ',
          carousel: 'የተመረጡ ታሪኮች',
        }
      : {
          featured: 'Featured Story',
          read: 'Read the story',
          previous: 'Previous story',
          next: 'Next story',
          show: 'Show story',
          carousel: 'Featured stories',
        }

  const go = (direction: number) => {
    setIndex((current) => (current + direction + slides.length) % slides.length)
  }

  return (
    <section className="home-hero" aria-roledescription="carousel" aria-label={labels.carousel}>
      <div className="home-hero__media">
        <Image
          key={slide.id}
          src={slide.image.url}
          alt={slide.image.alt || slide.title}
          fill
          priority={safeIndex === 0}
          sizes="100vw"
          style={{ objectFit: 'cover' }}
        />
        <div className="home-hero__scrim" />
      </div>

      <div className="container-site home-hero__inner">
        <div className="home-hero__copy">
          <p className="home-hero__kicker kicker">
            <span>{labels.featured}</span>
            <span className="home-hero__rule" aria-hidden="true" />
          </p>

          <h1 className="headline home-hero__title">{slide.title}</h1>
          <p className="home-hero__excerpt">{slide.excerpt}</p>

          <Link href={slide.href} className="home-hero__cta kicker">
            {labels.read}
            <MoveRight aria-hidden="true" size={16} strokeWidth={1.6} />
          </Link>
        </div>

        {multiple && (
          <>
            <ol className="home-hero__count">
              {slides.map((item, itemIndex) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="home-hero__count-button"
                    aria-current={itemIndex === safeIndex ? 'true' : undefined}
                    aria-label={`${labels.show} ${itemIndex + 1}: ${item.title}`}
                    onClick={() => setIndex(itemIndex)}
                  >
                    <span>{String(itemIndex + 1).padStart(2, '0')}</span>
                    <span className="home-hero__count-line" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>

            <div className="home-hero__arrows">
              <button
                type="button"
                className="home-hero__arrow"
                aria-label={labels.previous}
                onClick={() => go(-1)}
              >
                <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                className="home-hero__arrow"
                aria-label={labels.next}
                onClick={() => go(1)}
              >
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.5} />
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
