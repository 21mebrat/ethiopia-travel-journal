'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  migrateFromLegacyRows,
  ensureDesignCoordinates,
  CANVAS_WIDTH,
  DEFAULT_ROW_HEIGHT,
  type GridCell,
} from '../lexical/gridLayoutEngine'

export type GridCellRenderer = GridCell

export type VisualMediaLayoutRendererProps = {
  layoutData?: {
    cells?: GridCellRenderer[]
    columns?: number
    columnTracks?: number[]
    rows?: number
    // Legacy support
    rowsList?: any[]
    caption?: string
  }
  mediaItems?: any[]
  caption?: string
  // Legacy fields
  images?: any[]
}

// Fullscreen Lightbox Modal
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
        zIndex: 999999,
        background: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        margin: 0,
      }}
      onClick={onClose}
    >
      <div
        style={{ position: 'relative', maxWidth: '92vw', maxHeight: '88vh', margin: 0, padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.alt || 'Ethiopia Travel Journal photo'}
          style={{
            maxWidth: '92vw',
            maxHeight: '88vh',
            objectFit: 'contain',
            borderRadius: 'var(--radius, 8px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            display: 'block',
          }}
        />
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handlePrev()
            }}
            style={{
              position: 'absolute',
              left: '24px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              width: '44px',
              height: '44px',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            style={{
              position: 'absolute',
              right: '24px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              width: '44px',
              height: '44px',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ›
          </button>
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              color: '#a8a29e',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '20px',
          right: '24px',
          background: 'rgba(255, 255, 255, 0.15)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '9999px',
          width: '40px',
          height: '40px',
          fontSize: '18px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ✕
      </button>
    </div>
  )
}

export function VisualMediaLayoutRenderer(props: VisualMediaLayoutRendererProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  let normalizedGrid = migrateFromLegacyRows(props.layoutData, props.caption ?? '')
  let cells: GridCellRenderer[] = normalizedGrid.cells

  // Fallback from legacy images array if present
  if (cells.length === 0 && props.images && props.images.length > 0) {
    const entries = props.images
      .map((entry: any) => {
        let doc = entry.image && typeof entry.image === 'object' ? entry.image : null
        if (!doc && entry.image && typeof entry.image === 'string') {
          const found = (props.mediaItems || []).find(
            (m: any) => (typeof m === 'object' ? m.id === entry.image : m === entry.image)
          )
          if (found && typeof found === 'object' && found.url) {
            doc = found
          } else {
            doc = { id: entry.image, url: entry.url || `/media/${entry.image}` }
          }
        } else if (!doc && entry.url) {
          doc = { id: entry.id || 'legacy', url: entry.url }
        }
        return { entry, doc }
      })
      .filter(({ doc }) => Boolean(doc?.url))

    const columns = Math.max(1, Math.min(2, entries.length))

    cells = entries.map(({ entry, doc }, index): GridCellRenderer => ({
      id: `legacy-${index}`,
      mediaId: doc.id || `legacy-${index}`,
      url: doc.url,
      filename: doc.filename || `legacy-${index}.jpg`,
      alt: entry.altText ?? doc.alt,
      caption: entry.caption ?? doc.caption,
      colStart: (index % columns) + 1,
      colSpan: 1,
      rowStart: Math.floor(index / columns) + 1,
      rowSpan: 1,
      aspectRatio: 'auto',
      shape: 'rounded',
    }))

    normalizedGrid = {
      ...normalizedGrid,
      cells,
      columns,
      columnTracks: Array(columns).fill(100 / columns),
      rows: Math.max(1, Math.ceil(cells.length / columns)),
    }
  }

  // Normalize completed layout before rendering so that legacy fallback images
  // receive distinct, non-overlapping continuous 2D design coordinates (x, y, width, height)
  normalizedGrid = ensureDesignCoordinates(normalizedGrid)
  cells = normalizedGrid.cells

  if (cells.length === 0) return null

  const allImages = cells
    .filter((c) => !!c.url)
    .map((c) => ({
      url: c.url,
      alt: c.alt,
      caption: c.caption,
    }))

  const canvasWidth = CANVAS_WIDTH
  const totalHeight = Math.max(
    normalizedGrid.totalHeight || 0,
    ...cells.map((c) => (c.y ?? 0) + (c.height ?? DEFAULT_ROW_HEIGHT)),
    DEFAULT_ROW_HEIGHT,
  )

  return (
    <div
      className="vml-public-layout"
      style={{
        margin: 0,
        padding: 0,
        width: '100%',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="vml-public-stage"
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: `${canvasWidth} / ${totalHeight}`,
          overflow: 'hidden',
          margin: 0,
          padding: 0,
          background: 'transparent',
          boxSizing: 'border-box',
        }}
      >
        {cells.map((cell, idx) => {
          const leftPercent = ((cell.x ?? 0) / canvasWidth) * 100
          const topPercent = ((cell.y ?? 0) / totalHeight) * 100
          const widthPercent = ((cell.width ?? 389) / canvasWidth) * 100
          const heightPercent = ((cell.height ?? DEFAULT_ROW_HEIGHT) / totalHeight) * 100

          const borderRadius =
            cell.shape === 'sharp' ? '0px' : cell.shape === 'pill' ? '9999px' : 'var(--radius, 8px)'

          return (
            <div
              key={cell.id}
              className="vml-public-cell group"
              onClick={() => {
                if (!cell.url) return
                const imageIndex = cells
                  .slice(0, idx)
                  .filter((candidate) => Boolean(candidate.url)).length
                setLightboxIndex(imageIndex)
              }}
              style={{
                position: 'absolute',
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
                borderRadius,
                overflow: 'hidden',
                cursor: 'zoom-in',
                margin: 0,
                padding: 0,
                background: 'transparent',
                boxSizing: 'border-box',
                transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: 0,
                  padding: 0,
                  background: 'transparent',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cell.url}
                  alt={cell.alt || 'Ethiopia Travel Journal photo'}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: cell.objectFit ?? (cell.aspectRatio === 'auto' ? 'contain' : 'cover'),
                    display: 'block',
                    borderRadius,
                    transition: 'transform 0.4s ease',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Lightbox Zoom */}
      {lightboxIndex !== null && allImages.length > 0 && (
        <Lightbox
          images={allImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
