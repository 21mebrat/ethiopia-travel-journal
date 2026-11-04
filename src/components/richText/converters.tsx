import React from 'react'
import { defaultJSXConverters, type JSXConverters } from '@payloadcms/richtext-lexical/react'
import { UploadRenderer } from './UploadRenderer'
import { VisualMediaLayoutRenderer } from './VisualMediaLayoutRenderer'
import { MediaLayoutRenderer } from './MediaLayoutRenderer'
import { extractTextFromNode, slugifyHeading } from '@/lib/site/toc'

/**
 * Custom JSX Converters for Lexical Rich Text
 *
 * Handles:
 * 1. Headings with stable anchor IDs matching Table of Contents.
 * 2. Single uploaded media files: respects custom size (width presets / px),
 *    float alignment with text wrap, aspect ratios / reshaping, corner rounding,
 *    captions, and fullscreen click-to-zoom lightbox.
 * 3. Visual Media Layouts (Drag & Drop): renders freeform multi-column and asymmetric
 *    magazine grids with exact proportional column widths, aspect ratios, and lightbox.
 * 4. Backward-compatible Galleries & Media Layouts.
 */
export const articleJSXConverters: JSXConverters = {
  ...defaultJSXConverters,
  heading: ({ node, nodesToJSX }: any) => {
    const Tag = (node.tag as keyof React.JSX.IntrinsicElements) || 'h2'
    const text = extractTextFromNode(node)
    const id = slugifyHeading(text)
    return <Tag id={id}>{nodesToJSX({ nodes: node.children })}</Tag>
  },
  upload: ({ node }: any) => <UploadRenderer node={node} />,
  blocks: {
    visualMediaLayout: ({ node }: any) => <VisualMediaLayoutRenderer {...(node?.fields || {})} />,
    mediaLayout: ({ node }: any) => <VisualMediaLayoutRenderer {...(node?.fields || {})} />,
    imageGallery: ({ node }: any) => <MediaLayoutRenderer {...(node?.fields || {})} />,
  },
}
