'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey } from 'lexical'
import { useFormFields, useDocumentForm } from '@payloadcms/ui'
import { useBlockComponentContext, $isBlockNode } from '@payloadcms/richtext-lexical/client'
import { InlineMediaSelector, type MediaDoc } from './InlineMediaSelector'
import {
  type GridCell,
  type VisualGridData,
  insertMediaDocs,
  createEmptyGrid,
  hydrateVisualLayout,
  ensureDesignCoordinates,
  reflowAroundPinnedBox,
  CANVAS_WIDTH,
  DEFAULT_ROW_HEIGHT,
  DEFAULT_GAP,
  MIN_CELL_WIDTH,
  MIN_CELL_HEIGHT,
} from './gridLayoutEngine'

export type { GridCell, VisualGridData }

function extractMediaIds(grid: VisualGridData): string[] {
  const ids: string[] = []
  grid.cells.forEach((cell) => {
    if (cell.mediaId && !ids.includes(cell.mediaId)) {
      ids.push(cell.mediaId)
    }
  })
  return ids
}

type HandleDirection = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'

interface ActiveGesture {
  type: 'move' | 'resize'
  handle?: HandleDirection
  cellId: string
  pointerId: number
  startClientX: number
  startClientY: number
  startBox: { x: number; y: number; width: number; height: number }
  snapshotGrid: VisualGridData
  hasExceededThreshold: boolean
}

export default function VisualMediaLayoutBlock(props: any) {
  const { formData, nodeKey: propNodeKey } = props

  let blockContext: any = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    blockContext = useBlockComponentContext()
  } catch {
    // Rendered outside BlockComponentContext
  }

  let documentForm: any = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    documentForm = useDocumentForm()
  } catch {
    // Rendered outside DocumentFormContext
  }

  const effectiveNodeKey = propNodeKey || blockContext?.nodeKey

  const layoutDataFromForm = useFormFields(([fields]) => fields?.layoutData?.value) as VisualGridData | undefined
  const captionFromForm = useFormFields(([fields]) => fields?.caption?.value) as string | undefined
  const imagesFromForm = useFormFields(([fields]) => fields?.images?.value) as any[] | undefined
  const mediaItemsFromForm = useFormFields(([fields]) => fields?.mediaItems?.value) as any[] | undefined

  // The Lexical node fields are the serialized source of truth. Reading them first
  // means undo/redo and external node updates are reflected immediately; the block
  // form is kept as a fallback mirror for rendering the hidden fields.
  const activeLayoutData =
    formData?.layoutData ?? layoutDataFromForm ?? blockContext?.initialState?.layoutData?.value
  const activeCaption =
    formData?.caption ?? captionFromForm ?? blockContext?.initialState?.caption?.value ?? ''
  const activeImages = formData?.images ?? imagesFromForm ?? blockContext?.initialState?.images?.value
  const activeMediaItems =
    formData?.mediaItems ?? mediaItemsFromForm ?? blockContext?.initialState?.mediaItems?.value

  const hydration = hydrateVisualLayout({
    layoutData: activeLayoutData,
    images: activeImages,
    mediaItems: activeMediaItems,
    caption: activeCaption,
  })

  let editor: any = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [lexicalEditor] = useLexicalComposerContext()
    editor = lexicalEditor
  } catch {
    // In case rendered outside LexicalComposerContext
  }

  // Committed authoritative grid. Hydration is shared with the public renderer so
  // legacy `images` blocks open with the exact same cells the reader sees.
  const [grid, setGrid] = useState<VisualGridData>(() => hydration.grid)

  // Transient preview grid during mouse/pointer gesture
  const [previewGrid, setPreviewGrid] = useState<VisualGridData | null>(null)

  const [selectedCellId, setSelectedCellId] = useState<string | null>(null)
  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null)

  // Media Selector State (Add vs Choose)
  const [isMediaSelectorOpen, setIsMediaSelectorOpen] = useState(false)
  const [selectorInitialTab, setSelectorInitialTab] = useState<'choose' | 'upload'>('choose')
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null)

  // Live HUD state
  const [hud, setHud] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const activeGestureRef = useRef<ActiveGesture | null>(null)

  // Display grid is previewGrid during active gesture, else authoritative grid
  const displayGrid = previewGrid || grid

  // The `formData` prop on a custom block component is captured when the block
  // element is first rendered, so it does NOT refresh when the Lexical node is
  // mutated (media insert, resize, undo/redo). The node is the live source of
  // truth, so subscribe to editor updates and re-read its fields. This is what
  // makes the editor follow Undo/Redo and any external node mutation.
  const applyNodeFields = useCallback((fields: any) => {
    if (activeGestureRef.current) return

    const incoming = hydrateVisualLayout({
      layoutData: fields?.layoutData,
      images: fields?.images,
      mediaItems: fields?.mediaItems,
      caption: fields?.caption,
    }).grid

    setGrid((prev) => {
      // Legacy `images` cells may have had their media docs resolved over the
      // network locally; keep those URLs instead of dropping back to a bare ID
      // on the next unrelated editor update.
      const merged: VisualGridData = {
        ...incoming,
        cells: incoming.cells.map((cell) => {
          if (cell.url) return cell
          const previous = prev.cells.find(
            (candidate) =>
              candidate.id === cell.id ||
              (candidate.mediaId && candidate.mediaId === cell.mediaId),
          )
          if (!previous?.url) return cell
          return {
            ...cell,
            url: previous.url,
            filename: cell.filename || previous.filename,
            alt: cell.alt ?? previous.alt,
            caption: cell.caption ?? previous.caption,
          }
        }),
      }

      return JSON.stringify(merged) === JSON.stringify(prev) ? prev : merged
    })
  }, [])

  useEffect(() => {
    if (!editor || !effectiveNodeKey) return

    const syncFromNode = () => {
      const fields = editor.getEditorState().read(() => {
        const node = $getNodeByKey(effectiveNodeKey)
        return $isBlockNode(node) ? node.getFields() : null
      })
      if (fields) applyNodeFields(fields)
    }

    syncFromNode()
    return editor.registerUpdateListener(syncFromNode)
  }, [editor, effectiveNodeKey, applyNodeFields])

  // Legacy `images` entries may only contain relationship IDs in the admin form.
  // Resolve the missing media documents so legacy blocks render in the editor too.
  const missingLegacyMediaIds = grid.cells
    .filter((cell) => !cell.url && cell.mediaId)
    .map((cell) => cell.mediaId)
  const missingLegacyMediaKey = missingLegacyMediaIds.join(',')

  useEffect(() => {
    if (!missingLegacyMediaKey) return
    const ids = missingLegacyMediaKey.split(',')
    let cancelled = false

    const resolve = async () => {
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            const res = await fetch(`/api/media/${encodeURIComponent(id)}?depth=0`)
            if (!res.ok) return null
            return (await res.json()) as MediaDoc
          }),
        )
        if (cancelled) return
        const byId = new Map(results.filter(Boolean).map((doc) => [String(doc!.id), doc!]))

        setGrid((prev) => ({
          ...prev,
          cells: prev.cells.map((cell) => {
            if (cell.url) return cell
            const doc = byId.get(String(cell.mediaId))
            if (!doc?.url) return cell
            return {
              ...cell,
              url: doc.url,
              filename: cell.filename || doc.filename,
              alt: cell.alt ?? doc.alt,
              caption: cell.caption ?? doc.caption,
            }
          }),
        }))
      } catch {
        // Leave the cells in place; they will resolve on the next mount.
      }
    }

    void resolve()
    return () => {
      cancelled = true
    }
  }, [missingLegacyMediaKey])

  // Persist the layout to the Lexical node (the serialized source of truth).
  //
  // Deliberately NOT mirrored with `dispatchFields` on the block form: the
  // block form's `onChange` round-trips every dispatched value through
  // `getFormState` and re-applies it to the node inside a deferred
  // `editor.update()`. That produces a redundant, duplicate history entry, so a
  // single browser Undo only reverts the re-application and the layout appears
  // unchanged. It can also overwrite a legitimate Undo with stale state.
  // Every field in this block is `admin.hidden`, and the node is what the
  // Lexical rich-text field serializes on save, so the form mirror is unused.
  const persistGrid = useCallback(
    (newGrid: VisualGridData) => {
      setGrid(newGrid)
      setPreviewGrid(null)

      const mediaIds = extractMediaIds(newGrid)

      // 1. Mark parent document form modified so Save/Publish are enabled.
      if (documentForm?.setModified) {
        documentForm.setModified(true)
      }

      // 2. Update the Lexical node directly. `setFields(..., true)` prevents
      // the block form's cache-buster from resetting on every pointer gesture;
      // the node itself is still the source of truth that gets serialized on save.
      if (editor && effectiveNodeKey) {
        editor.update(() => {
          const node = $getNodeByKey(effectiveNodeKey)
          if ($isBlockNode(node)) {
            const current = node.getFields()
            node.setFields(
              {
                ...current,
                layoutData: newGrid,
                mediaItems: mediaIds,
                caption: newGrid.caption ?? current.caption ?? '',
              },
              true,
            )
          }
        })
      }
    },
    [documentForm, editor, effectiveNodeKey],
  )

  // --------------------------------------------------------------------------
  // Media Insertion Handlers
  // --------------------------------------------------------------------------

  const handleMediaInsert = (mediaInput: MediaDoc | MediaDoc[]) => {
    const docs = Array.isArray(mediaInput) ? mediaInput : [mediaInput]
    if (docs.length === 0) return

    // Replace single target image
    if (replaceTargetId) {
      const targetDoc = docs[0]
      const updatedCells = grid.cells.map((c) =>
        c.id === replaceTargetId
          ? {
              ...c,
              mediaId: targetDoc.id,
              url: targetDoc.url,
              filename: targetDoc.filename,
              alt: targetDoc.alt || c.alt,
              caption: targetDoc.caption || c.caption,
            }
          : c,
      )
      persistGrid({ ...grid, cells: updatedCells })
      setReplaceTargetId(null)
      return
    }

    // Insert all selected media docs using the collision-free layout engine
    const nextGrid = insertMediaDocs(grid, docs)
    persistGrid(ensureDesignCoordinates(nextGrid))
  }

  // Delete an image from grid
  const removeCell = (cellId: string) => {
    const remaining = grid.cells.filter((c) => c.id !== cellId)
    if (remaining.length === 0) {
      persistGrid(createEmptyGrid())
      setSelectedCellId(null)
      return
    }

    const totalHeight = Math.max(
      ...remaining.map((c) => (c.y ?? 0) + (c.height ?? DEFAULT_ROW_HEIGHT)),
      DEFAULT_ROW_HEIGHT,
    )

    persistGrid({
      ...grid,
      cells: remaining,
      totalHeight,
    })
    if (selectedCellId === cellId) setSelectedCellId(null)
  }

  // --------------------------------------------------------------------------
  // Unified Pointer Gesture Controller (Drag Move & 8-Handle Resizing)
  // --------------------------------------------------------------------------

  const startGesture = (
    e: React.PointerEvent,
    cellId: string,
    type: 'move' | 'resize',
    handle?: HandleDirection,
  ) => {
    e.preventDefault()
    e.stopPropagation()

    const targetEl = e.currentTarget as HTMLElement
    try {
      targetEl.setPointerCapture(e.pointerId)
    } catch {
      // Safe fallback
    }

    const cell = grid.cells.find((c) => c.id === cellId)
    if (!cell) return

    setSelectedCellId(cellId)

    const startBox = {
      x: cell.x ?? 0,
      y: cell.y ?? 0,
      width: cell.width ?? MIN_CELL_WIDTH,
      height: cell.height ?? MIN_CELL_HEIGHT,
    }

    const gesture: ActiveGesture = {
      type,
      handle,
      cellId,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startBox,
      snapshotGrid: grid,
      hasExceededThreshold: type === 'resize', // Resizing activates immediately
    }

    activeGestureRef.current = gesture

    let latestCalculatedGrid = grid

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== gesture.pointerId) return
      moveEvent.preventDefault()

      const deltaX = moveEvent.clientX - gesture.startClientX
      const deltaY = moveEvent.clientY - gesture.startClientY

      if (!gesture.hasExceededThreshold) {
        if (Math.hypot(deltaX, deltaY) >= 4) {
          gesture.hasExceededThreshold = true
        } else {
          return
        }
      }

      if (!stageRef.current) return
      const stageRect = stageRef.current.getBoundingClientRect()
      const scale = stageRect.width / CANVAS_WIDTH
      if (scale <= 0) return

      const deltaDesignX = deltaX / scale
      const deltaDesignY = deltaY / scale

      const { startBox } = gesture
      let newX = startBox.x
      let newY = startBox.y
      let newWidth = startBox.width
      let newHeight = startBox.height

      if (gesture.type === 'move') {
        // --- DRAG MOVE ---
        newX = Math.max(0, Math.min(CANVAS_WIDTH - startBox.width, startBox.x + deltaDesignX))
        newY = Math.max(0, startBox.y + deltaDesignY)

        // Magnetic snap to column/row tracks if close (within 12 design units)
        const snapColWidth = (CANVAS_WIDTH - (grid.columns - 1) * DEFAULT_GAP) / grid.columns
        for (let col = 0; col < grid.columns; col++) {
          const trackX = col * (snapColWidth + DEFAULT_GAP)
          if (Math.abs(newX - trackX) < 14) {
            newX = trackX
            break
          }
        }
        for (let r = 0; r < 8; r++) {
          const trackY = r * (DEFAULT_ROW_HEIGHT + DEFAULT_GAP)
          if (Math.abs(newY - trackY) < 14) {
            newY = trackY
            break
          }
        }
      } else if (gesture.type === 'resize' && gesture.handle) {
        // --- 8-HANDLE INDEPENDENT RESIZING ---
        const h = gesture.handle

        // Horizontal resizing (W, E, NW, NE, SW, SE)
        if (h === 'e' || h === 'se' || h === 'ne') {
          // East: Left (x) is pinned; width changes
          newWidth = Math.max(MIN_CELL_WIDTH, Math.min(CANVAS_WIDTH - startBox.x, startBox.width + deltaDesignX))
        } else if (h === 'w' || h === 'sw' || h === 'nw') {
          // West: Right edge (x + width) is pinned; x and width change
          const rightEdge = startBox.x + startBox.width
          newX = Math.max(0, Math.min(rightEdge - MIN_CELL_WIDTH, startBox.x + deltaDesignX))
          newWidth = rightEdge - newX
        }

        // Vertical resizing (N, S, NW, NE, SW, SE)
        if (h === 's' || h === 'se' || h === 'sw') {
          // South: Top (y) is pinned; height changes
          newHeight = Math.max(MIN_CELL_HEIGHT, startBox.height + deltaDesignY)
        } else if (h === 'n' || h === 'ne' || h === 'nw') {
          // North: Bottom edge (y + height) is pinned; y and height change
          const bottomEdge = startBox.y + startBox.height
          newY = Math.max(0, Math.min(bottomEdge - MIN_CELL_HEIGHT, startBox.y + deltaDesignY))
          newHeight = bottomEdge - newY
        }
      }

      // Reflow neighbors around pinned box WITHOUT resizing any neighbor!
      const updatedPinned: GridCell = {
        ...cell,
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      }

      const next = reflowAroundPinnedBox(gesture.snapshotGrid, updatedPinned)
      latestCalculatedGrid = next
      setPreviewGrid(next)

      const accepted = next.cells.find((c) => c.id === cellId) || updatedPinned
      setHud({
        text:
          gesture.type === 'move'
            ? `Position: (${accepted.x}, ${accepted.y})`
            : `Width: ${accepted.width} · Height: ${accepted.height}`,
        x: moveEvent.clientX,
        y: moveEvent.clientY,
      })
    }

    const cleanupGesture = () => {
      try {
        targetEl.releasePointerCapture(gesture.pointerId)
      } catch {
        // Safe fallback
      }
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      window.removeEventListener('keydown', onKeyDown)
      activeGestureRef.current = null
      setHud(null)
    }

    const onPointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== gesture.pointerId) return
      cleanupGesture()

      if (gesture.hasExceededThreshold) {
        // Commit one single completed gesture to Lexical state
        persistGrid(latestCalculatedGrid)
      } else {
        // Simple click without movement: select cell
        setPreviewGrid(null)
      }
    }

    const onPointerCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId !== gesture.pointerId) return
      cleanupGesture()
      // Cancel restores gesture-start snapshot without persisting
      setPreviewGrid(null)
    }

    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') {
        cleanupGesture()
        setPreviewGrid(null)
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    window.addEventListener('keydown', onKeyDown)
  }

  // --------------------------------------------------------------------------
  // RENDER: Pure Editorial WYSIWYG
  // --------------------------------------------------------------------------

  // Empty state: clean prompt with ONLY Add Media & Choose Media
  if (displayGrid.cells.length === 0) {
    return (
      <div
        className="vml-empty-canvas"
        style={{
          margin: 0,
          padding: '24px 16px',
          border: '1.5px dashed var(--border)',
          borderRadius: 'var(--radius)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          background: 'var(--card)',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: '28px' }}>🖼️</span>
        <div style={{ textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: 'var(--foreground)' }}>
            Insert Media Layout
          </h4>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted-foreground)' }}>
            Choose an existing image or upload a new photo to begin arranging your layout
          </p>
        </div>

        {/* The ONLY Two Persistent Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={() => {
              setSelectorInitialTab('upload')
              setIsMediaSelectorOpen(true)
            }}
            style={{
              padding: '8px 16px',
              background: 'var(--chart-1, #d97706)',
              color: 'var(--primary-foreground, #ffffff)',
              border: 'none',
              borderRadius: 'var(--radius-md, 8px)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <span>+</span>
            <span>Add / Upload Media</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectorInitialTab('choose')
              setIsMediaSelectorOpen(true)
            }}
            style={{
              padding: '8px 16px',
              background: 'var(--secondary)',
              color: 'var(--secondary-foreground)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md, 8px)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🖼️</span>
            <span>Choose Existing Media</span>
          </button>
        </div>

        <InlineMediaSelector
          isOpen={isMediaSelectorOpen}
          initialTab={selectorInitialTab}
          multiSelect={replaceTargetId === null}
          onClose={() => setIsMediaSelectorOpen(false)}
          onSelect={handleMediaInsert}
        />
      </div>
    )
  }

  const canvasWidth = CANVAS_WIDTH
  const totalHeight = Math.max(
    displayGrid.totalHeight || 0,
    ...displayGrid.cells.map((c) => (c.y ?? 0) + (c.height ?? DEFAULT_ROW_HEIGHT)),
    DEFAULT_ROW_HEIGHT,
  )

  return (
    <div
      ref={containerRef}
      className="vml-canvas-root"
      style={{
        position: 'relative',
        margin: 0,
        padding: 0,
        width: '100%',
        boxSizing: 'border-box',
        userSelect: activeGestureRef.current ? 'none' : 'auto',
      }}
      onClick={() => setSelectedCellId(null)}
    >
      {/* Live Measurement HUD Tooltip */}
      {hud && (
        <div
          style={{
            position: 'fixed',
            left: `${hud.x}px`,
            top: `${hud.y - 32}px`,
            transform: 'translateX(-50%)',
            background: 'var(--popover)',
            color: 'var(--popover-foreground)',
            border: '1px solid var(--border)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm, 6px)',
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'monospace',
            zIndex: 999999,
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            pointerEvents: 'none',
          }}
        >
          {hud.text}
        </div>
      )}

      {/* Contained Canvas Stage (Independent Dimensions, Proportional Responsive Scaling) */}
      <div
        ref={stageRef}
        className="vml-canvas-stage"
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: `${canvasWidth} / ${totalHeight}`,
          boxSizing: 'border-box',
          margin: 0,
          padding: 0,
          background: 'transparent',
          overflow: 'visible',
        }}
      >
        {displayGrid.cells.map((cell) => {
          const isSelected = selectedCellId === cell.id
          const isHovered = hoveredCellId === cell.id
          const isGesturingThis = activeGestureRef.current?.cellId === cell.id

          const leftPercent = ((cell.x ?? 0) / canvasWidth) * 100
          const topPercent = ((cell.y ?? 0) / totalHeight) * 100
          const widthPercent = ((cell.width ?? MIN_CELL_WIDTH) / canvasWidth) * 100
          const heightPercent = ((cell.height ?? MIN_CELL_HEIGHT) / totalHeight) * 100

          const borderRadius =
            cell.shape === 'sharp' ? '0px' : cell.shape === 'pill' ? '9999px' : 'var(--radius, 8px)'

          return (
            <div
              key={cell.id}
              className="vml-image-cell"
              onPointerDown={(e) => startGesture(e, cell.id, 'move')}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedCellId(cell.id)
              }}
              onMouseEnter={() => setHoveredCellId(cell.id)}
              onMouseLeave={() => setHoveredCellId(null)}
              style={{
                position: 'absolute',
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
                margin: 0,
                padding: 0,
                boxSizing: 'border-box',
                borderRadius,
                overflow: 'visible',
                cursor: isGesturingThis ? 'grabbing' : 'grab',
                opacity: isGesturingThis ? 0.9 : 1,
                touchAction: 'none',
                outline: isSelected
                  ? '2.5px solid var(--chart-1, #d97706)'
                  : isHovered
                  ? '1.5px dashed var(--chart-1, #d97706)'
                  : 'none',
                boxShadow: isSelected
                  ? '0 0 0 2px var(--ring, rgba(217, 119, 6, 0.25)), 0 8px 24px rgba(0,0,0,0.12)'
                  : 'none',
                transition: isGesturingThis ? 'none' : 'box-shadow 0.15s, outline 0.15s',
                zIndex: isGesturingThis ? 30 : isSelected ? 20 : 10,
              }}
            >
              {/* Normal Editorial Image Container */}
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
                  background: isSelected ? 'var(--muted, rgba(0, 0, 0, 0.05))' : 'transparent',
                  borderRadius,
                  overflow: 'hidden',
                  pointerEvents: 'none',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cell.url}
                  alt={cell.alt || cell.filename}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: cell.objectFit ?? (cell.aspectRatio === 'auto' ? 'contain' : 'cover'),
                    display: 'block',
                    pointerEvents: 'none',
                    borderRadius,
                  }}
                />
              </div>

              {/* Discreet Action Icons on Hover/Selection (Fit Policy, Replace & Delete) */}
              {(isSelected || isHovered) && !activeGestureRef.current && (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 40,
                    background: 'var(--popover)',
                    color: 'var(--popover-foreground)',
                    border: '1px solid var(--border)',
                    backdropFilter: 'blur(8px)',
                    padding: '3px 6px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      const currentFit = cell.objectFit ?? (cell.aspectRatio === 'auto' ? 'contain' : 'cover')
                      const nextFit: 'contain' | 'cover' = currentFit === 'contain' ? 'cover' : 'contain'
                      const updatedCells = grid.cells.map((c) =>
                        c.id === cell.id ? { ...c, objectFit: nextFit } : c,
                      )
                      persistGrid({ ...grid, cells: updatedCells })
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--foreground)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '2px 5px',
                      borderRadius: 'var(--radius-sm, 4px)',
                    }}
                    title={(cell.objectFit ?? (cell.aspectRatio === 'auto' ? 'contain' : 'cover')) === 'contain' ? 'Switch to Cover (fill frame without stretching)' : 'Switch to Contain (letterbox, show full photo)'}
                  >
                    {(cell.objectFit ?? (cell.aspectRatio === 'auto' ? 'contain' : 'cover')) === 'contain' ? '⛶ Fill' : '⊡ Fit'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setReplaceTargetId(cell.id)
                      setSelectorInitialTab('choose')
                      setIsMediaSelectorOpen(true)
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--foreground)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm, 4px)',
                    }}
                    title="Replace with another image"
                  >
                    ⇄ Replace
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeCell(cell.id)
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--destructive)',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: 'var(--radius-sm, 4px)',
                    }}
                    title="Delete image"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* 8-Directional Interactive Resize Handles (ONLY visible when image is selected) */}
              {isSelected && (
                <>
                  {/* North (Top Edge) */}
                  <div
                    onPointerDown={(e) => startGesture(e, cell.id, 'resize', 'n')}
                    title="Drag top edge to resize height"
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '32px',
                      height: '8px',
                      background: 'var(--chart-1, #d97706)',
                      borderRadius: '9999px',
                      zIndex: 35,
                      cursor: 'ns-resize',
                      touchAction: 'none',
                    }}
                  />

                  {/* South (Bottom Edge) */}
                  <div
                    onPointerDown={(e) => startGesture(e, cell.id, 'resize', 's')}
                    title="Drag bottom edge to resize height"
                    style={{
                      position: 'absolute',
                      bottom: '-5px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '32px',
                      height: '8px',
                      background: 'var(--chart-1, #d97706)',
                      borderRadius: '9999px',
                      zIndex: 35,
                      cursor: 'ns-resize',
                      touchAction: 'none',
                    }}
                  />

                  {/* East (Right Edge) */}
                  <div
                    onPointerDown={(e) => startGesture(e, cell.id, 'resize', 'e')}
                    title="Drag right edge to resize width"
                    style={{
                      position: 'absolute',
                      right: '-5px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '8px',
                      height: '32px',
                      background: 'var(--chart-1, #d97706)',
                      borderRadius: '9999px',
                      zIndex: 35,
                      cursor: 'ew-resize',
                      touchAction: 'none',
                    }}
                  />

                  {/* West (Left Edge) */}
                  <div
                    onPointerDown={(e) => startGesture(e, cell.id, 'resize', 'w')}
                    title="Drag left edge to resize width"
                    style={{
                      position: 'absolute',
                      left: '-5px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '8px',
                      height: '32px',
                      background: 'var(--chart-1, #d97706)',
                      borderRadius: '9999px',
                      zIndex: 35,
                      cursor: 'ew-resize',
                      touchAction: 'none',
                    }}
                  />

                  {/* North-West (Top-Left Corner) */}
                  <div
                    onPointerDown={(e) => startGesture(e, cell.id, 'resize', 'nw')}
                    title="Drag corner to resize"
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      left: '-6px',
                      width: '12px',
                      height: '12px',
                      background: 'var(--card, #ffffff)',
                      border: '2px solid var(--chart-1, #d97706)',
                      borderRadius: 'var(--radius-sm, 3px)',
                      zIndex: 36,
                      cursor: 'nwse-resize',
                      touchAction: 'none',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                    }}
                  />

                  {/* North-East (Top-Right Corner) */}
                  <div
                    onPointerDown={(e) => startGesture(e, cell.id, 'resize', 'ne')}
                    title="Drag corner to resize"
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      width: '12px',
                      height: '12px',
                      background: 'var(--card, #ffffff)',
                      border: '2px solid var(--chart-1, #d97706)',
                      borderRadius: 'var(--radius-sm, 3px)',
                      zIndex: 36,
                      cursor: 'nesw-resize',
                      touchAction: 'none',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                    }}
                  />

                  {/* South-West (Bottom-Left Corner) */}
                  <div
                    onPointerDown={(e) => startGesture(e, cell.id, 'resize', 'sw')}
                    title="Drag corner to resize"
                    style={{
                      position: 'absolute',
                      bottom: '-6px',
                      left: '-6px',
                      width: '12px',
                      height: '12px',
                      background: 'var(--card, #ffffff)',
                      border: '2px solid var(--chart-1, #d97706)',
                      borderRadius: 'var(--radius-sm, 3px)',
                      zIndex: 36,
                      cursor: 'nesw-resize',
                      touchAction: 'none',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                    }}
                  />

                  {/* South-East (Bottom-Right Corner) */}
                  <div
                    onPointerDown={(e) => startGesture(e, cell.id, 'resize', 'se')}
                    title="Drag corner to resize"
                    style={{
                      position: 'absolute',
                      bottom: '-6px',
                      right: '-6px',
                      width: '12px',
                      height: '12px',
                      background: 'var(--card, #ffffff)',
                      border: '2px solid var(--chart-1, #d97706)',
                      borderRadius: 'var(--radius-sm, 3px)',
                      zIndex: 36,
                      cursor: 'nwse-resize',
                      touchAction: 'none',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                    }}
                  />
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Floating "+ Add More Images" Trigger (Discreet on hover/selection) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '6px',
          opacity: selectedCellId ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setReplaceTargetId(null)
            setSelectorInitialTab('choose')
            setIsMediaSelectorOpen(true)
          }}
          style={{
            padding: '4px 12px',
            background: 'var(--card)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <span style={{ color: 'var(--chart-1, #d97706)' }}>+</span>
          <span>Add More Images to Layout</span>
        </button>
      </div>

      {/* Media Selector (Add vs Choose) */}
      <InlineMediaSelector
        isOpen={isMediaSelectorOpen}
        initialTab={selectorInitialTab}
        multiSelect={replaceTargetId === null}
        onClose={() => {
          setIsMediaSelectorOpen(false)
          setReplaceTargetId(null)
        }}
        onSelect={handleMediaInsert}
      />
    </div>
  )
}
