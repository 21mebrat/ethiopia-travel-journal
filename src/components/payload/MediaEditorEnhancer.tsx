'use client'

import React, { useEffect } from 'react'
import { getNearestEditorFromDOMNode, $getNearestNodeFromDOMNode } from 'lexical'

/**
 * MediaEditorEnhancer
 *
 * Direct-Manipulation Mouse & Cursor Media Resizer and Positioner for Payload's Lexical Editor.
 *
 * FEATURES:
 * 1. 100% Mouse & Cursor Direct Manipulation:
 *    - Corner drag handles (NW, NE, SE, SW): click and drag with mouse cursor to resize smoothly in real time.
 *    - Edge drag handles (E, W, S): drag horizontally to change width; drag bottom handle to reshape height & aspect ratio.
 *    - Live HUD Tooltip on cursor: shows exact pixel size and percentage (`↔ 520px · 65%`).
 * 2. On-Image Positioning & Reshaping Controls:
 *    - Mouse-drag grip (`::: Move`): drag across the editor to snap float left, float right, or center block.
 *    - Direct mouse click position pills: `[ ⇱ Left ]` `[ ▢ Center ]` `[ ⇲ Right ]` `[ ↔ Full ]`.
 *    - Direct mouse click reshape chips: `[ Auto ]` `[ 16:9 ]` `[ 4:3 ]` `[ 1:1 ]` `[ 3:4 ]`.
 *    - Direct mouse click corner shape toggle: `[ Sharp ]` `[ Rounded ]` `[ Pill ]`.
 * 3. Real-Time Text Wrapping in Lexical Editor:
 *    - Floated media wraps editorial text immediately in the admin editor.
 *    - Headings and horizontal rules clear floats.
 * 4. Reliable Lexical Node Persistence:
 *    - Updates the Lexical `UploadNode` data directly upon mouse interaction.
 *    - Changes are saved cleanly to MongoDB when the article is saved.
 */
export default function MediaEditorEnhancer({ children }: { children?: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Inject Comprehensive Admin CSS for Direct Manipulation & Text Wrapping
    const styleId = 'payload-lexical-direct-manipulation-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        /* Editor container clearfix for floated elements */
        .editor-input,
        .LexicalEditorTheme__root {
          position: relative;
        }

        .editor-input::after,
        .LexicalEditorTheme__root::after {
          content: "";
          display: table;
          clear: both;
        }

        .editor-input h1,
        .editor-input h2,
        .editor-input h3,
        .editor-input hr,
        .LexicalEditorTheme__root h1,
        .LexicalEditorTheme__root h2,
        .LexicalEditorTheme__root h3,
        .LexicalEditorTheme__root hr {
          clear: both;
        }

        /* Override Payload's hardcoded 450px constraints */
        .LexicalEditorTheme__upload,
        .LexicalEditorTheme__upload__contents,
        .LexicalEditorTheme__upload__card,
        .LexicalEditorTheme__upload__media,
        .LexicalEditorTheme__upload img,
        .LexicalEditorTheme__upload svg,
        .LexicalEditorTheme__upload__contents--landscape img,
        .LexicalEditorTheme__upload__contents--landscape svg,
        .LexicalEditorTheme__upload__contents--portrait img,
        .LexicalEditorTheme__upload__contents--portrait svg {
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }

        /* Lexical Upload Decorator Base */
        .LexicalEditorTheme__upload,
        .lexical-upload {
          position: relative;
          transition: width 0.15s ease, margin 0.15s ease;
          box-sizing: border-box;
        }

        /* Alignment & Float Text Wrap in Lexical Admin Editor */
        .LexicalEditorTheme__upload[data-align="left"],
        .lexical-upload[data-align="left"],
        .lexical-upload__contents[data-align="left"] {
          float: left !important;
          margin: 0.5rem 1.75rem 1.25rem 0 !important;
          max-width: 50% !important;
          clear: left;
        }

        .LexicalEditorTheme__upload[data-align="right"],
        .lexical-upload[data-align="right"],
        .lexical-upload__contents[data-align="right"] {
          float: right !important;
          margin: 0.5rem 0 1.25rem 1.75rem !important;
          max-width: 50% !important;
          clear: right;
        }

        .LexicalEditorTheme__upload[data-align="center"],
        .lexical-upload[data-align="center"],
        .lexical-upload__contents[data-align="center"] {
          margin: 1.5rem auto !important;
          display: block !important;
          clear: both;
        }

        .LexicalEditorTheme__upload[data-align="wide"],
        .lexical-upload[data-align="wide"],
        .lexical-upload__contents[data-align="wide"] {
          margin: 2rem auto !important;
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          clear: both;
        }

        /* Direct Manipulation Wrapper & Frame */
        .meh-overlay-wrapper {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 25;
        }

        .meh-bounding-box {
          position: absolute;
          inset: -3px;
          border: 2px dashed rgba(217, 119, 6, 0.4);
          border-radius: 8px;
          pointer-events: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .lexical-upload__contents:hover .meh-bounding-box,
        .lexical-upload__contents.meh-active .meh-bounding-box {
          border: 2px solid #d97706;
          border-style: solid;
          box-shadow: 0 0 0 1px rgba(217, 119, 6, 0.3), 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        /* Corner Drag Handles */
        .meh-handle {
          position: absolute;
          pointer-events: auto;
          box-sizing: border-box;
          z-index: 35;
          user-select: none;
          -webkit-user-select: none;
        }

        .meh-corner-handle {
          width: 12px;
          height: 12px;
          background: #ffffff;
          border: 2px solid #d97706;
          border-radius: 3px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
          transition: transform 0.15s ease, background-color 0.15s ease;
        }

        .meh-corner-handle:hover {
          transform: scale(1.35);
          background: #d97706;
          border-color: #ffffff;
        }

        .meh-handle-nw { top: -6px; left: -6px; cursor: nwse-resize; }
        .meh-handle-ne { top: -6px; right: -6px; cursor: nesw-resize; }
        .meh-handle-se { bottom: -6px; right: -6px; cursor: nwse-resize; }
        .meh-handle-sw { bottom: -6px; left: -6px; cursor: nesw-resize; }

        /* Edge Drag Handles */
        .meh-edge-handle-ew {
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 38px;
          background: #d97706;
          border-radius: 9999px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
          cursor: ew-resize;
          transition: transform 0.15s ease, width 0.15s ease;
        }

        .meh-edge-handle-ew:hover {
          transform: translateY(-50%) scaleX(1.5);
          background: #b45309;
        }

        .meh-handle-e { right: -4px; }
        .meh-handle-w { left: -4px; }

        .meh-handle-s {
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 48px;
          height: 6px;
          background: #d97706;
          border-radius: 9999px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
          cursor: ns-resize;
          transition: transform 0.15s ease, height 0.15s ease;
        }

        .meh-handle-s:hover {
          transform: translateX(-50%) scaleY(1.5);
          background: #b45309;
        }

        /* Floating On-Image Controls Toolbar */
        .meh-floating-toolbar {
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%) translateY(-4px);
          display: flex;
          align-items: center;
          gap: 3px;
          background: rgba(18, 18, 22, 0.94);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          padding: 3px 6px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
          z-index: 40;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
        }

        .lexical-upload__contents:hover .meh-floating-toolbar,
        .lexical-upload__contents.meh-active .meh-floating-toolbar {
          opacity: 1;
          pointer-events: auto;
          transform: translateX(-50%) translateY(0);
        }

        /* Toolbar Buttons & Drag Grip */
        .meh-btn {
          background: transparent;
          border: none;
          color: #e2e8f0;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 7px;
          border-radius: 9999px;
          cursor: pointer;
          transition: background-color 0.15s, color 0.15s, transform 0.1s;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          line-height: 1.2;
          user-select: none;
        }

        .meh-btn:hover {
          background: rgba(255, 255, 255, 0.18);
          color: #ffffff;
        }

        .meh-btn.meh-active {
          background: #d97706;
          color: #ffffff;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        }

        .meh-drag-grip {
          cursor: grab;
          color: #fbbf24;
          font-weight: 700;
          padding: 3px 8px;
          background: rgba(217, 119, 6, 0.2);
          border-radius: 9999px;
          border: 1px solid rgba(217, 119, 6, 0.35);
        }

        .meh-drag-grip:active {
          cursor: grabbing;
          background: #d97706;
          color: #ffffff;
        }

        .meh-divider {
          width: 1px;
          height: 14px;
          background: rgba(255, 255, 255, 0.2);
          margin: 0 2px;
        }

        /* Live HUD Tooltip on Cursor */
        .meh-hud {
          position: fixed;
          display: none;
          padding: 4px 9px;
          background: rgba(15, 23, 42, 0.95);
          color: #f8fafc;
          font-size: 11px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-weight: 600;
          border-radius: 6px;
          border: 1px solid rgba(217, 119, 6, 0.6);
          pointer-events: none;
          z-index: 999999;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
          white-space: nowrap;
          transform: translate(12px, 12px);
        }
      `
      document.head.appendChild(style)
    }

    // 2. Global Live HUD Tooltip
    let globalHud = document.getElementById('meh-global-hud') as HTMLDivElement | null
    if (!globalHud) {
      globalHud = document.createElement('div')
      globalHud.id = 'meh-global-hud'
      globalHud.className = 'meh-hud'
      document.body.appendChild(globalHud)
    }

    // Helper: Find Lexical Editor instance associated with DOM element
    const findLexicalEditor = (element: HTMLElement) => {
      try {
        const direct = getNearestEditorFromDOMNode(element)
        if (direct) return direct
      } catch {
        // Fallback search
      }

      const root =
        element.closest<HTMLElement>('.editor-input') ||
        element.closest<HTMLElement>('[contenteditable="true"]') ||
        element.closest<HTMLElement>('.LexicalEditorTheme__root')

      if (root && (root as any).__lexicalEditor) {
        return (root as any).__lexicalEditor
      }
      return null
    }

    // Helper: Persist field updates to Lexical Node and Form State
    const persistToLexicalNode = (
      uploadCard: HTMLElement,
      updates: {
        customWidth?: number
        widthPreset?: string
        alignment?: string
        aspectRatio?: string
        shape?: string
      },
    ) => {
      const editor = findLexicalEditor(uploadCard)
      if (editor) {
        editor.update(() => {
          const node = $getNearestNodeFromDOMNode(uploadCard) || $getNearestNodeFromDOMNode(uploadCard.parentElement || uploadCard)
          if (node && typeof (node as any).getData === 'function') {
            const currentData = (node as any).getData() || {}
            ;(node as any).setData({
              ...currentData,
              fields: {
                ...(currentData.fields || {}),
                ...updates,
              },
            })
            if (updates.alignment && typeof (node as any).setFormat === 'function') {
              ;(node as any).setFormat(updates.alignment)
            }
          }
        })
      }

      // Notify parent forms of change to trigger save state
      uploadCard.dispatchEvent(new Event('input', { bubbles: true }))
      uploadCard.dispatchEvent(new Event('change', { bubbles: true }))
    }

    // 3. Attach Direct-Manipulation Controls to an Upload Card
    const attachDirectManipulation = (card: HTMLElement) => {
      if (card.getAttribute('data-meh-attached') === 'true') return
      card.setAttribute('data-meh-attached', 'true')

      // Ensure relative positioning
      const uploadParent = card.closest<HTMLElement>('.LexicalEditorTheme__upload, .lexical-upload') || card
      card.style.position = 'relative'

      // Create Overlay Container
      const overlay = document.createElement('div')
      overlay.className = 'meh-overlay-wrapper'

      // Bounding Box
      const boundingBox = document.createElement('div')
      boundingBox.className = 'meh-bounding-box'
      overlay.appendChild(boundingBox)

      // Corner Handles (NW, NE, SE, SW)
      const handles = ['nw', 'ne', 'se', 'sw'] as const
      handles.forEach((pos) => {
        const handle = document.createElement('div')
        handle.className = `meh-handle meh-corner-handle meh-handle-${pos}`
        handle.setAttribute('data-handle', pos)
        overlay.appendChild(handle)
      })

      // Edge Handles (E, W, S)
      const handleE = document.createElement('div')
      handleE.className = 'meh-handle meh-edge-handle-ew meh-handle-e'
      handleE.setAttribute('data-handle', 'e')
      overlay.appendChild(handleE)

      const handleW = document.createElement('div')
      handleW.className = 'meh-handle meh-edge-handle-ew meh-handle-w'
      handleW.setAttribute('data-handle', 'w')
      overlay.appendChild(handleW)

      const handleS = document.createElement('div')
      handleS.className = 'meh-handle meh-handle-s'
      handleS.setAttribute('data-handle', 's')
      handleS.title = 'Drag down/up to reshape aspect ratio'
      overlay.appendChild(handleS)

      // Floating On-Image Toolbar
      const toolbar = document.createElement('div')
      toolbar.className = 'meh-floating-toolbar'

      // Drag Grip
      const dragGrip = document.createElement('button')
      dragGrip.type = 'button'
      dragGrip.className = 'meh-btn meh-drag-grip'
      dragGrip.innerHTML = '⠿ Drag to Move'
      dragGrip.title = 'Click and drag mouse across editor to snap Float Left, Center, or Float Right'
      toolbar.appendChild(dragGrip)

      // Divider
      const div1 = document.createElement('div')
      div1.className = 'meh-divider'
      toolbar.appendChild(div1)

      // Position Buttons (Left, Center, Right, Wide)
      const positions = [
        { label: '⇱ Left', value: 'left', title: 'Float Left (Text wraps around on right)' },
        { label: '▢ Center', value: 'center', title: 'Center Block' },
        { label: '⇲ Right', value: 'right', title: 'Float Right (Text wraps around on left)' },
        { label: '↔ Wide', value: 'wide', title: 'Full Content Width' },
      ]

      const positionBtns: HTMLButtonElement[] = []
      positions.forEach(({ label, value, title }) => {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'meh-btn'
        btn.textContent = label
        btn.title = title
        btn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          applyAlignment(value)
          persistToLexicalNode(card, { alignment: value })
        })
        toolbar.appendChild(btn)
        positionBtns.push(btn)
      })

      // Divider
      const div2 = document.createElement('div')
      div2.className = 'meh-divider'
      toolbar.appendChild(div2)

      // Reshape / Aspect Ratio Chips
      const ratios = [
        { label: 'Auto', value: 'auto' },
        { label: '16:9', value: '16-9' },
        { label: '4:3', value: '4-3' },
        { label: '1:1', value: '1-1' },
        { label: '3:4', value: '3-4' },
      ]

      const ratioBtns: HTMLButtonElement[] = []
      ratios.forEach(({ label, value }) => {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'meh-btn'
        btn.textContent = label
        btn.title = `Reshape frame to ${label}`
        btn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          applyAspectRatio(value)
          persistToLexicalNode(card, { aspectRatio: value })
        })
        toolbar.appendChild(btn)
        ratioBtns.push(btn)
      })

      // Divider
      const div3 = document.createElement('div')
      div3.className = 'meh-divider'
      toolbar.appendChild(div3)

      // Corner Shape Toggle Button
      const cornerShapes = ['rounded-normal', 'sharp', 'circle']
      let currentCornerIdx = 0
      const cornerBtn = document.createElement('button')
      cornerBtn.type = 'button'
      cornerBtn.className = 'meh-btn'
      cornerBtn.textContent = '▢ Rounded'
      cornerBtn.title = 'Click with mouse to cycle corner shape (Rounded -> Sharp -> Circle)'
      cornerBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        currentCornerIdx = (currentCornerIdx + 1) % cornerShapes.length
        const nextShape = cornerShapes[currentCornerIdx]
        applyShape(nextShape)
        persistToLexicalNode(card, { shape: nextShape })
      })
      toolbar.appendChild(cornerBtn)

      overlay.appendChild(toolbar)
      card.appendChild(overlay)

      // --- Internal State & Style Application ---
      let currentAlignment = card.getAttribute('data-align') || 'center'
      let currentRatio = 'auto'
      let currentShape = 'rounded-normal'

      const mediaEl = card.querySelector<HTMLElement>('.lexical-upload__media') || card
      const imgEl = card.querySelector<HTMLElement>('img')

      const applyAlignment = (align: string) => {
        currentAlignment = align
        uploadParent.setAttribute('data-align', align)
        card.setAttribute('data-align', align)

        if (align === 'left') {
          uploadParent.style.float = 'left'
          uploadParent.style.margin = '0.5rem 1.75rem 1.25rem 0'
          uploadParent.style.maxWidth = '50%'
          uploadParent.style.display = 'block'
          uploadParent.style.clear = 'left'
        } else if (align === 'right') {
          uploadParent.style.float = 'right'
          uploadParent.style.margin = '0.5rem 0 1.25rem 1.75rem'
          uploadParent.style.maxWidth = '50%'
          uploadParent.style.display = 'block'
          uploadParent.style.clear = 'right'
        } else if (align === 'wide') {
          uploadParent.style.float = 'none'
          uploadParent.style.margin = '2rem auto'
          uploadParent.style.width = '100%'
          uploadParent.style.maxWidth = '100%'
          uploadParent.style.display = 'block'
          uploadParent.style.clear = 'both'
        } else {
          // Center block
          uploadParent.style.float = 'none'
          uploadParent.style.margin = '1.5rem auto'
          uploadParent.style.display = 'block'
          uploadParent.style.clear = 'both'
        }

        positionBtns.forEach((b, idx) => {
          b.classList.toggle('meh-active', positions[idx].value === align)
        })
      }

      const applyAspectRatio = (ratio: string) => {
        currentRatio = ratio
        if (ratio === '16-9') mediaEl.style.aspectRatio = '16 / 9'
        else if (ratio === '4-3') mediaEl.style.aspectRatio = '4 / 3'
        else if (ratio === '1-1') mediaEl.style.aspectRatio = '1 / 1'
        else if (ratio === '3-4') mediaEl.style.aspectRatio = '3 / 4'
        else mediaEl.style.aspectRatio = ''

        if (imgEl) {
          imgEl.style.objectFit = ratio === 'auto' ? '' : 'cover'
          imgEl.style.width = '100%'
          imgEl.style.height = ratio === 'auto' ? 'auto' : '100%'
        }

        ratioBtns.forEach((b, idx) => {
          b.classList.toggle('meh-active', ratios[idx].value === ratio)
        })
      }

      const applyShape = (shape: string) => {
        currentShape = shape
        let radius = '8px'
        let label = '▢ Rounded'
        if (shape === 'sharp') {
          radius = '0px'
          label = '▢ Sharp'
        } else if (shape === 'circle') {
          radius = '9999px'
          label = '◯ Circle'
        }
        card.style.borderRadius = radius
        if (mediaEl) mediaEl.style.borderRadius = radius
        if (imgEl) imgEl.style.borderRadius = radius
        cornerBtn.textContent = label
      }

      const applyWidth = (widthPx: number) => {
        const rounded = Math.round(widthPx)
        uploadParent.style.width = `${rounded}px`
        uploadParent.style.maxWidth = '100%'
        card.style.width = '100%'
      }

      // Initial alignment display
      applyAlignment(currentAlignment)

      // --- MOUSE DRAG RESIZING HANDLERS ---
      overlay.querySelectorAll<HTMLElement>('.meh-handle').forEach((handle) => {
        handle.addEventListener('mousedown', (e) => {
          e.preventDefault()
          e.stopPropagation()

          const handleType = handle.getAttribute('data-handle')
          if (!handleType) return

          card.classList.add('meh-active')
          const editorInput = card.closest<HTMLElement>('.editor-input, [contenteditable="true"]') || document.body
          const editorWidth = editorInput.getBoundingClientRect().width || 800
          const startRect = card.getBoundingClientRect()
          const startX = e.clientX
          const startY = e.clientY
          const startWidth = startRect.width
          const startHeight = startRect.height

          if (globalHud) globalHud.style.display = 'block'
          document.body.style.userSelect = 'none'

          let finalCalculatedWidth = startWidth

          const onMouseMove = (moveEvent: MouseEvent) => {
            moveEvent.preventDefault()
            const dx = moveEvent.clientX - startX
            const dy = moveEvent.clientY - startY

            let newWidth = startWidth

            if (handleType === 'se' || handleType === 'ne' || handleType === 'e') {
              newWidth = Math.max(120, Math.min(editorWidth, startWidth + dx))
            } else if (handleType === 'sw' || handleType === 'nw' || handleType === 'w') {
              newWidth = Math.max(120, Math.min(editorWidth, startWidth - dx))
            }

            if (handleType === 's') {
              // Reshaping height and aspect ratio with bottom handle
              const newHeight = Math.max(80, startHeight + dy)
              mediaEl.style.aspectRatio = `${startWidth} / ${newHeight}`
              if (imgEl) {
                imgEl.style.objectFit = 'cover'
                imgEl.style.height = '100%'
              }
              if (globalHud) {
                globalHud.textContent = `📐 Reshape: ${Math.round(startWidth)} × ${Math.round(newHeight)}px`
                globalHud.style.left = `${moveEvent.clientX}px`
                globalHud.style.top = `${moveEvent.clientY}px`
              }
            } else {
              // Width resizing with corner or edge handles
              finalCalculatedWidth = newWidth
              applyWidth(newWidth)
              const percent = Math.round((newWidth / editorWidth) * 100)
              if (globalHud) {
                globalHud.textContent = `↔ Size: ${Math.round(newWidth)}px (${percent}%)`
                globalHud.style.left = `${moveEvent.clientX}px`
                globalHud.style.top = `${moveEvent.clientY}px`
              }
            }
          }

          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
            card.classList.remove('meh-active')
            if (globalHud) globalHud.style.display = 'none'
            document.body.style.userSelect = ''

            // Persist to Lexical Node
            if (handleType === 's') {
              const currentAspect = mediaEl.style.aspectRatio || 'auto'
              persistToLexicalNode(card, { aspectRatio: currentAspect })
            } else {
              persistToLexicalNode(card, {
                customWidth: Math.round(finalCalculatedWidth),
                widthPreset: 'custom',
              })
            }
          }

          window.addEventListener('mousemove', onMouseMove)
          window.addEventListener('mouseup', onMouseUp)
        })
      })

      // --- MOUSE DRAG TO POSITION GRIP HANDLER ---
      dragGrip.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()

        card.classList.add('meh-active')
        const editorInput = card.closest<HTMLElement>('.editor-input, [contenteditable="true"]') || document.body
        const editorRect = editorInput.getBoundingClientRect()
        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'grabbing'
        if (globalHud) globalHud.style.display = 'block'

        let currentCandidate: 'left' | 'center' | 'right' = 'center'

        const onMouseMove = (moveEvent: MouseEvent) => {
          moveEvent.preventDefault()
          const relX = moveEvent.clientX - editorRect.left
          const ratio = relX / editorRect.width

          if (ratio < 0.35) {
            currentCandidate = 'left'
            if (globalHud) globalHud.textContent = '⇱ Snap: Float Left (Text Wraps Right)'
          } else if (ratio > 0.65) {
            currentCandidate = 'right'
            if (globalHud) globalHud.textContent = '⇲ Snap: Float Right (Text Wraps Left)'
          } else {
            currentCandidate = 'center'
            if (globalHud) globalHud.textContent = '▢ Snap: Centered Block'
          }

          if (globalHud) {
            globalHud.style.left = `${moveEvent.clientX}px`
            globalHud.style.top = `${moveEvent.clientY}px`
          }
        }

        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove)
          window.removeEventListener('mouseup', onMouseUp)
          card.classList.remove('meh-active')
          if (globalHud) globalHud.style.display = 'none'
          document.body.style.userSelect = ''
          document.body.style.cursor = ''

          applyAlignment(currentCandidate)
          persistToLexicalNode(card, { alignment: currentCandidate })
        }

        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
      })
    }

    // 4. Scan and attach to all upload nodes (supporting all Payload theme class variations)
    const scanUploadCards = () => {
      const uploadCards = document.querySelectorAll<HTMLElement>(
        '.LexicalEditorTheme__upload__card, .LexicalEditorTheme__upload__contents, [class*="LexicalEditorTheme__upload__card"], [class*="LexicalEditorTheme__upload__contents"], .lexical-upload__contents, .lexical-upload__card'
      )
      uploadCards.forEach((card) => {
        attachDirectManipulation(card)
      })
    }

    const observer = new MutationObserver(() => {
      scanUploadCards()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    scanUploadCards()

    return () => {
      observer.disconnect()
    }
  }, [])

  return <>{children}</>
}
