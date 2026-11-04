'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

export type MediaItem = {
  image:
    | {
        id?: string
        url?: string
        alt?: string
        caption?: string
        width?: number
        height?: number
        mimeType?: string
      }
    | string
  caption?: string
  altText?: string
  aspectRatio?: 'default' | '1-1' | '16-9' | '4-3' | '3-4' | '9-16' | string
  span?: 'auto' | 'full' | 'half' | string
  customHeight?: number
}

export type MediaLayoutProps = {
  title?: string
  albumCaption?: string
  layout?:
    | 'telegram-auto'
    | 'columns-2'
    | 'columns-3'
    | 'grid-4'
    | 'hero-left'
    | 'hero-top'
    | 'masonry'
    | 'carousel'
    | string
  containerWidth?: 'contained' | 'wide' | 'full' | string
  gap?: 'tight' | 'normal' | 'relaxed' | 'none' | string
  borderRadius?: 'none' | 'subtle' | 'medium' | 'large' | 'pill' | string
  aspectRatio?: 'auto' | '1-1' | '16-9' | '4-3' | '3-4' | string
  enableLightbox?: boolean
  images?: MediaItem[]
}

/**
 * Fullscreen Lightbox Modal for Telegram style media inspection
 */
function Lightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: Array<{ url: string; alt?: string; caption?: string }>
  initialIndex: number
  onClose: () => void
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }, [images.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }, [images.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    // Prevent body scroll while lightbox is open
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleNext, handlePrev, onClose])

  const current = images[currentIndex]
  if (!current) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(10, 10, 12, 0.94)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      {/* Header Controls */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '24px',
          right: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#ffffff',
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '4px 12px',
            borderRadius: '20px',
            letterSpacing: '0.5px',
          }}
        >
          {currentIndex + 1} / {images.length}
        </div>

        <button
          onClick={onClose}
          type="button"
          aria-label="Close lightbox"
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            border: 'none',
            color: '#ffffff',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            transition: 'background 0.2s',
          }}
        >
          ✕
        </button>
      </div>

      {/* Main Image Area */}
      <div
        style={{
          position: 'relative',
          maxWidth: '92vw',
          maxHeight: '80vh',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous Button */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            type="button"
            aria-label="Previous image"
            style={{
              position: 'absolute',
              left: '10px',
              zIndex: 20,
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#ffffff',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            ‹
          </button>
        )}

        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            maxHeight: '78vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.alt || ''}
            style={{
              maxWidth: '100%',
              maxHeight: '78vh',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
              userSelect: 'none',
            }}
          />
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            type="button"
            aria-label="Next image"
            style={{
              position: 'absolute',
              right: '10px',
              zIndex: 20,
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#ffffff',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            ›
          </button>
        )}
      </div>

      {/* Caption footer */}
      {current.caption && (
        <div
          style={{
            marginTop: '16px',
            color: '#f5f5f4',
            fontSize: '14.5px',
            textAlign: 'center',
            maxWidth: '680px',
            padding: '8px 18px',
            background: 'rgba(0, 0, 0, 0.45)',
            borderRadius: '16px',
            backdropFilter: 'blur(8px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {current.caption}
        </div>
      )}
    </div>
  )
}

/**
 * Main MediaLayoutRenderer Component
 */
export function MediaLayoutRenderer(props: MediaLayoutProps) {
  const {
    title,
    albumCaption,
    layout = 'telegram-auto',
    containerWidth = 'contained',
    gap = 'tight',
    borderRadius = 'medium',
    aspectRatio: globalAspectRatio = 'auto',
    enableLightbox = true,
    images = [],
  } = props

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [carouselIndex, setCarouselIndex] = useState(0)

  if (!images || images.length === 0) return null

  // Extract clean image objects
  const parsedImages = images
    .map((item) => {
      const imgDoc = typeof item.image === 'object' ? item.image : null
      const url = imgDoc?.url || ''
      if (!url) return null
      return {
        url,
        alt: item.altText || imgDoc?.alt || item.caption || imgDoc?.caption || 'Image',
        caption: item.caption || imgDoc?.caption || '',
        aspectRatio: item.aspectRatio || 'default',
        span: item.span || 'auto',
        customHeight: item.customHeight,
        width: imgDoc?.width || 1200,
        height: imgDoc?.height || 800,
      }
    })
    .filter(Boolean) as Array<{
    url: string
    alt: string
    caption: string
    aspectRatio: string
    span: string
    customHeight?: number
    width: number
    height: number
  }>

  if (parsedImages.length === 0) return null

  // Gap sizing map
  const gapMap: Record<string, string> = {
    tight: '4px', // Authentic Telegram look
    normal: '8px',
    relaxed: '16px',
    none: '0px',
  }
  const currentGap = gapMap[gap] || '4px'

  // Radius map
  const radiusMap: Record<string, string> = {
    none: '0px',
    subtle: '6px',
    medium: '12px',
    large: '20px',
    pill: '28px',
  }
  const currentRadius = radiusMap[borderRadius] || '12px'

  // Container width styling
  const containerStyle: React.CSSProperties = {
    margin: '2rem 0',
    width: '100%',
    ...(containerWidth === 'wide'
      ? {
          maxWidth: '1080px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }
      : containerWidth === 'full'
        ? {
            maxWidth: '100vw',
            marginLeft: 'calc(50% - 50vw)',
            marginRight: 'calc(50% - 50vw)',
            paddingLeft: '16px',
            paddingRight: '16px',
          }
        : {
            maxWidth: '100%',
          }),
  }

  // Ratio helper
  const getAspectRatioStyle = (itemRatio?: string): string => {
    const r = itemRatio && itemRatio !== 'default' ? itemRatio : globalAspectRatio
    switch (r) {
      case '1-1':
        return '1 / 1'
      case '16-9':
        return '16 / 9'
      case '4-3':
        return '4 / 3'
      case '3-4':
        return '3 / 4'
      case '9-16':
        return '9 / 16'
      default:
        return 'auto'
    }
  }

  const renderSingleImage = (
    img: (typeof parsedImages)[0],
    index: number,
    opts: {
      aspectRatio?: string
      height?: string | number
      style?: React.CSSProperties
      isHero?: boolean
    } = {}
  ) => {
    const ratio = opts.aspectRatio || getAspectRatioStyle(img.aspectRatio)
    return (
      <div
        key={img.url + index}
        onClick={() => enableLightbox && setLightboxIndex(index)}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: currentRadius,
          cursor: enableLightbox ? 'zoom-in' : 'default',
          background: '#e7e5e4',
          aspectRatio: ratio !== 'auto' ? ratio : undefined,
          height: opts.height || (img.customHeight ? `${img.customHeight}px` : undefined),
          width: '100%',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
          ...opts.style,
        }}
        className="group media-layout-item"
      >
        <Image
          src={img.url}
          alt={img.alt}
          fill={ratio !== 'auto' || Boolean(opts.height) || Boolean(img.customHeight)}
          width={ratio === 'auto' && !opts.height && !img.customHeight ? img.width : undefined}
          height={ratio === 'auto' && !opts.height && !img.customHeight ? img.height : undefined}
          style={{
            objectFit: 'cover',
            width: '100%',
            height: '100%',
          }}
          sizes="(max-width: 768px) 100vw, 820px"
        />

        {/* Telegram-style overlay tag / caption */}
        {img.caption && (
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              right: '8px',
              padding: '4px 10px',
              background: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(6px)',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '12px',
              lineHeight: 1.4,
              opacity: 0.92,
              pointerEvents: 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {img.caption}
          </div>
        )}
      </div>
    )
  }

  // Layout Renderers
  const renderLayoutContent = () => {
    const count = parsedImages.length

    // 1. CAROUSEL SLIDER
    if (layout === 'carousel') {
      const activeImg = parsedImages[carouselIndex] || parsedImages[0]
      return (
        <div style={{ position: 'relative', width: '100%' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '460px',
              borderRadius: currentRadius,
              overflow: 'hidden',
              cursor: enableLightbox ? 'zoom-in' : 'default',
            }}
            onClick={() => enableLightbox && setLightboxIndex(carouselIndex)}
          >
            <Image
              src={activeImg.url}
              alt={activeImg.alt}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 100vw, 820px"
            />
            {activeImg.caption && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  right: '12px',
                  padding: '6px 14px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13px',
                }}
              >
                {activeImg.caption}
              </div>
            )}
          </div>

          {/* Controls */}
          {count > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '10px',
              }}
            >
              <button
                type="button"
                onClick={() => setCarouselIndex((p) => (p > 0 ? p - 1 : count - 1))}
                style={{
                  background: '#e7e5e4',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                ‹ Previous
              </button>

              <div style={{ display: 'flex', gap: '6px' }}>
                {parsedImages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCarouselIndex(i)}
                    style={{
                      width: i === carouselIndex ? '20px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      background: i === carouselIndex ? '#d97706' : '#d6d3d1',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCarouselIndex((p) => (p < count - 1 ? p + 1 : 0))}
                style={{
                  background: '#e7e5e4',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                Next ›
              </button>
            </div>
          )}
        </div>
      )
    }

    // 2. 2 COLUMNS
    if (layout === 'columns-2') {
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: currentGap,
          }}
        >
          {parsedImages.map((img, i) =>
            renderSingleImage(img, i, {
              aspectRatio: img.span === 'full' ? '16 / 9' : getAspectRatioStyle(img.aspectRatio),
              style: img.span === 'full' ? { gridColumn: '1 / -1' } : undefined,
            })
          )}
        </div>
      )
    }

    // 3. 3 COLUMNS
    if (layout === 'columns-3') {
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: currentGap,
          }}
        >
          {parsedImages.map((img, i) =>
            renderSingleImage(img, i, {
              aspectRatio: img.span === 'full' ? '16 / 9' : getAspectRatioStyle(img.aspectRatio),
              style: img.span === 'full' ? { gridColumn: '1 / -1' } : undefined,
            })
          )}
        </div>
      )
    }

    // 4. QUAD GRID (2x2)
    if (layout === 'grid-4') {
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: currentGap,
          }}
        >
          {parsedImages.map((img, i) =>
            renderSingleImage(img, i, {
              aspectRatio: '1 / 1',
            })
          )}
        </div>
      )
    }

    // 5. HERO LEFT SPLIT (1 tall left + stacked right)
    if (layout === 'hero-left' && count >= 2) {
      const hero = parsedImages[0]
      const rest = parsedImages.slice(1)
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: count >= 3 ? '1.2fr 1fr' : '1fr 1fr',
            gap: currentGap,
            minHeight: '440px',
          }}
        >
          {renderSingleImage(hero, 0, {
            aspectRatio: '3 / 4',
            height: '100%',
          })}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: currentGap,
              height: '100%',
            }}
          >
            {rest.map((img, i) =>
              renderSingleImage(img, i + 1, {
                aspectRatio: '16 / 10',
                style: { flex: 1 },
              })
            )}
          </div>
        </div>
      )
    }

    // 6. HERO TOP BANNER (1 wide top + companion row below)
    if (layout === 'hero-top' && count >= 2) {
      const hero = parsedImages[0]
      const rest = parsedImages.slice(1)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: currentGap }}>
          {renderSingleImage(hero, 0, {
            aspectRatio: '16 / 9',
            isHero: true,
          })}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(rest.length, 4)}, 1fr)`,
              gap: currentGap,
            }}
          >
            {rest.map((img, i) =>
              renderSingleImage(img, i + 1, {
                aspectRatio: '4 / 3',
              })
            )}
          </div>
        </div>
      )
    }

    // 7. MASONRY
    if (layout === 'masonry') {
      return (
        <div
          style={{
            columnCount: count > 3 ? 3 : 2,
            columnGap: currentGap,
          }}
        >
          {parsedImages.map((img, i) => (
            <div
              key={img.url + i}
              style={{
                marginBottom: currentGap,
                breakInside: 'avoid',
              }}
            >
              {renderSingleImage(img, i, {
                aspectRatio: getAspectRatioStyle(img.aspectRatio),
              })}
            </div>
          ))}
        </div>
      )
    }

    // 8. TELEGRAM SMART AUTO-COLLAGE (Default)
    // Intelligent arrangement matching Telegram post collage logic:
    if (count === 1) {
      return renderSingleImage(parsedImages[0], 0, {
        aspectRatio: getAspectRatioStyle(parsedImages[0].aspectRatio) || '16 / 9',
      })
    }

    if (count === 2) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: currentGap }}>
          {parsedImages.map((img, i) =>
            renderSingleImage(img, i, {
              aspectRatio: '4 / 3',
            })
          )}
        </div>
      )
    }

    if (count === 3) {
      // Telegram signature 3-photo layout: 1 tall left + 2 stacked right
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: currentGap,
            height: '420px',
          }}
        >
          {renderSingleImage(parsedImages[0], 0, {
            aspectRatio: 'auto',
            height: '100%',
          })}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: currentGap,
              height: '100%',
            }}
          >
            {renderSingleImage(parsedImages[1], 1, {
              aspectRatio: 'auto',
              style: { flex: 1 },
            })}
            {renderSingleImage(parsedImages[2], 2, {
              aspectRatio: 'auto',
              style: { flex: 1 },
            })}
          </div>
        </div>
      )
    }

    if (count === 4) {
      // Telegram 4-photo symmetrical 2x2 grid
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: currentGap,
          }}
        >
          {parsedImages.map((img, i) =>
            renderSingleImage(img, i, {
              aspectRatio: '1 / 1',
            })
          )}
        </div>
      )
    }

    if (count === 5) {
      // Telegram 5-photo layout: 2 on top row, 3 on bottom row
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: currentGap }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: currentGap }}>
            {renderSingleImage(parsedImages[0], 0, { aspectRatio: '16 / 10' })}
            {renderSingleImage(parsedImages[1], 1, { aspectRatio: '16 / 10' })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: currentGap }}>
            {renderSingleImage(parsedImages[2], 2, { aspectRatio: '1 / 1' })}
            {renderSingleImage(parsedImages[3], 3, { aspectRatio: '1 / 1' })}
            {renderSingleImage(parsedImages[4], 4, { aspectRatio: '1 / 1' })}
          </div>
        </div>
      )
    }

    // 6 or more photos: Balanced responsive mosaic
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: currentGap,
        }}
      >
        {parsedImages.map((img, i) =>
          renderSingleImage(img, i, {
            aspectRatio: '1 / 1',
          })
        )}
      </div>
    )
  }

  return (
    <figure style={containerStyle} className="telegram-media-layout">
      {/* Title */}
      {title && (
        <h4
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#1c1917',
            marginBottom: '12px',
          }}
        >
          {title}
        </h4>
      )}

      {/* Main Grid / Collage */}
      {renderLayoutContent()}

      {/* Album Caption / Telegram Post Story */}
      {albumCaption && (
        <figcaption
          style={{
            fontSize: '13.5px',
            lineHeight: 1.6,
            color: '#57534e',
            marginTop: '10px',
            padding: '8px 14px',
            background: 'rgba(245, 245, 244, 0.7)',
            borderRadius: '8px',
            borderLeft: '3px solid #d97706',
          }}
        >
          {albumCaption}
        </figcaption>
      )}

      {/* Lightbox Modal */}
      {enableLightbox && lightboxIndex !== null && (
        <Lightbox
          images={parsedImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </figure>
  )
}
