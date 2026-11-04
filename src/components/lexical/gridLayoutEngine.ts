export type GridCell = {
  id: string
  mediaId: string
  url: string
  filename: string
  alt?: string
  caption?: string
  // CSS Grid coordinates (backward compatibility)
  colStart: number
  colSpan: number
  rowStart: number
  rowSpan: number
  // Design coordinate geometry (version 2: independent per-image dimensions)
  x?: number // in design coordinate units (0 to 1200)
  y?: number // vertical offset in design units (>= 0)
  width?: number // width in design units (> 0)
  height?: number // height in design units (> 0)
  // Visual styling
  aspectRatio?: 'auto' | '16/9' | '4/3' | '1/1' | '3/4'
  objectFit?: 'cover' | 'contain'
  shape?: 'rounded' | 'sharp' | 'pill'
}

export type VisualGridData = {
  version?: number
  cells: GridCell[]
  columns: number
  columnTracks: number[] // Percentage widths (e.g. [50, 50])
  rows: number
  caption?: string
  canvasWidth?: number
  totalHeight?: number
}

export type MediaDocItem = {
  id: string
  url: string
  filename: string
  alt?: string
  caption?: string
  objectFit?: 'cover' | 'contain'
}

export const CANVAS_WIDTH = 1200
export const DEFAULT_ROW_HEIGHT = 280
export const DEFAULT_GAP = 16
export const MIN_CELL_WIDTH = 80
export const MIN_CELL_HEIGHT = 80

export function uid(): string {
  return Math.random().toString(36).substring(2, 9)
}

/**
 * Normalizes an array of percentage numbers so they sum up to exactly 100 with 1 decimal place.
 */
export function normalizeTracks(tracks: number[]): number[] {
  if (tracks.length === 0) return [100]
  const sum = tracks.reduce((a, b) => a + b, 0)
  if (sum === 0) return normalizeTracks(tracks.map(() => 1))
  const normalized = tracks.map((t) => Math.round((t / sum) * 1000) / 10)
  const diff = 100 - normalized.reduce((a, b) => a + b, 0)
  normalized[normalized.length - 1] = Math.round((normalized[normalized.length - 1] + diff) * 10) / 10
  return normalized
}

/**
 * Computes CSS gridTemplateColumns using fr units to prevent gap-overflow issues.
 */
export function getGridTemplateColumnsCss(columnTracks: number[]): string {
  if (!columnTracks || columnTracks.length === 0) return '1fr'
  if (columnTracks.length === 1) return '100%'
  return columnTracks.map((t) => `${Math.max(1, Math.round(t * 10) / 10)}fr`).join(' ')
}

/**
 * Checks if two bounding boxes overlap in 2D grid space.
 */
export function doCellsOverlap(
  a: { colStart: number; colSpan: number; rowStart: number; rowSpan: number },
  b: { colStart: number; colSpan: number; rowStart: number; rowSpan: number },
): boolean {
  const aColEnd = a.colStart + a.colSpan
  const aRowEnd = a.rowStart + a.rowSpan
  const bColEnd = b.colStart + b.colSpan
  const bRowEnd = b.rowStart + b.rowSpan

  const colOverlap = a.colStart < bColEnd && aColEnd > b.colStart
  const rowOverlap = a.rowStart < bRowEnd && aRowEnd > b.rowStart
  return colOverlap && rowOverlap
}

/**
 * Checks if two boxes overlap in continuous 2D design coordinates.
 */
export function doBoxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  gap = 0,
): boolean {
  const aRight = a.x + a.width
  const aBottom = a.y + a.height
  const bRight = b.x + b.width
  const bBottom = b.y + b.height

  return a.x < bRight - gap && aRight > b.x + gap && a.y < bBottom - gap && aBottom > b.y + gap
}

/**
 * Checks if a specific grid coordinate (col, row) is covered by any cell.
 */
export function isCellOccupied(
  cells: GridCell[],
  col: number,
  row: number,
  ignoreCellId?: string,
): boolean {
  return cells.some(
    (c) =>
      c.id !== ignoreCellId &&
      col >= c.colStart &&
      col < c.colStart + c.colSpan &&
      row >= c.rowStart &&
      row < c.rowStart + c.rowSpan,
  )
}

/**
 * Checks if an entire rectangular region is free of occupants.
 */
export function isRegionFree(
  cells: GridCell[],
  colStart: number,
  colSpan: number,
  rowStart: number,
  rowSpan: number,
  ignoreIds: string[] = [],
): boolean {
  const rect = { colStart, colSpan, rowStart, rowSpan }
  return !cells.some((c) => !ignoreIds.includes(c.id) && doCellsOverlap(c, rect))
}

/**
 * Converts grid span coordinates to continuous design coordinate boxes.
 */
export function computeCellBoxFromGrid(
  cell: { colStart: number; colSpan: number; rowStart: number; rowSpan: number },
  columns: number,
  tracks: number[] = [],
  canvasWidth = CANVAS_WIDTH,
  gap = DEFAULT_GAP,
  rowHeight = DEFAULT_ROW_HEIGHT,
): { x: number; y: number; width: number; height: number } {
  const colCount = Math.max(1, columns)
  const normalizedTracks =
    tracks.length === colCount
      ? normalizeTracks(tracks)
      : normalizeTracks(Array(colCount).fill(100 / colCount))

  const totalGap = (colCount - 1) * gap
  const availableWidth = Math.max(0, canvasWidth - totalGap)

  const trackWidths = normalizedTracks.map((t) => (t / 100) * availableWidth)
  const trackLefts: number[] = []
  let currentLeft = 0
  for (let i = 0; i < colCount; i++) {
    trackLefts.push(currentLeft)
    currentLeft += trackWidths[i] + gap
  }

  const startIdx = Math.max(0, Math.min(colCount - 1, cell.colStart - 1))
  const span = Math.max(1, Math.min(colCount - startIdx, cell.colSpan))

  const x = Math.round(trackLefts[startIdx] ?? 0)
  let width = 0
  for (let i = startIdx; i < startIdx + span; i++) {
    width += trackWidths[i] ?? 0
  }
  width += (span - 1) * gap
  width = Math.round(width)

  const y = Math.round((cell.rowStart - 1) * (rowHeight + gap))
  const height = Math.round(cell.rowSpan * rowHeight + (cell.rowSpan - 1) * gap)

  return { x, y, width, height }
}

/**
 * Ensures all cells in grid have populated x, y, width, height in design coordinates.
 */
export function ensureDesignCoordinates(grid: VisualGridData): VisualGridData {
  const columns = Math.max(1, grid.columns || 1)
  const tracks = grid.columnTracks?.length ? grid.columnTracks : Array(columns).fill(100 / columns)

  const cells = grid.cells.map((cell) => {
    if (
      typeof cell.x === 'number' &&
      typeof cell.y === 'number' &&
      typeof cell.width === 'number' &&
      typeof cell.height === 'number'
    ) {
      return cell
    }

    const box = computeCellBoxFromGrid(cell, columns, tracks)
    return {
      ...cell,
      ...box,
    }
  })

  const totalHeight = Math.max(
    ...cells.map((c) => (c.y ?? 0) + (c.height ?? DEFAULT_ROW_HEIGHT)),
    DEFAULT_ROW_HEIGHT,
  )

  return {
    ...grid,
    version: 2,
    cells,
    canvasWidth: CANVAS_WIDTH,
    totalHeight,
  }
}

/**
 * Reflows other cells around a pinned cell in grid span units.
 * Strictly preserves neighbors' rowSpan and colSpan.
 */
export function reflowAroundPinnedCell(
  grid: VisualGridData,
  pinned: GridCell,
): VisualGridData {
  const placed: GridCell[] = [pinned]
  const others = grid.cells
    .filter((cell) => cell.id !== pinned.id)
    .slice()
    .sort(
      (a, b) =>
        a.rowStart - b.rowStart ||
        a.colStart - b.colStart ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )

  for (const original of others) {
    let candidate = { ...original }
    for (;;) {
      const blockers = placed.filter((cell) => doCellsOverlap(candidate, cell))
      if (blockers.length === 0) break
      candidate = {
        ...candidate,
        rowStart: Math.max(...blockers.map((cell) => cell.rowStart + cell.rowSpan)),
      }
    }
    placed.push(candidate)
  }

  const byId = new Map(placed.map((cell) => [cell.id, cell]))
  const updatedCells = grid.cells.map((cell) => {
    const res = byId.get(cell.id)!
    // Also synchronize design coordinates
    const box = computeCellBoxFromGrid(res, grid.columns, grid.columnTracks)
    return {
      ...res,
      ...box,
    }
  })

  const rows = updatedCells.reduce((max, cell) => Math.max(max, cell.rowStart + cell.rowSpan - 1), 1)
  const totalHeight = Math.max(
    ...updatedCells.map((c) => (c.y ?? 0) + (c.height ?? DEFAULT_ROW_HEIGHT)),
    DEFAULT_ROW_HEIGHT,
  )

  return {
    ...grid,
    version: 2,
    cells: updatedCells,
    rows,
    canvasWidth: CANVAS_WIDTH,
    totalHeight,
  }
}

/**
 * Reflows other cells around a pinned cell in 2D continuous design coordinates.
 * CRITICAL INVARIANT: NEIGHBORS NEVER RESIZE (their width & height are preserved 100%).
 * Colliding neighbors move vertically down to avoid overlap.
 */
export function reflowAroundPinnedBox(
  grid: VisualGridData,
  pinned: GridCell,
  gap = DEFAULT_GAP,
): VisualGridData {
  const safePinned: GridCell = {
    ...pinned,
    x: Math.max(0, Math.min(CANVAS_WIDTH - (pinned.width ?? MIN_CELL_WIDTH), pinned.x ?? 0)),
    y: Math.max(0, pinned.y ?? 0),
    width: Math.max(MIN_CELL_WIDTH, Math.min(CANVAS_WIDTH, pinned.width ?? MIN_CELL_WIDTH)),
    height: Math.max(MIN_CELL_HEIGHT, pinned.height ?? MIN_CELL_HEIGHT),
  }

  const placed: GridCell[] = [safePinned]
  const others = grid.cells
    .filter((cell) => cell.id !== safePinned.id)
    .slice()
    .sort(
      (a, b) =>
        (a.y ?? 0) - (b.y ?? 0) ||
        (a.x ?? 0) - (b.x ?? 0) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )

  for (const original of others) {
    let candidate = {
      ...original,
      x: original.x ?? 0,
      y: original.y ?? 0,
      width: original.width ?? MIN_CELL_WIDTH,
      height: original.height ?? MIN_CELL_HEIGHT,
    }

    for (;;) {
      const blockers = placed.filter((placedCell) =>
        doBoxesOverlap(
          candidate as { x: number; y: number; width: number; height: number },
          placedCell as { x: number; y: number; width: number; height: number },
          2, // 2px threshold to avoid false touch
        ),
      )
      if (blockers.length === 0) break

      // Shift candidate down past the lowest blocker
      const lowestBlockerBottom = Math.max(
        ...blockers.map((b) => (b.y ?? 0) + (b.height ?? MIN_CELL_HEIGHT)),
      )
      candidate = {
        ...candidate,
        y: lowestBlockerBottom + gap,
      }
    }
    placed.push(candidate)
  }

  const byId = new Map(placed.map((cell) => [cell.id, cell]))
  const updatedCells = grid.cells.map((cell) => {
    const updated = byId.get(cell.id)!
    // Approximate colStart, colSpan, rowStart, rowSpan for grid fallback
    const colCount = Math.max(1, grid.columns || 1)
    const colWidth = CANVAS_WIDTH / colCount
    const colStart = Math.max(1, Math.min(colCount, Math.floor((updated.x ?? 0) / colWidth) + 1))
    const colSpan = Math.max(1, Math.min(colCount - colStart + 1, Math.round((updated.width ?? colWidth) / colWidth)))
    const rowStart = Math.max(1, Math.floor((updated.y ?? 0) / (DEFAULT_ROW_HEIGHT + gap)) + 1)
    const rowSpan = Math.max(1, Math.round((updated.height ?? DEFAULT_ROW_HEIGHT) / (DEFAULT_ROW_HEIGHT + gap)))

    return {
      ...updated,
      colStart,
      colSpan,
      rowStart,
      rowSpan,
    }
  })

  const rows = updatedCells.reduce((max, cell) => Math.max(max, cell.rowStart + cell.rowSpan - 1), 1)
  const totalHeight = Math.max(
    ...updatedCells.map((c) => (c.y ?? 0) + (c.height ?? DEFAULT_ROW_HEIGHT)),
    DEFAULT_ROW_HEIGHT,
  )

  return {
    ...grid,
    version: 2,
    cells: updatedCells,
    rows,
    canvasWidth: CANVAS_WIDTH,
    totalHeight,
  }
}

/**
 * Resizes a cell's span with neighbor reflow (does not reject collisions!).
 */
export function resizeCellSpan(
  grid: VisualGridData,
  cellId: string,
  newColSpan?: number,
  newRowSpan?: number,
): VisualGridData {
  const target = grid.cells.find((cell) => cell.id === cellId)
  if (!target) return grid

  const requestedColumns = newColSpan ?? target.colSpan
  const requestedRows = newRowSpan ?? target.rowSpan
  if (!Number.isFinite(requestedColumns) || !Number.isFinite(requestedRows)) return grid

  const colSpan = Math.max(
    1,
    Math.min(grid.columns - target.colStart + 1, Math.round(requestedColumns)),
  )
  const rowSpan = Math.max(1, Math.min(6, Math.round(requestedRows)))
  if (colSpan === target.colSpan && rowSpan === target.rowSpan) return grid

  return reflowAroundPinnedCell(grid, { ...target, colSpan, rowSpan })
}

/**
 * Resizes a cell's continuous 2D design coordinate box.
 * Preserves width when resizing height; preserves height when resizing width.
 * Reflows neighbors without resizing them.
 */
export function resizeCellBox(
  grid: VisualGridData,
  cellId: string,
  newBox: { x?: number; y?: number; width?: number; height?: number },
): VisualGridData {
  const ensured = ensureDesignCoordinates(grid)
  const target = ensured.cells.find((cell) => cell.id === cellId)
  if (!target) return grid

  const x = typeof newBox.x === 'number' ? Math.max(0, newBox.x) : (target.x ?? 0)
  const y = typeof newBox.y === 'number' ? Math.max(0, newBox.y) : (target.y ?? 0)
  const width =
    typeof newBox.width === 'number'
      ? Math.max(MIN_CELL_WIDTH, Math.min(CANVAS_WIDTH - x, newBox.width))
      : (target.width ?? MIN_CELL_WIDTH)
  const height =
    typeof newBox.height === 'number'
      ? Math.max(MIN_CELL_HEIGHT, newBox.height)
      : (target.height ?? MIN_CELL_HEIGHT)

  const pinned: GridCell = {
    ...target,
    x,
    y,
    width,
    height,
  }

  return reflowAroundPinnedBox(ensured, pinned)
}

/**
 * Moves cell to target grid coordinate with neighbor reflow.
 */
export function moveCellTo(
  grid: VisualGridData,
  cellId: string,
  colStart: number,
  rowStart: number,
): VisualGridData {
  const source = grid.cells.find((cell) => cell.id === cellId)
  if (
    !source ||
    !Number.isInteger(colStart) ||
    !Number.isInteger(rowStart) ||
    colStart < 1 ||
    rowStart < 1 ||
    colStart + source.colSpan - 1 > grid.columns
  )
    return grid

  if (colStart === source.colStart && rowStart === source.rowStart) return grid
  return reflowAroundPinnedCell(grid, { ...source, colStart, rowStart })
}

/**
 * Moves cell to continuous design coordinates (x, y) with neighbor reflow.
 */
export function moveCellBox(
  grid: VisualGridData,
  cellId: string,
  newPosition: { x: number; y: number },
): VisualGridData {
  const ensured = ensureDesignCoordinates(grid)
  const target = ensured.cells.find((cell) => cell.id === cellId)
  if (!target) return grid

  const width = target.width ?? MIN_CELL_WIDTH
  const height = target.height ?? MIN_CELL_HEIGHT
  const x = Math.max(0, Math.min(CANVAS_WIDTH - width, newPosition.x))
  const y = Math.max(0, newPosition.y)

  const pinned: GridCell = {
    ...target,
    x,
    y,
    width,
    height,
  }

  return reflowAroundPinnedBox(ensured, pinned)
}

/**
 * Cascades downward reflow across any cells that collide with shifted cells.
 */
export function cascadeDownReflow(
  cells: GridCell[],
  shiftedIds: Set<string>,
  deltaRows: number,
): GridCell[] {
  let changed = true
  const current = [...cells]

  while (changed) {
    changed = false
    for (let i = 0; i < current.length; i++) {
      const candidate = current[i]
      if (shiftedIds.has(candidate.id)) continue

      const hasCollisionWithShifted = current.some(
        (other) => shiftedIds.has(other.id) && doCellsOverlap(candidate, other),
      )

      if (hasCollisionWithShifted) {
        current[i] = {
          ...candidate,
          rowStart: candidate.rowStart + deltaRows,
        }
        shiftedIds.add(candidate.id)
        changed = true
      }
    }
  }

  return current
}

/**
 * Finds the first unoccupied grid position that fits within max columns.
 */
export function findNextFreePosition(
  cells: GridCell[],
  columns: number,
  colSpan = 1,
  rowSpan = 1,
): { col: number; row: number } {
  const maxSearchRows = 100
  for (let r = 1; r <= maxSearchRows; r++) {
    for (let c = 1; c <= columns - colSpan + 1; c++) {
      if (isRegionFree(cells, c, colSpan, r, rowSpan)) {
        return { col: c, row: r }
      }
    }
  }
  const maxRow = cells.reduce((max, c) => Math.max(max, c.rowStart + c.rowSpan - 1), 0)
  return { col: 1, row: maxRow + 1 }
}

/**
 * Finds the first unoccupied 2D coordinate box that fits within CANVAS_WIDTH without colliding with any existing cell.
 * Evaluates candidate positions along horizontal and vertical scanlines, strictly preserving existing images'
 * positions and dimensions.
 */
export function findNextFreeBox(
  cells: GridCell[],
  desiredWidth: number,
  desiredHeight = DEFAULT_ROW_HEIGHT,
  gap = DEFAULT_GAP,
  canvasWidth = CANVAS_WIDTH,
): { x: number; y: number; width: number; height: number } {
  const width = Math.max(MIN_CELL_WIDTH, Math.min(canvasWidth, desiredWidth))
  const height = Math.max(MIN_CELL_HEIGHT, desiredHeight)

  if (cells.length === 0) {
    return { x: 0, y: 0, width, height }
  }

  // Ensure all existing cells have defined design coordinates
  const boxes = cells.map((c) => ({
    x: c.x ?? 0,
    y: c.y ?? 0,
    width: c.width ?? MIN_CELL_WIDTH,
    height: c.height ?? MIN_CELL_HEIGHT,
  }))

  // Collect candidate Y coordinates: 0, and bottom + gap of each box
  const yCandidates = Array.from(new Set([0, ...boxes.map((b) => b.y + b.height + gap)])).sort((a, b) => a - b)

  // Collect candidate X coordinates: 0, and right + gap of each box
  const xCandidates = Array.from(new Set([0, ...boxes.map((b) => b.x + b.width + gap)])).sort((a, b) => a - b)

  for (const y of yCandidates) {
    for (const x of xCandidates) {
      if (x + width > canvasWidth) continue

      const candidate = { x, y, width, height }
      const overlaps = boxes.some((b) => doBoxesOverlap(candidate, b, 1))

      if (!overlaps) {
        return candidate
      }
    }
  }

  // Fallback: place on a new row below all existing boxes
  const lowestBottom = Math.max(...boxes.map((b) => b.y + b.height), 0)
  return {
    x: 0,
    y: lowestBottom + gap,
    width,
    height,
  }
}

/**
 * Inserts one or more media docs into the grid without data loss or coordinate collision.
 */
export function insertMediaDocs(grid: VisualGridData, docs: MediaDocItem[]): VisualGridData {
  if (docs.length === 0) return grid

  // If grid is currently empty, create an initial multi-column arrangement
  if (grid.cells.length === 0) {
    const count = docs.length
    const columns = Math.min(count, 3)
    const tracks = normalizeTracks(Array(columns).fill(100 / columns))
    const newCells: GridCell[] = docs.map((doc, idx) => {
      const col = (idx % columns) + 1
      const row = Math.floor(idx / columns) + 1
      const cell: GridCell = {
        id: uid(),
        mediaId: doc.id,
        url: doc.url,
        filename: doc.filename,
        alt: doc.alt || doc.filename,
        caption: doc.caption,
        objectFit: doc.objectFit,
        colStart: col,
        colSpan: 1,
        rowStart: row,
        rowSpan: 1,
        aspectRatio: 'auto',
        shape: 'rounded',
      }
      const box = computeCellBoxFromGrid(cell, columns, tracks)
      return {
        ...cell,
        ...box,
      }
    })
    const rows = Math.ceil(docs.length / columns)
    const totalHeight = Math.max(
      ...newCells.map((c) => (c.y ?? 0) + (c.height ?? DEFAULT_ROW_HEIGHT)),
      DEFAULT_ROW_HEIGHT,
    )
    return {
      version: 2,
      cells: newCells,
      columns,
      columnTracks: tracks,
      rows: Math.max(1, rows),
      caption: grid.caption,
      canvasWidth: CANVAS_WIDTH,
      totalHeight,
    }
  }

  // Adding more images into an existing grid using exact 2D continuous collision-free allocation:
  const ensured = ensureDesignCoordinates(grid)
  const currentCells = ensured.cells.map((c) => ({ ...c }))
  const colCount = Math.max(1, ensured.columns || 1)
  const defaultColWidth = Math.round((CANVAS_WIDTH - (colCount - 1) * DEFAULT_GAP) / colCount)

  docs.forEach((doc) => {
    const box = findNextFreeBox(currentCells, defaultColWidth, DEFAULT_ROW_HEIGHT, DEFAULT_GAP, CANVAS_WIDTH)
    const colStart = Math.max(1, Math.min(colCount, Math.round(box.x / (defaultColWidth + DEFAULT_GAP)) + 1))
    const colSpan = Math.max(1, Math.min(colCount - colStart + 1, Math.round(box.width / defaultColWidth)))
    const rowStart = Math.max(1, Math.round(box.y / (DEFAULT_ROW_HEIGHT + DEFAULT_GAP)) + 1)
    const rowSpan = Math.max(1, Math.round(box.height / (DEFAULT_ROW_HEIGHT + DEFAULT_GAP)))

    const cell: GridCell = {
      id: uid(),
      mediaId: doc.id,
      url: doc.url,
      filename: doc.filename,
      alt: doc.alt || doc.filename,
      caption: doc.caption,
      objectFit: doc.objectFit,
      colStart,
      colSpan,
      rowStart,
      rowSpan,
      aspectRatio: 'auto',
      shape: 'rounded',
      ...box,
    }
    currentCells.push(cell)
  })

  const maxRow = currentCells.reduce((max, c) => Math.max(max, c.rowStart + c.rowSpan - 1), 1)
  const totalHeight = Math.max(
    ...currentCells.map((c) => (c.y ?? 0) + (c.height ?? DEFAULT_ROW_HEIGHT)),
    DEFAULT_ROW_HEIGHT,
  )

  return {
    ...ensured,
    version: 2,
    cells: currentCells,
    rows: maxRow,
    canvasWidth: CANVAS_WIDTH,
    totalHeight,
  }
}

/**
 * Removes empty tracks and shifts columns left if an entire column is vacated.
 */
export function compactTracks(
  cells: GridCell[],
  columns: number,
  columnTracks: number[],
): { cells: GridCell[]; columns: number; columnTracks: number[] } {
  if (cells.length === 0) {
    return { cells: [], columns: 1, columnTracks: [100] }
  }

  const usedCols = new Set<number>()
  cells.forEach((c) => {
    for (let col = c.colStart; col < c.colStart + c.colSpan; col++) {
      usedCols.add(col)
    }
  })

  let newColIndex = 1
  const colMapping: Record<number, number> = {}
  const remainingTracks: number[] = []

  for (let c = 1; c <= columns; c++) {
    if (usedCols.has(c)) {
      colMapping[c] = newColIndex
      remainingTracks.push(columnTracks[c - 1] ?? 100 / columns)
      newColIndex++
    }
  }

  if (remainingTracks.length === 0) {
    return { cells, columns: 1, columnTracks: [100] }
  }

  const updatedCells = cells.map((cell) => ({
    ...cell,
    colStart: colMapping[cell.colStart] || 1,
  }))

  const newColumns = remainingTracks.length
  const newTracks = normalizeTracks(remainingTracks)

  return {
    cells: updatedCells,
    columns: newColumns,
    columnTracks: newTracks,
  }
}

/**
 * Deduplicates overlapping cells.
 */
export function deduplicateCells(cells: GridCell[]): GridCell[] {
  const result: GridCell[] = []
  for (const cell of cells) {
    const collides = result.some((existing) => doCellsOverlap(cell, existing))
    if (!collides) {
      result.push(cell)
    }
  }
  return result
}

/**
 * Places a dragged cell relative to a target cell (left, right, top, bottom).
 */
export function placeCell(
  grid: VisualGridData,
  sourceCellId: string,
  targetCellId: string,
  position: 'left' | 'right' | 'top' | 'bottom',
): VisualGridData {
  if (sourceCellId === targetCellId) return grid

  const sourceCell = grid.cells.find((c) => c.id === sourceCellId)
  const targetCell = grid.cells.find((c) => c.id === targetCellId)
  if (!sourceCell || !targetCell) return grid

  const remainingCells = grid.cells.filter((c) => c.id !== sourceCell.id)

  let updatedCells: GridCell[] = []
  let newColumns = grid.columns
  let newTracks = [...grid.columnTracks]

  if (position === 'left') {
    const insertCol = targetCell.colStart

    if (grid.columns < 4) {
      newColumns = grid.columns + 1
      const splitIdx = targetCell.colStart - 1
      const oldTrack = grid.columnTracks[splitIdx] || 100 / grid.columns
      newTracks = [
        ...grid.columnTracks.slice(0, splitIdx),
        oldTrack / 2,
        oldTrack / 2,
        ...grid.columnTracks.slice(splitIdx + 1),
      ]
      newTracks = normalizeTracks(newTracks)

      updatedCells = remainingCells.map((c) => {
        if (c.colStart < insertCol && c.colStart + c.colSpan > insertCol) {
          return { ...c, colSpan: c.colSpan + 1 }
        }
        if (c.colStart >= insertCol) {
          return { ...c, colStart: c.colStart + 1 }
        }
        return c
      })

      updatedCells.push({
        ...sourceCell,
        colStart: insertCol,
        colSpan: 1,
        rowStart: targetCell.rowStart,
        rowSpan: targetCell.rowSpan,
      })
    } else {
      const desiredCol = targetCell.colStart - 1
      if (desiredCol >= 1 && isRegionFree(remainingCells, desiredCol, 1, targetCell.rowStart, targetCell.rowSpan)) {
        updatedCells = [...remainingCells]
        updatedCells.push({
          ...sourceCell,
          colStart: desiredCol,
          colSpan: 1,
          rowStart: targetCell.rowStart,
          rowSpan: targetCell.rowSpan,
        })
      } else {
        const targetSwapped = {
          ...targetCell,
          colStart: sourceCell.colStart,
          rowStart: sourceCell.rowStart,
        }
        const sourceSwapped = {
          ...sourceCell,
          colStart: targetCell.colStart,
          rowStart: targetCell.rowStart,
        }

        updatedCells = remainingCells.map((c) => (c.id === targetCell.id ? targetSwapped : c))
        updatedCells.push(sourceSwapped)

        const shiftedIds = new Set<string>([sourceCell.id, targetCell.id])
        updatedCells = cascadeDownReflow(updatedCells, shiftedIds, 1)
      }
    }
  } else if (position === 'right') {
    const insertCol = targetCell.colStart + targetCell.colSpan

    if (grid.columns < 4) {
      newColumns = grid.columns + 1
      const splitIdx = targetCell.colStart + targetCell.colSpan - 2
      const oldTrack = grid.columnTracks[splitIdx] || 100 / grid.columns
      newTracks = [
        ...grid.columnTracks.slice(0, splitIdx),
        oldTrack / 2,
        oldTrack / 2,
        ...grid.columnTracks.slice(splitIdx + 1),
      ]
      newTracks = normalizeTracks(newTracks)

      updatedCells = remainingCells.map((c) => {
        if (c.colStart < insertCol && c.colStart + c.colSpan > insertCol) {
          return { ...c, colSpan: c.colSpan + 1 }
        }
        if (c.colStart >= insertCol) {
          return { ...c, colStart: c.colStart + 1 }
        }
        return c
      })

      updatedCells.push({
        ...sourceCell,
        colStart: insertCol,
        colSpan: 1,
        rowStart: targetCell.rowStart,
        rowSpan: targetCell.rowSpan,
      })
    } else {
      const desiredCol = targetCell.colStart + targetCell.colSpan
      if (desiredCol <= 4 && isRegionFree(remainingCells, desiredCol, 1, targetCell.rowStart, targetCell.rowSpan)) {
        updatedCells = [...remainingCells]
        updatedCells.push({
          ...sourceCell,
          colStart: desiredCol,
          colSpan: 1,
          rowStart: targetCell.rowStart,
          rowSpan: targetCell.rowSpan,
        })
      } else {
        const targetSwapped = {
          ...targetCell,
          colStart: sourceCell.colStart,
          rowStart: sourceCell.rowStart,
        }
        const sourceSwapped = {
          ...sourceCell,
          colStart: targetCell.colStart,
          rowStart: targetCell.rowStart,
        }

        updatedCells = remainingCells.map((c) => (c.id === targetCell.id ? targetSwapped : c))
        updatedCells.push(sourceSwapped)

        const shiftedIds = new Set<string>([sourceCell.id, targetCell.id])
        updatedCells = cascadeDownReflow(updatedCells, shiftedIds, 1)
      }
    }
  } else if (position === 'bottom') {
    const stackRow = targetCell.rowStart + targetCell.rowSpan
    const shiftedIds = new Set<string>()

    updatedCells = remainingCells.map((c) => {
      const hasColOverlap =
        c.colStart < targetCell.colStart + targetCell.colSpan &&
        c.colStart + c.colSpan > targetCell.colStart

      if (hasColOverlap && c.rowStart >= stackRow) {
        shiftedIds.add(c.id)
        return {
          ...c,
          rowStart: c.rowStart + 1,
        }
      }
      return c
    })

    if (shiftedIds.size > 0) {
      updatedCells = cascadeDownReflow(updatedCells, shiftedIds, 1)
    }

    updatedCells = updatedCells.map((c) => {
      if (
        c.id !== targetCell.id &&
        c.rowStart === targetCell.rowStart &&
        c.rowSpan === 1 &&
        isRegionFree(updatedCells, c.colStart, c.colSpan, stackRow, 1, [c.id])
      ) {
        return { ...c, rowSpan: 2 }
      }
      return c
    })

    updatedCells.push({
      ...sourceCell,
      colStart: targetCell.colStart,
      colSpan: targetCell.colSpan,
      rowStart: stackRow,
      rowSpan: 1,
    })
  } else if (position === 'top') {
    const targetRow = targetCell.rowStart
    const shiftedIds = new Set<string>()

    updatedCells = remainingCells.map((c) => {
      const hasColOverlap =
        c.colStart < targetCell.colStart + targetCell.colSpan &&
        c.colStart + c.colSpan > targetCell.colStart

      if (hasColOverlap && c.rowStart >= targetRow) {
        shiftedIds.add(c.id)
        return {
          ...c,
          rowStart: c.rowStart + 1,
        }
      }
      return c
    })

    if (shiftedIds.size > 0) {
      updatedCells = cascadeDownReflow(updatedCells, shiftedIds, 1)
    }

    updatedCells = updatedCells.map((c) => {
      if (
        c.id !== targetCell.id &&
        c.rowStart === targetRow &&
        c.rowSpan === 1 &&
        isRegionFree(updatedCells, c.colStart, c.colSpan, targetRow + 1, 1, [c.id])
      ) {
        return { ...c, rowSpan: 2 }
      }
      return c
    })

    updatedCells.push({
      ...sourceCell,
      colStart: targetCell.colStart,
      colSpan: targetCell.colSpan,
      rowStart: targetRow,
      rowSpan: 1,
    })
  }

  const compacted = compactTracks(updatedCells, newColumns, newTracks)
  const maxRow = compacted.cells.reduce((max, c) => Math.max(max, c.rowStart + c.rowSpan - 1), 1)

  const syncedCells = compacted.cells.map((cell) => {
    const box = computeCellBoxFromGrid(cell, compacted.columns, compacted.columnTracks)
    return {
      ...cell,
      ...box,
    }
  })

  const totalHeight = Math.max(
    ...syncedCells.map((c) => (c.y ?? 0) + (c.height ?? DEFAULT_ROW_HEIGHT)),
    DEFAULT_ROW_HEIGHT,
  )

  return {
    version: 2,
    cells: syncedCells,
    columns: compacted.columns,
    columnTracks: compacted.columnTracks,
    rows: maxRow,
    caption: grid.caption,
    canvasWidth: CANVAS_WIDTH,
    totalHeight,
  }
}

/**
 * Migrates legacy rows/columns data format to VisualGridData.
 */
export function migrateFromLegacyRows(legacyData: any, defaultCaption = ''): VisualGridData {
  if (legacyData?.cells && Array.isArray(legacyData.cells)) {
    const columns = legacyData.columns || 1
    const tracks = legacyData.columnTracks?.length
      ? normalizeTracks(legacyData.columnTracks)
      : normalizeTracks(Array(columns).fill(100 / columns))
    const maxRow = legacyData.cells.reduce(
      (max: number, c: GridCell) => Math.max(max, (c.rowStart || 1) + (c.rowSpan || 1) - 1),
      1,
    )
    const migratedGrid: VisualGridData = {
      version: legacyData.version || 2,
      cells: legacyData.cells,
      columns,
      columnTracks: tracks,
      rows: maxRow,
      caption: legacyData.caption ?? defaultCaption,
      canvasWidth: legacyData.canvasWidth || CANVAS_WIDTH,
      totalHeight: legacyData.totalHeight,
    }
    return ensureDesignCoordinates(migratedGrid)
  }

  if (legacyData?.rows && Array.isArray(legacyData.rows)) {
    const cells: GridCell[] = []
    let maxCols = 1
    let nextRowStart = 1

    legacyData.rows.forEach((legacyRow: any) => {
      const columns = Array.isArray(legacyRow.columns) ? legacyRow.columns : []
      maxCols = Math.max(maxCols, columns.length)
      let rowHeight = 1

      columns.forEach((column: any, columnIndex: number) => {
        const items = Array.isArray(column.items) ? column.items : []
        rowHeight = Math.max(rowHeight, items.length)
        items.forEach((item: any, itemIndex: number) => {
          cells.push({
            id: item.id || uid(),
            mediaId: item.mediaId || '',
            url: item.url || '',
            filename: item.filename || '',
            alt: item.alt,
            caption: item.caption,
            colStart: columnIndex + 1,
            colSpan: 1,
            rowStart: nextRowStart + itemIndex,
            rowSpan: 1,
            aspectRatio: item.aspectRatio || 'auto',
            objectFit: item.objectFit,
            shape: item.shape || 'rounded',
          })
        })
      })
      nextRowStart += rowHeight
    })

    const initialGrid: VisualGridData = {
      cells,
      columns: maxCols,
      columnTracks: normalizeTracks(Array(maxCols).fill(100 / maxCols)),
      rows: cells.reduce((max, cell) => Math.max(max, cell.rowStart + cell.rowSpan - 1), 1),
      caption: legacyData.caption ?? defaultCaption,
    }
    return ensureDesignCoordinates(initialGrid)
  }

  return {
    version: 2,
    cells: [],
    columns: 1,
    columnTracks: [100],
    rows: 1,
    caption: defaultCaption,
    canvasWidth: CANVAS_WIDTH,
    totalHeight: DEFAULT_ROW_HEIGHT,
  }
}

/**
 * Creates a canonical, intentionally-empty modern grid.
 */
export function createEmptyGrid(caption = ''): VisualGridData {
  return {
    version: 2,
    cells: [],
    columns: 1,
    columnTracks: [100],
    rows: 1,
    caption,
    canvasWidth: CANVAS_WIDTH,
    totalHeight: DEFAULT_ROW_HEIGHT,
  }
}

export type VisualLayoutSource = 'modern' | 'legacy-layout' | 'legacy-images' | 'empty'

export type HydratedVisualLayout = {
  grid: VisualGridData
  source: VisualLayoutSource
  /**
   * True when the block contains an explicit layout (`layoutData`). An authoritative
   * layout - even an empty one - must always win over the legacy `images` array.
   * This is what prevents deleted legacy images from being resurrected.
   */
  hasAuthoritativeLayout: boolean
}

type LegacyMediaLike = {
  id?: string
  url?: string
  filename?: string
  alt?: string
  caption?: string
}

type ResolvedLegacyMedia = LegacyMediaLike & { id: string; url: string }

function findMediaDoc(reference: unknown, mediaItems: unknown[] = []): LegacyMediaLike | null {
  if (!reference) return null
  if (typeof reference === 'object') {
    return reference as LegacyMediaLike
  }
  const match = mediaItems.find((item) => {
    if (typeof item === 'object' && item !== null) {
      return (item as LegacyMediaLike).id === reference
    }
    return item === reference
  })
  return match && typeof match === 'object' ? (match as LegacyMediaLike) : null
}

/**
 * Resolves a single legacy `images` array entry into a media descriptor.
 * Supports populated upload docs, bare relationship IDs and raw URL entries.
 */
export function resolveLegacyImageDoc(
  entry: any,
  mediaItems: unknown[] = [],
): ResolvedLegacyMedia | null {
  if (!entry) return null

  let doc = findMediaDoc(entry.image, mediaItems)
  if (!doc && entry.image && typeof entry.image !== 'object') {
    doc = { id: String(entry.image) }
  }
  if (!doc && entry.url) {
    doc = { id: entry.id || entry.url, url: entry.url }
  }
  if (!doc) return null

  const id = doc.id || (entry.id ? String(entry.id) : undefined)
  const url = doc.url || entry.url
  if (!id && !url) return null

  return {
    id: id || String(url),
    url: url || '',
    filename: doc.filename || entry.filename,
    alt: entry.altText ?? doc.alt,
    caption: entry.caption ?? doc.caption,
  }
}

/**
 * Builds modern grid cells from the legacy `images` array.
 * Cells without a resolvable URL are still returned (the editor fills them in later).
 */
export function buildLegacyImageCells(
  images: any[] | undefined,
  mediaItems: unknown[] = [],
): GridCell[] {
  if (!Array.isArray(images) || images.length === 0) return []

  const columns = Math.max(1, Math.min(2, images.length))
  const cells: GridCell[] = []

  images.forEach((entry, index) => {
    const doc = resolveLegacyImageDoc(entry, mediaItems)
    if (!doc) return
    cells.push({
      id: `legacy-${index}`,
      mediaId: doc.id,
      url: doc.url,
      filename: doc.filename || `legacy-${index}.jpg`,
      alt: doc.alt,
      caption: doc.caption,
      colStart: (index % columns) + 1,
      colSpan: 1,
      rowStart: Math.floor(index / columns) + 1,
      rowSpan: 1,
      aspectRatio: 'auto',
      shape: 'rounded',
    })
  })

  return cells
}

/**
 * Single source of truth for interpreting stored visual media layout data.
 *
 * Precedence:
 * 1. `layoutData.cells` (modern) - authoritative even when empty.
 * 2. `layoutData.rows` (legacy layout) - authoritative.
 * 3. Legacy `images` array - only when no explicit layout exists.
 * 4. Empty grid.
 */
export function hydrateVisualLayout(input: {
  layoutData?: any
  images?: any[]
  mediaItems?: unknown[]
  caption?: string
}): HydratedVisualLayout {
  const { layoutData, images, mediaItems, caption = '' } = input

  const hasCells = Boolean(layoutData) && Array.isArray(layoutData?.cells)
  const hasRows = Boolean(layoutData) && Array.isArray(layoutData?.rows)

  if (hasCells || hasRows) {
    const migrated = migrateFromLegacyRows(layoutData, caption)
    const grid = ensureDesignCoordinates({
      ...migrated,
      caption: layoutData?.caption ?? caption,
    })

    return {
      grid,
      source: hasRows ? 'legacy-layout' : grid.cells.length > 0 ? 'modern' : 'empty',
      hasAuthoritativeLayout: true,
    }
  }

  const legacyCells = buildLegacyImageCells(images, mediaItems)
  if (legacyCells.length > 0) {
    const columns = Math.max(1, Math.min(2, images?.length ?? legacyCells.length))
    const grid = ensureDesignCoordinates({
      version: 2,
      cells: legacyCells,
      columns,
      columnTracks: Array(columns).fill(100 / columns),
      rows: Math.max(1, Math.ceil(legacyCells.length / columns)),
      caption,
      canvasWidth: CANVAS_WIDTH,
    })

    return {
      grid,
      source: 'legacy-images',
      hasAuthoritativeLayout: false,
    }
  }

  return {
    grid: createEmptyGrid(caption),
    source: 'empty',
    hasAuthoritativeLayout: false,
  }
}
