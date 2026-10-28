'use client'

import React, { useState } from 'react'
import Image from 'next/image'

export type UploadNodeProps = {
  node: {
    value?: {
      id?: string
      url?: string
      alt?: string
      caption?: string
      width?: number
      height?: number
      mimeType?: string
      filename?: string
    } | string
    fields?: {
      widthPreset?: '100' | '75' | '66' | '50' | '33' | '25' | 'custom' | string
      customWidth?: number
      alignment?: 'center' | 'left' | 'right' | 'wide' | string
      aspectRatio?: 'auto' | '16-9' | '4-3' | '1-1' | '3-4' | '9-16' | string
      shape?: 'rounded-normal' | 'rounded-large' | 'sharp' | 'circle' | string
      objectFit?: 'cover' | 'contain' | string
      caption?: string
      altText?: string
    }
    format?: 'left' | 'center' | 'right' | string
  }
}

export function UploadRenderer({ node }: UploadNodeProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  if (!node || typeof node.value !== 'object' || !node.value?.url) {
    return null
  }

  const uploadDoc = node.value
  if (!uploadDoc || !uploadDoc.url) {
    return null
  }

  const imageUrl = uploadDoc.url
  const fields = node.fields || {}

  // 1. Dimensions & Sizing
  const widthPreset = fields.widthPreset || '100'
  const customWidth = fields.customWidth
  let calculatedWidth = '100%'
  let calculatedMaxWidth = '100%'

  if (widthPreset === 'custom' && customWidth) {
    calculatedWidth = `${customWidth}px`
    calculatedMaxWidth = '100%'
  } else if (widthPreset === '75') {
    calculatedWidth = '75%'
  } else if (widthPreset === '66') {
    calculatedWidth = '66.6%'
  } else if (widthPreset === '50') {
    calculatedWidth = '50%'
  } else if (widthPreset === '33') {
    calculatedWidth = '33.3%'
  } else if (widthPreset === '25') {
    calculatedWidth = '25%'
  } else {
    calculatedWidth = '100%'
  }

  // 2. Alignment & Float
  // Priority: fields.alignment, fallback to node.format
  const alignment = fields.alignment || node.format || 'center'
  let floatStyle: React.CSSProperties = {}

  if (alignment === 'left') {
    floatStyle = {
      float: 'left',
      margin: '0.5rem 1.75rem 1.25rem 0',
      maxWidth: widthPreset === '100' ? '50%' : calculatedWidth,
      clear: 'left',
    }
  } else if (alignment === 'right') {
    floatStyle = {
      float: 'right',
      margin: '0.5rem 0 1.25rem 1.75rem',
      maxWidth: widthPreset === '100' ? '50%' : calculatedWidth,
      clear: 'right',
    }
  } else if (alignment === 'wide') {
    floatStyle = {
      display: 'block',
      margin: '2.5rem auto',
      width: '100%',
      maxWidth: '1080px',
      clear: 'both',
    }
  } else {
    // Center block
    floatStyle = {
      display: 'block',
      margin: '2rem auto',
      width: calculatedWidth,
      maxWidth: calculatedMaxWidth,
      clear: 'both',
    }
  }

  // 3. Aspect Ratio / Reshape
  const aspectRatio = fields.aspectRatio || 'auto'
  let ratioValue: string | undefined = undefined
  if (aspectRatio.includes('/')) {
    ratioValue = aspectRatio
  } else {
    switch (aspectRatio) {
      case '16-9':
        ratioValue = '16 / 9'
        break
      case '4-3':
        ratioValue = '4 / 3'
        break
      case '1-1':
        ratioValue = '1 / 1'
        break
      case '3-4':
        ratioValue = '3 / 4'
        break
      case '9-16':
        ratioValue = '9 / 16'
        break
      default:
        ratioValue = undefined
    }
  }

  // 4. Corner Shape
  const shape = fields.shape || 'rounded-normal'
  let borderRadius = '12px'
  if (shape === 'rounded-large') borderRadius = '20px'
  else if (shape === 'sharp') borderRadius = '0px'
  else if (shape === 'circle') borderRadius = '9999px'
  else borderRadius = '12px'

  // 5. Fit
  const objectFit = (fields.objectFit as 'cover' | 'contain') || 'cover'

  // 6. Text info
  const alt = fields.altText || uploadDoc.alt || fields.caption || uploadDoc.caption || 'Image'
  const caption = fields.caption || uploadDoc.caption

  // Non-image fallback (e.g. PDF / audio / video)
  if (uploadDoc.mimeType && !uploadDoc.mimeType.startsWith('image')) {
    return (
      <div style={{ margin: '1.5rem 0', ...floatStyle }}>
        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            background: '#f5f5f4',
            color: '#1c1917',
            textDecoration: 'none',
            border: '1px solid #e7e5e4',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          <span>📎</span>
          <span>{uploadDoc.filename || 'Download Attached File'}</span>
        </a>
      </div>
    )
  }

  return (
    <>
      <figure
        style={{
          ...floatStyle,
          position: 'relative',
        }}
        className="rich-text-upload-figure group"
      >
        <div
          onClick={() => setIsLightboxOpen(true)}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: ratioValue,
            borderRadius,
            overflow: 'hidden',
            cursor: 'zoom-in',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.07)',
            background: '#e7e5e4',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          {ratioValue ? (
            <Image
              src={imageUrl}
              alt={alt}
              fill
              style={{ objectFit }}
              sizes="(max-width: 768px) 100vw, 820px"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={alt}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                objectFit,
                borderRadius,
              }}
            />
          )}

          {/* Quick Hover Zoom Pill */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'rgba(15, 23, 42, 0.65)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              backdropFilter: 'blur(4px)',
              opacity: 0,
              transition: 'opacity 0.2s',
              pointerEvents: 'none',
            }}
            className="group-hover:opacity-100"
          >
            🔍 Zoom
          </div>
        </div>

        {/* Caption */}
        {caption && (
          <figcaption
            style={{
              fontSize: '13px',
              lineHeight: 1.5,
              color: '#78716c',
              textAlign: alignment === 'center' ? 'center' : 'left',
              marginTop: '8px',
              paddingInline: '4px',
              fontStyle: 'italic',
            }}
          >
            {caption}
          </figcaption>
        )}
      </figure>

      {/* Lightbox when clicked */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsLightboxOpen(false)}
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
            padding: '24px',
          }}
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close image"
            style={{
              position: 'absolute',
              top: '20px',
              right: '24px',
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
            }}
          >
            ✕
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={alt}
            style={{
              maxWidth: '92vw',
              maxHeight: '82vh',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
              userSelect: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          />

          {caption && (
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
              {caption}
            </div>
          )}
        </div>
      )}
    </>
  )
}
