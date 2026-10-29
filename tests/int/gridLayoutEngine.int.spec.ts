import { describe, it, expect } from 'vitest'
import {
  type GridCell,
  type VisualGridData,
  isCellOccupied,
  doCellsOverlap,
  doBoxesOverlap,
  findNextFreePosition,
  insertMediaDocs,
  placeCell,
  normalizeTracks,
  getGridTemplateColumnsCss,
  compactTracks,
  migrateFromLegacyRows,
  resizeCellSpan,
  resizeCellBox,
  moveCellTo,
  moveCellBox,
  reflowAroundPinnedCell,
  reflowAroundPinnedBox,
  ensureDesignCoordinates,
  CANVAS_WIDTH,
  DEFAULT_ROW_HEIGHT,
  DEFAULT_GAP,
} from '../../src/components/lexical/gridLayoutEngine'

function makeCell(id: string, col: number, row: number, colSpan = 1, rowSpan = 1): GridCell {
  return {
    id,
    mediaId: id,
    url: `/${id}.jpg`,
    filename: `${id}.jpg`,
    colStart: col,
    colSpan,
    rowStart: row,
    rowSpan,
  }
}

describe('gridLayoutEngine - Occupancy & Overlap', () => {
  it('detects occupied coordinates correctly', () => {
    const cells = [makeCell('A', 1, 1), makeCell('B', 2, 1)]
    expect(isCellOccupied(cells, 1, 1)).toBe(true)
    expect(isCellOccupied(cells, 2, 1)).toBe(true)
    expect(isCellOccupied(cells, 1, 2)).toBe(false)
    expect(isCellOccupied(cells, 3, 1)).toBe(false)
  })

  it('detects multi-row and multi-column span occupancy', () => {
    const cells = [makeCell('A', 1, 1, 2, 2)] // Spans col 1..2, row 1..2
    expect(isCellOccupied(cells, 1, 1)).toBe(true)
    expect(isCellOccupied(cells, 2, 1)).toBe(true)
    expect(isCellOccupied(cells, 1, 2)).toBe(true)
    expect(isCellOccupied(cells, 2, 2)).toBe(true)
    expect(isCellOccupied(cells, 3, 2)).toBe(false)
  })

  it('detects cell overlap in 2D space', () => {
    const a = makeCell('A', 1, 1, 2, 1) // col 1,2, row 1
    const b = makeCell('B', 2, 1, 1, 1) // col 2, row 1
    const c = makeCell('C', 1, 2, 1, 1) // col 1, row 2
    expect(doCellsOverlap(a, b)).toBe(true)
    expect(doCellsOverlap(a, c)).toBe(false)
  })

  it('detects continuous 2D design coordinate box overlap', () => {
    const a = { x: 0, y: 0, width: 389, height: 280 }
    const b = { x: 300, y: 100, width: 389, height: 280 } // overlaps a
    const c = { x: 405, y: 0, width: 389, height: 280 } // adjacent with gap 16
    expect(doBoxesOverlap(a, b)).toBe(true)
    expect(doBoxesOverlap(a, c, 16)).toBe(false)
  })
})

describe('gridLayoutEngine - Multi-Image Insertion', () => {
  it('inserts multiple images into empty grid creating up to 3 columns', () => {
    const emptyGrid: VisualGridData = {
      cells: [],
      columns: 1,
      columnTracks: [100],
      rows: 1,
    }
    const docs = [
      { id: '1', url: '/1.jpg', filename: '1.jpg' },
      { id: '2', url: '/2.jpg', filename: '2.jpg' },
      { id: '3', url: '/3.jpg', filename: '3.jpg' },
    ]

    const result = insertMediaDocs(emptyGrid, docs)
    expect(result.cells).toHaveLength(3)
    expect(result.columns).toBe(3)
    expect(result.columnTracks).toHaveLength(3)
    expect(result.cells.map((c) => c.mediaId)).toEqual(['1', '2', '3'])

    expect(result.cells[0]).toMatchObject({ colStart: 1, rowStart: 1 })
    expect(result.cells[1]).toMatchObject({ colStart: 2, rowStart: 1 })
    expect(result.cells[2]).toMatchObject({ colStart: 3, rowStart: 1 })

    // Also sets design coordinates
    expect(result.cells[0].x).toBeDefined()
    expect(result.cells[0].width).toBeGreaterThan(0)
    expect(result.cells[0].height).toBeGreaterThan(0)
  })

  it('appends ALL selected images to an existing grid without data loss', () => {
    const initialGrid: VisualGridData = {
      cells: [makeCell('A', 1, 1), makeCell('B', 2, 1)],
      columns: 2,
      columnTracks: [50, 50],
      rows: 1,
    }

    const docsToAdd = [
      { id: 'C', url: '/c.jpg', filename: 'c.jpg' },
      { id: 'D', url: '/d.jpg', filename: 'd.jpg' },
      { id: 'E', url: '/e.jpg', filename: 'e.jpg' },
    ]

    const result = insertMediaDocs(initialGrid, docsToAdd)
    expect(result.cells).toHaveLength(5)
    expect(result.cells.map((c) => c.mediaId)).toEqual(['A', 'B', 'C', 'D', 'E'])

    const coordKeys = result.cells.map((c) => `${c.colStart},${c.rowStart}`)
    expect(new Set(coordKeys).size).toBe(5)
  })

  it('regression: widen A to 500 design units, then insert another image. No rectangles may overlap', () => {
    // Initial cell A widened to 500 design units
    const cellA: GridCell = {
      id: 'A',
      mediaId: 'A',
      url: '/a.jpg',
      filename: 'a.jpg',
      colStart: 1,
      colSpan: 1,
      rowStart: 1,
      rowSpan: 1,
      x: 0,
      y: 0,
      width: 500,
      height: 280,
    }

    const grid: VisualGridData = {
      cells: [cellA],
      columns: 3,
      columnTracks: [33.3, 33.3, 33.4],
      rows: 1,
      canvasWidth: CANVAS_WIDTH,
      totalHeight: 280,
    }

    const docB = { id: 'B', url: '/b.jpg', filename: 'b.jpg' }
    const result = insertMediaDocs(grid, [docB])

    expect(result.cells).toHaveLength(2)
    const resultingA = result.cells.find((c) => c.id === 'A')!
    const resultingB = result.cells.find((c) => c.mediaId === 'B')!

    // Invariant: cell A's dimensions and positions are 100% preserved
    expect(resultingA.x).toBe(0)
    expect(resultingA.y).toBe(0)
    expect(resultingA.width).toBe(500)
    expect(resultingA.height).toBe(280)

    // Invariant: No rectangles may overlap
    const overlaps = doBoxesOverlap(
      resultingA as { x: number; y: number; width: number; height: number },
      resultingB as { x: number; y: number; width: number; height: number },
      1,
    )
    expect(overlaps).toBe(false)
  })
})

describe('gridLayoutEngine - Core Resize & Reflow Invariants', () => {
  it('expanding colliding cell reflows neighbor downward rather than rejecting', () => {
    // A at (1,1) and B at (1,2) directly below A
    const grid: VisualGridData = {
      cells: [
        makeCell('A', 1, 1, 1, 1),
        makeCell('B', 1, 2, 1, 1),
      ],
      columns: 1,
      columnTracks: [100],
      rows: 2,
    }

    // Expanding A to rowSpan 2 must NOT be rejected; B must reflow to row 3!
    const result = resizeCellSpan(grid, 'A', undefined, 2)
    const cellA = result.cells.find((c) => c.id === 'A')!
    const cellB = result.cells.find((c) => c.id === 'B')!

    expect(cellA.rowSpan).toBe(2)
    expect(cellA.rowStart).toBe(1)
    expect(cellB.rowStart).toBe(3) // Reflowed!
    expect(cellB.rowSpan).toBe(1) // Neighbor did not resize!
    expect(result.rows).toBe(3)
  })

  it('moveCellTo places cell and reflows blockers', () => {
    const grid: VisualGridData = {
      cells: [
        makeCell('A', 1, 1, 1, 1),
        makeCell('B', 2, 1, 1, 1),
      ],
      columns: 2,
      columnTracks: [50, 50],
      rows: 1,
    }

    // Move A to (2, 1) where B currently is
    const result = moveCellTo(grid, 'A', 2, 1)
    const cellA = result.cells.find((c) => c.id === 'A')!
    const cellB = result.cells.find((c) => c.id === 'B')!

    expect(cellA).toMatchObject({ colStart: 2, rowStart: 1 })
    expect(cellB.rowStart).toBeGreaterThan(1) // B pushed down!
    expect(cellB.colStart).toBe(2)
  })
})

describe('gridLayoutEngine - Complete Independent Geometry Model (Version 2)', () => {
  it('Action 1: Expands D across the full second row while preserving height & neighbors', () => {
    // 3-column grid with A, B, C on row 1, D on row 2
    const initialGrid = ensureDesignCoordinates({
      cells: [
        makeCell('A', 1, 1),
        makeCell('B', 2, 1),
        makeCell('C', 3, 1),
        makeCell('D', 1, 2),
      ],
      columns: 3,
      columnTracks: [33.3, 33.3, 33.4],
      rows: 2,
    })

    const initialHeightD = initialGrid.cells.find((c) => c.id === 'D')!.height!
    const initialBoxA = { ...initialGrid.cells.find((c) => c.id === 'A')! }
    const initialBoxB = { ...initialGrid.cells.find((c) => c.id === 'B')! }
    const initialBoxC = { ...initialGrid.cells.find((c) => c.id === 'C')! }

    // User drags D's East handle: expand width to full CANVAS_WIDTH (1200)
    const result = resizeCellBox(initialGrid, 'D', { width: CANVAS_WIDTH })
    const cellD = result.cells.find((c) => c.id === 'D')!
    const cellA = result.cells.find((c) => c.id === 'A')!
    const cellB = result.cells.find((c) => c.id === 'B')!
    const cellC = result.cells.find((c) => c.id === 'C')!

    // Invariant 1: D now spans full width
    expect(cellD.x).toBe(0)
    expect(cellD.width).toBe(CANVAS_WIDTH)

    // Invariant 2: Horizontal resize keeps D's height unchanged!
    expect(cellD.height).toBe(initialHeightD)

    // Invariant 3: Neighbors A, B, C width and height are completely unchanged!
    expect(cellA.width).toBe(initialBoxA.width)
    expect(cellA.height).toBe(initialBoxA.height)
    expect(cellB.width).toBe(initialBoxB.width)
    expect(cellB.height).toBe(initialBoxB.height)
    expect(cellC.width).toBe(initialBoxC.width)
    expect(cellC.height).toBe(initialBoxC.height)
  })

  it('Action 2: Expands A across two columns; repositions B rather than refusing or resizing B', () => {
    const initialGrid = ensureDesignCoordinates({
      cells: [
        makeCell('A', 1, 1),
        makeCell('B', 2, 1),
        makeCell('C', 3, 1),
        makeCell('D', 1, 2),
      ],
      columns: 3,
      columnTracks: [33.3, 33.3, 33.4],
      rows: 2,
    })

    const initialWidthB = initialGrid.cells.find((c) => c.id === 'B')!.width!
    const initialHeightB = initialGrid.cells.find((c) => c.id === 'B')!.height!

    // Expand A width to 795 (covering col 1 and col 2)
    const result = resizeCellBox(initialGrid, 'A', { width: 795 })
    const cellA = result.cells.find((c) => c.id === 'A')!
    const cellB = result.cells.find((c) => c.id === 'B')!

    expect(cellA.width).toBe(795)

    // Neighbor B was reflowed down past A
    expect(cellB.y).toBeGreaterThanOrEqual(cellA.y! + cellA.height!)

    // CRITICAL REQUIREMENT: Neighbor B DID NOT RESIZE!
    expect(cellB.width).toBe(initialWidthB)
    expect(cellB.height).toBe(initialHeightB)
  })

  it('Action 3: Drags C into blank second-row space with zero collisions', () => {
    // A (covers cols 1-2 on row 1), D (covers col 1 on row 2), C (was at col 3 on row 1)
    const grid = ensureDesignCoordinates({
      cells: [
        makeCell('A', 1, 1, 2, 1),
        makeCell('C', 3, 1, 1, 1),
        makeCell('D', 1, 2, 1, 1),
      ],
      columns: 3,
      columnTracks: [33.3, 33.3, 33.4],
      rows: 2,
    })

    const widthC = grid.cells.find((c) => c.id === 'C')!.width!
    const heightC = grid.cells.find((c) => c.id === 'C')!.height!

    // Drag C into blank second-row position (x = 811, y = 296)
    const result = moveCellBox(grid, 'C', { x: 811, y: 296 })
    const cellC = result.cells.find((c) => c.id === 'C')!

    expect(cellC.x).toBeGreaterThanOrEqual(800)
    expect(cellC.y).toBe(296)
    expect(cellC.width).toBe(widthC)
    expect(cellC.height).toBe(heightC)

    // Verify zero overlaps
    for (let i = 0; i < result.cells.length; i++) {
      for (let j = i + 1; j < result.cells.length; j++) {
        expect(doBoxesOverlap(result.cells[i] as any, result.cells[j] as any, 2)).toBe(false)
      }
    }
  })

  it('Action 4: Horizontal resizing preserves height; vertical resizing preserves width', () => {
    const grid = ensureDesignCoordinates({
      cells: [makeCell('A', 1, 1)],
      columns: 1,
      columnTracks: [100],
      rows: 1,
    })

    const initial = grid.cells[0]
    const initialW = initial.width!
    const initialH = initial.height!

    // 1. Horizontal resize: width changes, height MUST BE 100% PRESERVED
    const resizedH = resizeCellBox(grid, 'A', { width: 500 })
    expect(resizedH.cells[0].width).toBe(500)
    expect(resizedH.cells[0].height).toBe(initialH) // Exact!

    // 2. Vertical resize: height changes, width MUST BE 100% PRESERVED
    const resizedV = resizeCellBox(grid, 'A', { height: 450 })
    expect(resizedV.cells[0].height).toBe(450)
    expect(resizedV.cells[0].width).toBe(initialW) // Exact!
  })
})

describe('gridLayoutEngine - Required Regression Checks', () => {
  it('Regression 1: Legacy row 1: [A,B] | [C]; row 2: [D] | [E] -> Both D and E must start at row 3', () => {
    const legacy = {
      rows: [
        {
          columns: [
            { items: [{ id: 'A', url: '/a.jpg' }, { id: 'B', url: '/b.jpg' }] },
            { items: [{ id: 'C', url: '/c.jpg' }] },
          ],
        },
        {
          columns: [
            { items: [{ id: 'D', url: '/d.jpg' }] },
            { items: [{ id: 'E', url: '/e.jpg' }] },
          ],
        },
      ],
    }

    const migrated = migrateFromLegacyRows(legacy)
    const cellA = migrated.cells.find((c) => c.id === 'A')!
    const cellB = migrated.cells.find((c) => c.id === 'B')!
    const cellC = migrated.cells.find((c) => c.id === 'C')!
    const cellD = migrated.cells.find((c) => c.id === 'D')!
    const cellE = migrated.cells.find((c) => c.id === 'E')!

    expect(cellA).toMatchObject({ colStart: 1, rowStart: 1 })
    expect(cellB).toMatchObject({ colStart: 1, rowStart: 2 })
    expect(cellC).toMatchObject({ colStart: 2, rowStart: 1 })
    expect(cellD).toMatchObject({ colStart: 1, rowStart: 3 })
    expect(cellE).toMatchObject({ colStart: 2, rowStart: 3 })
  })

  it('Regression 6: Right insertion beside a two-column target with tracks [20,30,50] splits the last target track', () => {
    const grid: VisualGridData = {
      cells: [
        makeCell('Target', 1, 1, 2, 1),
        makeCell('C', 3, 1, 1, 1),
        makeCell('Source', 1, 2, 1, 1),
      ],
      columns: 3,
      columnTracks: [20, 30, 50],
      rows: 2,
    }

    const result = placeCell(grid, 'Source', 'Target', 'right')
    expect(result.columns).toBe(4)
    expect(result.columnTracks).toEqual([20, 15, 15, 50])
  })

  it('Regression 5: Track insertion through a span preserves coverage', () => {
    const grid: VisualGridData = {
      cells: [
        makeCell('Wide', 1, 1, 3, 1),
        makeCell('B', 2, 2, 1, 1),
        makeCell('Source', 1, 3, 1, 1),
      ],
      columns: 3,
      columnTracks: [33.3, 33.3, 33.4],
      rows: 3,
    }

    const result = placeCell(grid, 'Source', 'B', 'left')
    const wideCell = result.cells.find((c) => c.id === 'Wide')!
    expect(wideCell.colSpan).toBe(4)
    expect(result.columns).toBe(4)
  })

  it('Regression 4: Wide-cell reflow cascades downward across neighboring columns', () => {
    const grid: VisualGridData = {
      cells: [
        makeCell('A', 1, 1, 1, 1),
        makeCell('B', 2, 1, 1, 1),
        makeCell('Wide', 1, 2, 2, 1),
        makeCell('C', 1, 3, 1, 1),
        makeCell('D', 2, 3, 1, 1),
        makeCell('Source', 1, 4, 1, 1),
      ],
      columns: 2,
      columnTracks: [50, 50],
      rows: 4,
    }

    const result = placeCell(grid, 'Source', 'A', 'bottom')
    const sourceCell = result.cells.find((c) => c.id === 'Source')!
    const wideCell = result.cells.find((c) => c.id === 'Wide')!
    const cellC = result.cells.find((c) => c.id === 'C')!
    const cellD = result.cells.find((c) => c.id === 'D')!

    expect(sourceCell).toMatchObject({ colStart: 1, rowStart: 2 })
    expect(wideCell).toMatchObject({ colStart: 1, rowStart: 3, colSpan: 2 })
    expect(cellC.rowStart).toBeGreaterThanOrEqual(4)
    expect(cellD.rowStart).toBeGreaterThanOrEqual(4)

    for (let i = 0; i < result.cells.length; i++) {
      for (let j = i + 1; j < result.cells.length; j++) {
        expect(doCellsOverlap(result.cells[i], result.cells[j])).toBe(false)
      }
    }
  })

  it('Regression 7: Zero-valued track normalization totals 100 after rounding', () => {
    const zeros = [0, 0, 0, 0]
    const normalized = normalizeTracks(zeros)
    expect(normalized).toEqual([25, 25, 25, 25])
    expect(normalized.reduce((a, b) => a + b, 0)).toBe(100)
  })

  it('Regression 2: Four-column cross-row drops preserve every image and valid nonoverlapping rectangles', () => {
    const fourColGrid: VisualGridData = {
      cells: [
        makeCell('A', 1, 1),
        makeCell('B', 2, 1),
        makeCell('C', 3, 1),
        makeCell('D', 4, 1),
        makeCell('E', 1, 2),
      ],
      columns: 4,
      columnTracks: [25, 25, 25, 25],
      rows: 2,
    }

    const result = placeCell(fourColGrid, 'E', 'D', 'left')
    expect(result.cells).toHaveLength(5)
    expect(result.columns).toBeLessThanOrEqual(4)

    for (let i = 0; i < result.cells.length; i++) {
      for (let j = i + 1; j < result.cells.length; j++) {
        expect(doCellsOverlap(result.cells[i], result.cells[j])).toBe(false)
      }
    }
  })
})
