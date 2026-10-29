import { test, expect, Page } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'
import { CANVAS_WIDTH, DEFAULT_ROW_HEIGHT, DEFAULT_GAP, doBoxesOverlap } from '../../src/components/lexical/gridLayoutEngine'

const TEST_ARTICLE_BASE = 'e2e-vml-complete'

test.describe('Visual Media Layout - Complete Specification Test Suite', () => {
  let authorId: string
  let mediaDocs: any[] = []

  test.beforeAll(async () => {
    test.setTimeout(120000)
    await seedTestUser()

    const payload = await getPayload({ config: await config })
    const userResult = await payload.find({ collection: 'users', limit: 1 })
    authorId = userResult.docs[0]?.id

    const mediaResult = await payload.find({ collection: 'media', limit: 6 })
    mediaDocs = mediaResult.docs
    if (mediaDocs.length < 4) {
      throw new Error('Need at least 4 media items in database')
    }
  })

  test.beforeEach(async () => {
    test.setTimeout(90000)
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  // --------------------------------------------------------------------------
  // TEST 1: Short-Canvas Parity (600px canvas with 1200x280 -> 140px height)
  // --------------------------------------------------------------------------
  test('1. Short-canvas editor/public geometry parity: 600px wide with 1200x280 image renders at 140px height', async ({ page }) => {
    const slug = `${TEST_ARTICLE_BASE}-parity`
    const payload = await getPayload({ config: await config })

    await payload.delete({ collection: 'articles', where: { slug: { equals: slug } } })

    const article = await payload.create({
      collection: 'articles',
      data: {
        title: 'Geometry Parity Article',
        slug,
        excerpt: 'Geometry parity test excerpt',
        heroImage: mediaDocs[0].id,
        author: authorId,
        publishedDate: new Date().toISOString(),
        _status: 'published',
        content: {
          root: {
            type: 'root',
            format: '' as any,
            indent: 0,
            version: 1,
            direction: 'ltr' as const,
            children: [
              {
                type: 'block',
                format: '',
                version: 2,
                fields: {
                  blockType: 'visualMediaLayout',
                  blockName: 'Parity Layout',
                  layoutData: {
                    version: 2,
                    cells: [
                      {
                        id: 'cell-p',
                        mediaId: mediaDocs[0].id,
                        url: mediaDocs[0].url,
                        filename: mediaDocs[0].filename,
                        colStart: 1,
                        colSpan: 1,
                        rowStart: 1,
                        rowSpan: 1,
                        x: 0,
                        y: 0,
                        width: 1200,
                        height: 280,
                        aspectRatio: 'auto',
                        shape: 'rounded',
                      },
                    ],
                    columns: 1,
                    columnTracks: [100],
                    rows: 1,
                    canvasWidth: 1200,
                    totalHeight: 280,
                  },
                  mediaItems: [mediaDocs[0].id],
                  caption: '',
                },
              },
            ],
          },
        },
      },
    })

    // Check Public Page with fixed 600px width container
    await page.setViewportSize({ width: 800, height: 700 })
    await page.goto(`http://localhost:3000/articles/${slug}`)
    await page.waitForLoadState('networkidle')

    // Find public stage
    const publicStage = page.locator('.vml-public-stage')
    await expect(publicStage).toBeVisible()

    // Force stage width to 600px to verify aspect ratio scaling
    await publicStage.evaluate((el) => {
      el.style.width = '600px'
      el.style.maxWidth = '600px'
    })
    const publicBox = await publicStage.boundingBox()
    expect(publicBox).toBeTruthy()
    // 600 * (280 / 1200) = 140px (allow 1.5px subpixel tolerance)
    expect(Math.abs(publicBox!.height - 140)).toBeLessThanOrEqual(2)

    // Check Editor with 600px wide stage
    await login({ page, user: testUser })
    await page.goto(`http://localhost:3000/admin/collections/articles/${article.id}`)
    await page.waitForLoadState('networkidle')

    const editorStage = page.locator('.vml-canvas-stage')
    await expect(editorStage).toBeVisible()

    await editorStage.evaluate((el) => {
      el.style.width = '600px'
      el.style.maxWidth = '600px'
    })
    const editorBox = await editorStage.boundingBox()
    expect(editorBox).toBeTruthy()
    // Editor stage must also render at 140px, NOT 200px (minHeight: '200px' removed!)
    expect(Math.abs(editorBox!.height - 140)).toBeLessThanOrEqual(2)
  })

  // --------------------------------------------------------------------------
  // TEST 2: Legacy Fallback Rendering (distinct, non-overlapping rectangles)
  // --------------------------------------------------------------------------
  test('2. Legacy fallback rendering: legacy images array creates distinct, non-overlapping rectangles', async ({ page }) => {
    const slug = `${TEST_ARTICLE_BASE}-legacy`
    const payload = await getPayload({ config: await config })

    await payload.delete({ collection: 'articles', where: { slug: { equals: slug } } })

    await payload.create({
      collection: 'articles',
      data: {
        title: 'Legacy Fallback Article',
        slug,
        excerpt: 'Legacy fallback test excerpt',
        heroImage: mediaDocs[0].id,
        author: authorId,
        publishedDate: new Date().toISOString(),
        _status: 'published',
        content: {
          root: {
            type: 'root',
            format: '' as any,
            indent: 0,
            version: 1,
            direction: 'ltr' as const,
            children: [
              {
                type: 'block',
                format: '',
                version: 2,
                fields: {
                  blockType: 'visualMediaLayout',
                  blockName: 'Legacy Block',
                  // No layoutData provided — legacy fallback images
                  images: [
                    { image: mediaDocs[0].id, altText: 'Legacy 1' },
                    { image: mediaDocs[1].id, altText: 'Legacy 2' },
                  ],
                },
              },
            ],
          },
        },
      },
    })

    await page.goto(`http://localhost:3000/articles/${slug}`)
    await page.waitForLoadState('networkidle')

    const stage = page.locator('.vml-public-stage')
    await expect(stage).toBeVisible()

    const cells = stage.locator('.vml-public-cell')
    await expect(cells).toHaveCount(2)

    const box1 = (await cells.nth(0).boundingBox())!
    const box2 = (await cells.nth(1).boundingBox())!

    // Verify boxes are distinct and do NOT overlap (side-by-side in 2 columns)
    expect(box1).toBeTruthy()
    expect(box2).toBeTruthy()
    expect(box1.x).not.toEqual(box2.x)

    const overlaps = doBoxesOverlap(
      { x: box1.x, y: box1.y, width: box1.width, height: box1.height },
      { x: box2.x, y: box2.y, width: box2.width, height: box2.height },
      1,
    )
    expect(overlaps).toBe(false)
  })

  // --------------------------------------------------------------------------
  // TEST 3: All 8 Handles, Fixed Opposite Edges & Full-Row Expansion of D
  // --------------------------------------------------------------------------
  test('3. Eight handles, fixed opposite edges, full row expansion of D, and neighbor invariance', async ({ page }) => {
    const slug = `${TEST_ARTICLE_BASE}-handles`
    const payload = await getPayload({ config: await config })

    await payload.delete({ collection: 'articles', where: { slug: { equals: slug } } })

    const colWidth = Math.round((CANVAS_WIDTH - 2 * DEFAULT_GAP) / 3)
    const initialCells = [
      {
        id: 'cell-a',
        mediaId: mediaDocs[0].id,
        url: mediaDocs[0].url,
        filename: mediaDocs[0].filename,
        colStart: 1,
        colSpan: 1,
        rowStart: 1,
        rowSpan: 1,
        x: 0,
        y: 0,
        width: colWidth,
        height: DEFAULT_ROW_HEIGHT,
        aspectRatio: 'auto' as const,
        shape: 'rounded' as const,
      },
      {
        id: 'cell-b',
        mediaId: mediaDocs[1].id,
        url: mediaDocs[1].url,
        filename: mediaDocs[1].filename,
        colStart: 2,
        colSpan: 1,
        rowStart: 1,
        rowSpan: 1,
        x: colWidth + DEFAULT_GAP,
        y: 0,
        width: colWidth,
        height: DEFAULT_ROW_HEIGHT,
        aspectRatio: 'auto' as const,
        shape: 'rounded' as const,
      },
      {
        id: 'cell-c',
        mediaId: mediaDocs[2].id,
        url: mediaDocs[2].url,
        filename: mediaDocs[2].filename,
        colStart: 3,
        colSpan: 1,
        rowStart: 1,
        rowSpan: 1,
        x: (colWidth + DEFAULT_GAP) * 2,
        y: 0,
        width: colWidth,
        height: DEFAULT_ROW_HEIGHT,
        aspectRatio: 'auto' as const,
        shape: 'rounded' as const,
      },
      {
        id: 'cell-d',
        mediaId: mediaDocs[3].id,
        url: mediaDocs[3].url,
        filename: mediaDocs[3].filename,
        colStart: 1,
        colSpan: 1,
        rowStart: 2,
        rowSpan: 1,
        x: 0,
        y: DEFAULT_ROW_HEIGHT + DEFAULT_GAP,
        width: colWidth,
        height: DEFAULT_ROW_HEIGHT,
        aspectRatio: 'auto' as const,
        shape: 'rounded' as const,
      },
    ]

    const article = await payload.create({
      collection: 'articles',
      data: {
        title: 'Handles Test Article',
        slug,
        excerpt: 'Handles test excerpt',
        heroImage: mediaDocs[0].id,
        author: authorId,
        publishedDate: new Date().toISOString(),
        _status: 'draft',
        content: {
          root: {
            type: 'root',
            format: '' as any,
            indent: 0,
            version: 1,
            direction: 'ltr' as const,
            children: [
              {
                type: 'block',
                format: '',
                version: 2,
                fields: {
                  blockType: 'visualMediaLayout',
                  blockName: 'Gallery',
                  layoutData: {
                    version: 2,
                    cells: initialCells,
                    columns: 3,
                    columnTracks: [33.3, 33.3, 33.4],
                    rows: 2,
                    canvasWidth: CANVAS_WIDTH,
                    totalHeight: DEFAULT_ROW_HEIGHT * 2 + DEFAULT_GAP,
                  },
                  mediaItems: mediaDocs.slice(0, 4).map((d) => d.id),
                  caption: '',
                },
              },
            ],
          },
        },
      },
    })

    await login({ page, user: testUser })
    await page.goto(`http://localhost:3000/admin/collections/articles/${article.id}`)
    await page.waitForLoadState('networkidle')

    const stage = page.locator('.vml-canvas-stage')
    await expect(stage).toBeVisible()
    const cells = stage.locator('.vml-image-cell')

    // Click on cell D (4th cell)
    await cells.nth(3).click()

    // 1. Verify all 8 handles are present and clickable (not clipped!)
    const handleE = page.locator('div[title="Drag right edge to resize width"]')
    const handleW = page.locator('div[title="Drag left edge to resize width"]')
    const handleS = page.locator('div[title="Drag bottom edge to resize height"]')
    const handleN = page.locator('div[title="Drag top edge to resize height"]')
    const cornerHandles = page.locator('div[title="Drag corner to resize"]')

    await expect(handleE).toBeVisible()
    await expect(handleW).toBeVisible()
    await expect(handleS).toBeVisible()
    await expect(handleN).toBeVisible()
    await expect(cornerHandles).toHaveCount(4)

    // 2. Expand D to the actual FULL-ROW width
    const stageBox = (await stage.boundingBox())!
    const initialBoxD = (await cells.nth(3).boundingBox())!
    const initialBoxA = (await cells.nth(0).boundingBox())!
    const handleEBox = (await handleE.boundingBox())!

    // Drag East handle all the way right past the stage's right edge to clamp to full canvas width
    const targetX = stageBox.x + stageBox.width + 20
    await page.mouse.move(handleEBox.x + handleEBox.width / 2, handleEBox.y + handleEBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(targetX, handleEBox.y, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    const fullRowBoxD = (await cells.nth(3).boundingBox())!
    // Assert D actually reaches full row width (within 4px of stage width)
    expect(Math.abs(fullRowBoxD.width - stageBox.width)).toBeLessThanOrEqual(4)
    // Left edge remained pinned at 0
    expect(Math.abs(fullRowBoxD.x - stageBox.x)).toBeLessThanOrEqual(2)
    // Horizontal resize preserved height within 1.5px
    expect(Math.abs(fullRowBoxD.height - initialBoxD.height)).toBeLessThanOrEqual(1.5)
    // Neighbor invariance: cell A dimensions remained unchanged
    const afterBoxA = (await cells.nth(0).boundingBox())!
    expect(Math.abs(afterBoxA.width - initialBoxA.width)).toBeLessThanOrEqual(1.5)
    expect(Math.abs(afterBoxA.height - initialBoxA.height)).toBeLessThanOrEqual(1.5)

    // 3. Test South handle: height grows, top edge remains pinned, width preserved
    const initialBoxB = (await cells.nth(1).boundingBox())!
    await cells.nth(1).click() // Click cell B
    const handleSB = page.locator('div[title="Drag bottom edge to resize height"]')
    await expect(handleSB).toBeVisible()
    const handleSBBox = (await handleSB.boundingBox())!

    await page.mouse.move(handleSBBox.x + handleSBBox.width / 2, handleSBBox.y + handleSBBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(handleSBBox.x, handleSBBox.y + 60, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    const newBoxB = (await cells.nth(1).boundingBox())!
    // Height grew
    expect(newBoxB.height).toBeGreaterThan(initialBoxB.height + 40)
    // Top edge remained fixed
    expect(Math.abs(newBoxB.y - initialBoxB.y)).toBeLessThanOrEqual(1.5)
    // Vertical resize preserved width
    expect(Math.abs(newBoxB.width - initialBoxB.width)).toBeLessThanOrEqual(1.5)
  })

  // --------------------------------------------------------------------------
  // TEST 4: Cancel / Escape Behavior
  // --------------------------------------------------------------------------
  test('4. Cancel / Escape behavior: pressing Escape cancels active drag without modifying geometry', async ({ page }) => {
    const slug = `${TEST_ARTICLE_BASE}-escape`
    const payload = await getPayload({ config: await config })
    await payload.delete({ collection: 'articles', where: { slug: { equals: slug } } })

    const article = await payload.create({
      collection: 'articles',
      data: {
        title: 'Escape Test Article',
        slug,
        excerpt: 'Escape test excerpt',
        heroImage: mediaDocs[0].id,
        author: authorId,
        publishedDate: new Date().toISOString(),
        _status: 'draft',
        content: {
          root: {
            type: 'root',
            format: '' as any,
            indent: 0,
            version: 1,
            direction: 'ltr' as const,
            children: [
              {
                type: 'block',
                format: '',
                version: 2,
                fields: {
                  blockType: 'visualMediaLayout',
                  blockName: 'Gallery',
                  layoutData: {
                    version: 2,
                    cells: [
                      {
                        id: 'cell-esc',
                        mediaId: mediaDocs[0].id,
                        url: mediaDocs[0].url,
                        filename: mediaDocs[0].filename,
                        colStart: 1,
                        colSpan: 1,
                        rowStart: 1,
                        rowSpan: 1,
                        x: 0,
                        y: 0,
                        width: 592,
                        height: 280,
                        aspectRatio: 'auto',
                        shape: 'rounded',
                      },
                    ],
                    columns: 2,
                    columnTracks: [50, 50],
                    rows: 1,
                    canvasWidth: CANVAS_WIDTH,
                    totalHeight: 280,
                  },
                  mediaItems: [mediaDocs[0].id],
                  caption: '',
                },
              },
            ],
          },
        },
      },
    })

    await login({ page, user: testUser })
    await page.goto(`http://localhost:3000/admin/collections/articles/${article.id}`)
    await page.waitForLoadState('networkidle')

    const stage = page.locator('.vml-canvas-stage')
    const cellA = stage.locator('.vml-image-cell').first()
    const initialBox = (await cellA.boundingBox())!

    // Start dragging cell A
    await page.mouse.move(initialBox.x + 40, initialBox.y + 40)
    await page.mouse.down()
    await page.mouse.move(initialBox.x + 120, initialBox.y + 120, { steps: 5 })

    // Press Escape during gesture
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await page.waitForTimeout(300)

    const finalBox = (await cellA.boundingBox())!
    // Cell must restore to initial position
    expect(Math.abs(finalBox.x - initialBox.x)).toBeLessThanOrEqual(2)
    expect(Math.abs(finalBox.y - initialBox.y)).toBeLessThanOrEqual(2)
  })

  // --------------------------------------------------------------------------
  // TEST 5: Complete Persistence Lifecycle (Save Draft -> Reload -> Publish -> Public Article)
  // --------------------------------------------------------------------------
  test('5. Persistence Lifecycle: Save Draft, Refresh, Publish, and Public Page Geometry', async ({ page }) => {
    const slug = `${TEST_ARTICLE_BASE}-persist-full`
    const payload = await getPayload({ config: await config })

    await payload.delete({ collection: 'articles', where: { slug: { equals: slug } } })

    const article = await payload.create({
      collection: 'articles',
      data: {
        title: 'Full Lifecycle Article',
        slug,
        excerpt: 'Full lifecycle test excerpt',
        heroImage: mediaDocs[0].id,
        author: authorId,
        publishedDate: new Date().toISOString(),
        _status: 'draft',
        content: {
          root: {
            type: 'root',
            format: '' as any,
            indent: 0,
            version: 1,
            direction: 'ltr' as const,
            children: [
              {
                type: 'block',
                format: '',
                version: 2,
                fields: {
                  blockType: 'visualMediaLayout',
                  blockName: 'Gallery Block',
                  layoutData: {
                    version: 2,
                    cells: [],
                    columns: 1,
                    columnTracks: [100],
                    rows: 1,
                    canvasWidth: 1200,
                    totalHeight: 280,
                  },
                  mediaItems: [],
                  caption: '',
                },
              },
            ],
          },
        },
      },
    })

    await login({ page, user: testUser })
    await page.goto(`http://localhost:3000/admin/collections/articles/${article.id}`)
    await page.waitForLoadState('networkidle')

    // 1. Insert 3 images via InlineMediaSelector
    const chooseBtn = page.locator('button:has-text("Choose Existing Media")').first()
    await chooseBtn.click()
    await page.waitForTimeout(1000)

    const cards = page.locator('div[style*="cursor: pointer"]')
    await cards.nth(0).click()
    await cards.nth(1).click()
    await cards.nth(2).click()

    const insertBtn = page.locator('button:has-text("Insert")').first()
    await insertBtn.click()
    await page.waitForTimeout(1000)

    const stage = page.locator('.vml-canvas-stage')
    await expect(stage).toBeVisible()
    const cells = stage.locator('.vml-image-cell')
    await expect(cells).toHaveCount(3)

    // 2. Click Save Draft
    const saveBtn = page.locator('button#action-save, button:has-text("Save Draft")').first()
    await expect(saveBtn).toBeVisible()
    expect(await saveBtn.getAttribute('aria-disabled')).not.toBe('true')
    await saveBtn.click()
    await page.waitForTimeout(4000)

    // Verify in database draft
    const draftInDb = await payload.findByID({ collection: 'articles', id: article.id, draft: true })
    const draftFields = (draftInDb.content as any).root.children[0].fields
    expect(draftFields.layoutData.cells).toHaveLength(3)
    expect(draftFields.mediaItems).toHaveLength(3)

    // 3. Refresh page and verify all 3 images remain
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(stage).toBeVisible()
    await expect(stage.locator('.vml-image-cell')).toHaveCount(3)

    // 4. Click Publish
    const publishBtn = page.locator('button#action-publish, button:has-text("Publish")').first()
    await expect(publishBtn).toBeVisible()
    await publishBtn.click()
    await page.waitForTimeout(4000)

    // 5. Open Public Article Page and verify public rendering
    await page.goto(`http://localhost:3000/articles/${slug}`)
    await page.waitForLoadState('networkidle')

    const publicStage = page.locator('.vml-public-stage')
    await expect(publicStage).toBeVisible()
    const publicCells = publicStage.locator('.vml-public-cell')
    await expect(publicCells).toHaveCount(3)

    // Verify all 3 public cells are visible and have non-zero dimensions
    for (let i = 0; i < 3; i++) {
      const box = await publicCells.nth(i).boundingBox()
      expect(box).toBeTruthy()
      expect(box!.width).toBeGreaterThan(50)
      expect(box!.height).toBeGreaterThan(50)
    }
  })

  // --------------------------------------------------------------------------
  // TEST 6: Two Independent Layout Blocks (Requirement E)
  // --------------------------------------------------------------------------
  test('6. Two independent layout blocks: persist and customize independently without cross-talk', async ({ page }) => {
    const slug = `${TEST_ARTICLE_BASE}-two-blocks`
    const payload = await getPayload({ config: await config })

    await payload.delete({ collection: 'articles', where: { slug: { equals: slug } } })

    const cell1 = {
      id: 'block1-cell-a',
      mediaId: mediaDocs[0].id,
      url: mediaDocs[0].url,
      filename: mediaDocs[0].filename,
      colStart: 1,
      colSpan: 1,
      rowStart: 1,
      rowSpan: 1,
      x: 0,
      y: 0,
      width: 1200,
      height: 280,
      aspectRatio: 'auto' as const,
      shape: 'rounded' as const,
    }

    const cell2A = {
      id: 'block2-cell-a',
      mediaId: mediaDocs[1].id,
      url: mediaDocs[1].url,
      filename: mediaDocs[1].filename,
      colStart: 1,
      colSpan: 1,
      rowStart: 1,
      rowSpan: 1,
      x: 0,
      y: 0,
      width: 592,
      height: 280,
      aspectRatio: 'auto' as const,
      shape: 'rounded' as const,
    }
    const cell2B = {
      id: 'block2-cell-b',
      mediaId: mediaDocs[2].id,
      url: mediaDocs[2].url,
      filename: mediaDocs[2].filename,
      colStart: 2,
      colSpan: 1,
      rowStart: 1,
      rowSpan: 1,
      x: 608,
      y: 0,
      width: 592,
      height: 280,
      aspectRatio: 'auto' as const,
      shape: 'rounded' as const,
    }

    const article = await payload.create({
      collection: 'articles',
      data: {
        title: 'Two Blocks Article',
        slug,
        excerpt: 'Two blocks test excerpt',
        heroImage: mediaDocs[0].id,
        author: authorId,
        publishedDate: new Date().toISOString(),
        _status: 'draft',
        content: {
          root: {
            type: 'root',
            format: '' as any,
            indent: 0,
            version: 1,
            direction: 'ltr' as const,
            children: [
              {
                type: 'block',
                format: '',
                version: 2,
                fields: {
                  blockType: 'visualMediaLayout',
                  blockName: 'Block One',
                  layoutData: {
                    version: 2,
                    cells: [cell1],
                    columns: 1,
                    columnTracks: [100],
                    rows: 1,
                    canvasWidth: 1200,
                    totalHeight: 280,
                  },
                  mediaItems: [mediaDocs[0].id],
                  caption: 'Caption 1',
                },
              },
              {
                type: 'block',
                format: '',
                version: 2,
                fields: {
                  blockType: 'visualMediaLayout',
                  blockName: 'Block Two',
                  layoutData: {
                    version: 2,
                    cells: [cell2A, cell2B],
                    columns: 2,
                    columnTracks: [50, 50],
                    rows: 1,
                    canvasWidth: 1200,
                    totalHeight: 280,
                  },
                  mediaItems: [mediaDocs[1].id, mediaDocs[2].id],
                  caption: 'Caption 2',
                },
              },
            ],
          },
        },
      },
    })

    await login({ page, user: testUser })
    await page.goto(`http://localhost:3000/admin/collections/articles/${article.id}`)
    await page.waitForLoadState('networkidle')

    const stages = page.locator('.vml-canvas-stage')
    await expect(stages).toHaveCount(2)

    // Block 1 has 1 cell; Block 2 has 2 cells
    await expect(stages.nth(0).locator('.vml-image-cell')).toHaveCount(1)
    await expect(stages.nth(1).locator('.vml-image-cell')).toHaveCount(2)

    // Customize Block 2 by resizing its first cell
    const block2Cell1 = stages.nth(1).locator('.vml-image-cell').first()
    await block2Cell1.click()
    const handleE = page.locator('div[title="Drag right edge to resize width"]')
    await expect(handleE).toBeVisible()
    const handleEBox = (await handleE.boundingBox())!

    await page.mouse.move(handleEBox.x + handleEBox.width / 2, handleEBox.y + handleEBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(handleEBox.x - 60, handleEBox.y, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    // Form is modified because Block 2 was customized!
    const saveBtn = page.locator('button#action-save, button:has-text("Save Draft")').first()
    await expect(saveBtn).toBeEnabled()

    const savePromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/articles/${article.id}`) &&
        (res.request().method() === 'PATCH' || res.request().method() === 'POST') &&
        res.status() === 200,
    )
    await saveBtn.click()
    const patchRes = await savePromise
    const json = await patchRes.json()

    // Inspect server response to verify independence in database
    const blocksInDb = json.doc.content.root.children.filter((n: any) => n.fields?.blockType === 'visualMediaLayout')
    expect(blocksInDb.length).toBe(2)
    // Block 1 untouched
    expect(blocksInDb[0].fields.layoutData.cells.length).toBe(1)
    expect(blocksInDb[0].fields.layoutData.cells[0].width).toBe(1200)
    // Block 2 updated
    expect(blocksInDb[1].fields.layoutData.cells.length).toBe(2)
    expect(blocksInDb[1].fields.layoutData.cells[0].width).toBeLessThan(592)

    // Reload editor and verify independence
    await page.reload()
    await page.waitForLoadState('networkidle')

    const stagesAfter = page.locator('.vml-canvas-stage')
    await expect(stagesAfter).toHaveCount(2)
    await expect(stagesAfter.nth(0).locator('.vml-image-cell')).toHaveCount(1)
    await expect(stagesAfter.nth(1).locator('.vml-image-cell')).toHaveCount(2)

    // Public article page renders both blocks accurately without cross-talk
    await page.goto(`http://localhost:3000/articles/${slug}?preview=true`)
    await page.waitForLoadState('networkidle')

    const publicStages = page.locator('.vml-public-stage')
    await expect(publicStages).toHaveCount(2)
    await expect(publicStages.nth(0).locator('.vml-public-cell')).toHaveCount(1)
    await expect(publicStages.nth(1).locator('.vml-public-cell')).toHaveCount(2)
  })
})
