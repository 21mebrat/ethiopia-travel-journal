import React from 'react'
import { defaultJSXConverters, type JSXConverters } from '@payloadcms/richtext-lexical/react'
import { UploadRenderer } from './UploadRenderer'
import { VisualMediaLayoutRenderer } from './VisualMediaLayoutRenderer'
import { MediaLayoutRenderer } from './MediaLayoutRenderer'

/**
 * Custom JSX Converters for Lexical Rich Text
 *
 * Handles:
 * 1. Single uploaded media files: respects custom size (width presets / px),
 *    float alignment with text wrap, aspect ratios / reshaping, corner rounding,
 *    captions, and fullscreen click-to-zoom lightbox.
 * 2. Visual Media Layouts (Drag & Drop): renders freeform multi-column and asymmetric
 *    magazine grids with exact proportional column widths, aspect ratios, and lightbox.
 * 3. Backward-compatible Galleries & Media Layouts.
 */
export const articleJSXConverters: JSXConverters = {
  ...defaultJSXConverters,
  upload: ({ node }: any) => <UploadRenderer node={node} />,
  blocks: {
    visualMediaLayout: ({ node }: any) => <VisualMediaLayoutRenderer {...(node?.fields || {})} />,
    mediaLayout: ({ node }: any) => <VisualMediaLayoutRenderer {...(node?.fields || {})} />,
    imageGallery: ({ node }: any) => <MediaLayoutRenderer {...(node?.fields || {})} />,
  },
}
