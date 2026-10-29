import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { articleJSXConverters } from '@/components/richText/converters'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    locale?: string
    preview?: string
  }>
}

/**
 * Generate SEO metadata for the article preview page
 */
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const { locale = 'en' } = await searchParams
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const { docs } = await payload.find({
    collection: 'articles',
    where: {
      slug: {
        equals: slug,
      },
    },
    locale: locale as any,
    draft: true,
    limit: 1,
  })

  const article = docs[0]
  if (!article) return { title: 'Article Not Found' }

  return {
    title: `${article.meta?.metaTitle || article.title} | Ethiopia Tour Journal`,
    description: article.meta?.metaDescription || article.excerpt,
  }
}

/**
 * Article Preview & Reader Page
 *
 * Renders articles both in live preview mode (drafts) and for public readers.
 */
export default async function ArticlePage({ params, searchParams }: Props) {
  const { slug } = await params
  const { locale = 'en', preview } = await searchParams
  const isPreview = preview === 'true'

  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  // Query article with draft support when previewing
  const { docs } = await payload.find({
    collection: 'articles',
    where: {
      slug: {
        equals: slug,
      },
    },
    draft: isPreview,
    locale: locale as any,
    depth: 2, // Populates related author, media, categories, destinations
    limit: 1,
  })

  const article = docs[0] as any
  if (!article) {
    return notFound()
  }

  const isAmharic = locale === 'am'
  const heroImage = typeof article.heroImage === 'object' ? article.heroImage : null
  const author = typeof article.author === 'object' ? article.author : null
  const categories = Array.isArray(article.categories) ? article.categories : []
  const destinations = Array.isArray(article.destinations) ? article.destinations : []

  // Color mapping for category badges
  const categoryColorMap: Record<string, { bg: string; text: string; border: string }> = {
    amber: { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', border: 'rgba(245, 158, 11, 0.3)' },
    emerald: { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: 'rgba(16, 185, 129, 0.3)' },
    crimson: { bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.3)' },
    blue: { bg: 'rgba(59, 130, 246, 0.12)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.3)' },
    brown: { bg: 'rgba(180, 83, 9, 0.12)', text: '#92400e', border: 'rgba(180, 83, 9, 0.3)' },
    purple: { bg: 'rgba(139, 92, 246, 0.12)', text: '#7c3aed', border: 'rgba(139, 92, 246, 0.3)' },
  }

  return (
    <article
      style={{
        minHeight: '100vh',
        background: '#fafaf9',
        color: '#1c1917',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Ethiopic", sans-serif',
        lineHeight: 1.7,
        paddingBottom: '80px',
      }}
    >
      {/* 1. Preview Banner (Shown only during draft preview) */}
      {isPreview && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: '#d97706',
            color: '#ffffff',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: '#ffffff',
                color: '#d97706',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {isAmharic ? 'ቅድመ-ዕይታ' : 'Live Preview'}
            </span>
            <span>
              {isAmharic
                ? 'ይህ ጽሑፍ በረቂቅ ደረጃ ላይ ነው (ያልታተመ)።'
                : 'Viewing unpublished draft revision in real-time.'}
            </span>
          </div>
          <Link
            href={`/admin/collections/articles/${article.id}`}
            style={{
              color: '#ffffff',
              textDecoration: 'underline',
              fontSize: '12px',
            }}
          >
            {isAmharic ? 'ወደ አርታዒው ተመለስ' : 'Back to Editor'}
          </Link>
        </div>
      )}


      {/* 3. Main Article Content Container */}
      <div
        style={{
          maxWidth: '820px',
          margin: '0 auto',
          padding: '40px 20px 0',
        }}
      >
        {/* Category & Destination Badges */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '18px',
          }}
        >
          {categories.map((cat: any) => {
            const colors = categoryColorMap[cat?.color] || categoryColorMap.amber
            return (
              <span
                key={cat.id || cat}
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                }}
              >
                {cat.name || cat.slug || 'Category'}
              </span>
            )
          })}

          {destinations.map((dest: any) => (
            <span
              key={dest.id || dest}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 500,
                background: '#f5f5f4',
                color: '#57534e',
                border: '1px solid #e7e5e4',
              }}
            >
              📍 {dest.title || dest.slug}
            </span>
          ))}
        </div>

        {/* Article Headline */}
        <h1
          style={{
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 800,
            lineHeight: 1.25,
            color: '#1c1917',
            marginBottom: '20px',
          }}
        >
          {article.title}
        </h1>

        {/* Author Byline & Meta Details */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            padding: '16px 0',
            borderTop: '1px solid #e7e5e4',
            borderBottom: '1px solid #e7e5e4',
            marginBottom: '32px',
          }}
        >
          {/* Author info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#d97706',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '16px',
                textTransform: 'uppercase',
              }}
            >
              {(author?.displayName || author?.email || 'A').charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14.5px', color: '#1c1917' }}>
                {author?.displayName || author?.email || 'Author'}
              </div>
              <div style={{ fontSize: '12.5px', color: '#78716c', textTransform: 'capitalize' }}>
                {author?.role || 'Contributor'}
              </div>
            </div>
          </div>

          {/* Reading time and date */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '13px',
              color: '#78716c',
            }}
          >
            {article.publishedDate && (
              <span>
                🗓️ {new Date(article.publishedDate).toLocaleDateString(isAmharic ? 'am-ET' : 'en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            {article.readingTimeMinutes && (
              <span>
                ⏱️ {article.readingTimeMinutes} {isAmharic ? 'ደቂቃ ንባብ' : 'min read'}
              </span>
            )}
          </div>
        </div>

        {/* Hero Cover Image */}
        {heroImage?.url && (
          <figure style={{ margin: '0 0 36px 0' }}>
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '440px',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              }}
            >
              <Image
                src={heroImage.url}
                alt={heroImage.alt || article.title}
                fill
                style={{ objectFit: 'cover' }}
                priority
              />
            </div>
            {heroImage.caption && (
              <figcaption
                style={{
                  fontSize: '13px',
                  color: '#78716c',
                  textAlign: 'center',
                  marginTop: '8px',
                  fontStyle: 'italic',
                }}
              >
                {heroImage.caption}
              </figcaption>
            )}
          </figure>
        )}

        {/* Excerpt Callout */}
        {article.excerpt && (
          <div
            style={{
              padding: '20px 24px',
              marginBottom: '36px',
              borderLeft: '4px solid #d97706',
              background: 'rgba(217, 119, 6, 0.05)',
              borderRadius: '0 8px 8px 0',
              fontSize: '18px',
              lineHeight: 1.6,
              color: '#44403c',
              fontStyle: 'italic',
            }}
          >
            {article.excerpt}
          </div>
        )}

        {/* Full RichText Content */}
        {article.content && (
          <div
            className="article-rich-text"
            style={{
              fontSize: '17px',
              lineHeight: 1.8,
              color: '#292524',
            }}
          >
            <RichText data={article.content} converters={articleJSXConverters} />
          </div>
        )}
      </div>
    </article>
  )
}
