import { test, expect, Page } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'
import {
  openArticleEditor,
  waitForArticleSave,
  expectImagesLoaded,
  insertVisualMediaLayoutBlock,
  chooseMediaInLayout,
  deleteAllLayoutCells,
  waitForEditorFieldSync,
} from '../helpers/editor'
import { CANVAS_WIDTH, DEFAULT_ROW_HEIGHT, DEFAULT_GAP, doBoxesOverlap } from '../../src/components/lexical/gridLayoutEngine'

const TEST_ARTICLE_BASE = 'e2e-vml-complete'

function textParagraph(text: string) {
  return {
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    textFormat: 0,
    textStyle: '',
    children: [
      {
        type: 'text',
        detail: 0,
        format: 0,
        mode: 'normal',
        style: '',
        text,
        version: 1,
      },
    ],
  }
}

function getVisualBlocks(doc: any): any[] {
  const children = doc?.content?.root?.children ?? []
  return children.filter(
    (node: any) => node?.type === 'block' && node?.fields?.blockType === 'visualMediaLayout',
  )
}

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
    test.setTimeout(180000)
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
    await openArticleEditor(page, article.id)

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
    await openArticleEditor(page, article.id)

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
    await openArticleEditor(page, article.id)

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
  // TEST 5: Complete Persistence Lifecycle (UI-inserted block, customize, save
  // draft, reload, publish, public article)
  // --------------------------------------------------------------------------
  test('5. UI-created block: insert, add media, customize, save draft, reload, publish, public render', async ({ page }) => {
    test.setTimeout(300000)
    const slug = `${TEST_ARTICLE_BASE}-ui-lifecycle`
    const payload = await getPayload({ config: await config })

    await payload.delete({ collection: 'articles', where: { slug: { equals: slug } } })

    const article = await payload.create({
      collection: 'articles',
      data: {
        title: 'UI Lifecycle Article',
        slug,
        excerpt: 'UI-created layout lifecycle',
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
            children: [textParagraph('Intro paragraph')],
          },
        },
      },
    })

    await login({ page, user: testUser })
    await openArticleEditor(page, article.id)

    // Create the block through the real editor toolbar (not seeded data).
    await insertVisualMediaLayoutBlock(page)
    await chooseMediaInLayout(
      page,
      page.locator('.vml-empty-canvas').last(),
      mediaDocs.slice(0, 3).map((d) => d.id),
    )

    const stage = page.locator('.vml-canvas-stage').last()
    await expect(stage).toBeVisible()
    const cells = stage.locator('.vml-image-cell')
    await expect(cells).toHaveCount(3)
    await expect(page.locator('.vml-empty-canvas')).toHaveCount(0)

    const expectedIds = mediaDocs.slice(0, 3).map((d) => d.id)
    const expectedUrls = mediaDocs.slice(0, 3).map((d) => d.url)

    const editorSrcs = await stage
      .locator('.vml-image-cell img')
      .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src')))
    expect(editorSrcs).toEqual(expectedUrls)

    // Customize: switch the first image from contain to cover.
    await cells.nth(0).click()
    const switchToCover = cells.nth(0).locator('button[title^="Switch to Cover"]')
    await expect(switchToCover).toBeVisible()
    await switchToCover.click()
    await expect(cells.nth(0).locator('button[title^="Switch to Contain"]')).toBeVisible()

    // Customize: resize the first cell independently with the east handle.
    const handleE = cells.nth(0).locator('div[title="Drag right edge to resize width"]')
    await expect(handleE).toBeVisible()
    const handleBox = (await handleE.boundingBox())!
    const beforeResize = (await cells.nth(0).boundingBox())!
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(handleBox.x - 80, handleBox.y + handleBox.height / 2, { steps: 8 })
    await page.mouse.up()
    await expect
      .poll(async () => (await cells.nth(0).boundingBox())!.width)
      .toBeLessThan(beforeResize.width - 10)

    // Save Draft and verify the serialized Lexical document in the database.
    const draftSave = waitForArticleSave(page, article.id)
    await waitForEditorFieldSync(page)
    await page.locator('#action-save-draft').click()
    expect((await draftSave).status).toBeLessThan(400)
    await page.waitForTimeout(1000)

    const draft = await payload.findByID({
      collection: 'articles',
      id: article.id,
      draft: true,
      depth: 0,
    })
    const draftBlock = getVisualBlocks(draft)[0]
    expect(draftBlock).toBeTruthy()
    expect(draftBlock.fields.layoutData.cells).toHaveLength(3)
    expect(draftBlock.fields.layoutData.cells.map((c: any) => c.mediaId)).toEqual(expectedIds)
    expect(draftBlock.fields.mediaItems).toEqual(expectedIds)
    expect(draftBlock.fields.layoutData.cells[0].objectFit).toBe('cover')

    const savedWidth = draftBlock.fields.layoutData.cells[0].width
    expect(savedWidth).toBeLessThan(CANVAS_WIDTH)
    const savedGeometry = draftBlock.fields.layoutData.cells.map((c: any) => ({
      mediaId: c.mediaId,
      x: c.x,
      y: c.y,
      width: c.width,
      height: c.height,
    }))
    const savedTotalHeight = draftBlock.fields.layoutData.totalHeight

    // Reload from the server: IDs, geometry and fit must survive exactly.
    await openArticleEditor(page, article.id)
    const reloadedStage = page.locator('.vml-canvas-stage').last()
    await expect(reloadedStage.locator('.vml-image-cell')).toHaveCount(3)
    await expect(reloadedStage.locator('.vml-image-cell').nth(0).locator('img')).toHaveCSS(
      'object-fit',
      'cover',
    )

    const reloadedSrcs = await reloadedStage
      .locator('.vml-image-cell img')
      .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src')))
    expect(reloadedSrcs).toEqual(expectedUrls)

    const reloadedStageBox = (await reloadedStage.boundingBox())!
    for (let i = 0; i < savedGeometry.length; i += 1) {
      const box = (await reloadedStage.locator('.vml-image-cell').nth(i).boundingBox())!
      const geometry = savedGeometry[i]
      expect(
        Math.abs(box.x - reloadedStageBox.x - (geometry.x / CANVAS_WIDTH) * reloadedStageBox.width),
      ).toBeLessThanOrEqual(3)
      expect(
        Math.abs(box.y - reloadedStageBox.y - (geometry.y / savedTotalHeight) * reloadedStageBox.height),
      ).toBeLessThanOrEqual(3)
      expect(
        Math.abs(box.width - (geometry.width / CANVAS_WIDTH) * reloadedStageBox.width),
      ).toBeLessThanOrEqual(3)
      expect(
        Math.abs(box.height - (geometry.height / savedTotalHeight) * reloadedStageBox.height),
      ).toBeLessThanOrEqual(3)
    }

    // Publish from the reopened editor and verify the published document.
    const publishRes = waitForArticleSave(page, article.id)
    await waitForEditorFieldSync(page)
    await page.locator('#action-save').click()
    expect((await publishRes).status).toBeLessThan(400)
    await page.waitForTimeout(1000)

    const published = await payload.findByID({
      collection: 'articles',
      id: article.id,
      draft: false,
      depth: 0,
    })
    expect(published._status).toBe('published')
    const publishedBlock = getVisualBlocks(published)[0]
    expect(publishedBlock.fields.layoutData.cells).toHaveLength(3)
    expect(publishedBlock.fields.layoutData.cells.map((c: any) => c.mediaId)).toEqual(expectedIds)
    expect(publishedBlock.fields.mediaItems).toEqual(expectedIds)
    expect(publishedBlock.fields.layoutData.cells[0].objectFit).toBe('cover')

    // Public article: real markup, real decoded images, exact references.
    await page.goto(`http://localhost:3000/articles/${slug}`)
    await page.waitForLoadState('networkidle')

    const publicStage = page.locator('.vml-public-stage').last()
    await expect(publicStage).toBeVisible()
    await publicStage.scrollIntoViewIfNeeded()
    await expect(publicStage.locator('.vml-public-cell')).toHaveCount(3)
    await expectImagesLoaded(publicStage)

    const publicSrcs = await publicStage
      .locator('.vml-public-cell img')
      .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src')))
    expect(publicSrcs).toEqual(expectedUrls)
  })

  // --------------------------------------------------------------------------
  // TEST 6: Direct publish without an intermediate Save Draft
  // --------------------------------------------------------------------------
  test('6. Direct publish: UI-created block is persisted to the published document without a prior draft save', async ({ page }) => {
    test.setTimeout(300000)
    const slug = `${TEST_ARTICLE_BASE}-direct-publish`
    const payload = await getPayload({ config: await config })
    await payload.delete({ collection: 'articles', where: { slug: { equals: slug } } })

    const article = await payload.create({
      collection: 'articles',
      data: {
        title: 'Direct Publish Article',
        slug,
        excerpt: 'Direct publish layout',
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
            children: [textParagraph('Direct publish intro')],
          },
        },
      },
    })

    await login({ page, user: testUser })
    await openArticleEditor(page, article.id)
    await insertVisualMediaLayoutBlock(page)
    await chooseMediaInLayout(
      page,
      page.locator('.vml-empty-canvas').last(),
      mediaDocs.slice(0, 2).map((d) => d.id),
    )

    await expect(page.locator('.vml-canvas-stage').last().locator('.vml-image-cell')).toHaveCount(2)

    // Publish directly - no Save Draft in between.
    const publishRes = waitForArticleSave(page, article.id)
    await waitForEditorFieldSync(page)
    await page.locator('#action-save').click()
    expect((await publishRes).status).toBeLessThan(400)
    await page.waitForTimeout(1000)

    const expectedIds = mediaDocs.slice(0, 2).map((d) => d.id)
    const published = await payload.findByID({
      collection: 'articles',
      id: article.id,
      draft: false,
      depth: 0,
    })
    expect(published._status).toBe('published')
    const publishedBlock = getVisualBlocks(published)[0]
    expect(publishedBlock.fields.layoutData.cells.map((c: any) => c.mediaId)).toEqual(expectedIds)
    expect(publishedBlock.fields.mediaItems).toEqual(expectedIds)

    // Reopening the editor reads the published layout back.
    await openArticleEditor(page, article.id)
    await expect(page.locator('.vml-canvas-stage').last().locator('.vml-image-cell')).toHaveCount(2)

    await page.goto(`http://localhost:3000/articles/${slug}`)
    await page.waitForLoadState('networkidle')
    const publicStage = page.locator('.vml-public-stage').last()
    await expect(publicStage).toBeVisible()
    await publicStage.scrollIntoViewIfNeeded()
    await expect(publicStage.locator('.vml-public-cell')).toHaveCount(2)
    await expectImagesLoaded(publicStage)
  })

  // --------------------------------------------------------------------------
  // TEST 7: Undo/redo of layout changes and empty-state restoration
  // --------------------------------------------------------------------------
  test('7. Undo/redo restores layout state, and deleting every image persists an authoritative empty layout', async ({ page }) => {
    test.setTimeout(300000)
    const slug = `${TEST_ARTICLE_BASE}-undo-empty`
    const payload = await getPayload({ config: await config })
    await payload.delete({ collection: 'articles', where: { slug: { equals: slug } } })

    const article = await payload.create({
      collection: 'articles',
      data: {
        title: 'Undo Empty Article',
        slug,
        excerpt: 'Undo and empty state',
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
            children: [textParagraph('Undo intro')],
          },
        },
      },
    })

    await login({ page, user: testUser })
    await openArticleEditor(page, article.id)
    await insertVisualMediaLayoutBlock(page)
    await chooseMediaInLayout(
      page,
      page.locator('.vml-empty-canvas').last(),
      mediaDocs.slice(0, 2).map((d) => d.id),
    )

    const cells = page.locator('.vml-canvas-stage').last().locator('.vml-image-cell')
    await expect(cells).toHaveCount(2)

    // Add a third image, then undo that layout change. Undo must follow the
    // Lexical node (the serialized source of truth) rather than stale form state.
    await chooseMediaInLayout(page, page.locator('.vml-canvas-root').last(), [mediaDocs[2].id])
    await expect(cells).toHaveCount(3)

    await page.getByText('Undo intro').click()
    await page.keyboard.press('Control+z')
    await expect(page.locator('.vml-canvas-stage').last().locator('.vml-image-cell')).toHaveCount(2, {
      timeout: 10000,
    })

    // Redo restores the third image.
    await page.keyboard.press('Control+Shift+z')
    await expect(page.locator('.vml-canvas-stage').last().locator('.vml-image-cell')).toHaveCount(3)

    // Delete every image through the real per-cell action.
    const block = page.locator('.vml-layout-block, .vml-canvas-root').last()
    await deleteAllLayoutCells(page, block)
    await expect(page.locator('.vml-empty-canvas')).toBeVisible()

    const draftSave = waitForArticleSave(page, article.id)
    await waitForEditorFieldSync(page)
    await page.locator('#action-save-draft').click()
    expect((await draftSave).status).toBeLessThan(400)
    await page.waitForTimeout(1000)

    const draft = await payload.findByID({
      collection: 'articles',
      id: article.id,
      draft: true,
      depth: 0,
    })
    const draftBlock = getVisualBlocks(draft)[0]
    expect(draftBlock.fields.layoutData.cells).toEqual([])
    expect(draftBlock.fields.mediaItems).toEqual([])

    // Reload: the empty layout is authoritative and no images resurrect.
    await openArticleEditor(page, article.id)
    await expect(page.locator('.vml-empty-canvas')).toBeVisible()
    await expect(page.locator('.vml-image-cell')).toHaveCount(0)

    // Publish the empty layout and verify the public page renders no stage.
    const publishRes = waitForArticleSave(page, article.id)
    await waitForEditorFieldSync(page)
    await page.locator('#action-save').click()
    expect((await publishRes).status).toBeLessThan(400)
    await page.waitForTimeout(1000)

    await page.goto(`http://localhost:3000/articles/${slug}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.vml-public-stage')).toHaveCount(0)
  })

  // --------------------------------------------------------------------------
  // TEST 8: Legacy images editing and deletion (no resurrection)
  // --------------------------------------------------------------------------
  test('8. Legacy images hydrate in the editor, can be deleted, and never resurrect after save', async ({ page }) => {
    test.setTimeout(300000)
    const slug = `${TEST_ARTICLE_BASE}-legacy-delete`
    const payload = await getPayload({ config: await config })
    await payload.delete({ collection: 'articles', where: { slug: { equals: slug } } })

    const article = await payload.create({
      collection: 'articles',
      data: {
        title: 'Legacy Edit Article',
        slug,
        excerpt: 'Legacy editing and deletion',
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
                  blockName: 'Legacy Only',
                  // Relationship IDs only: exercises the editor's media resolution.
                  images: [
                    { image: mediaDocs[0].id, altText: 'Legacy A' },
                    { image: mediaDocs[1].id, altText: 'Legacy B' },
                  ],
                },
              },
            ],
          },
        },
      },
    })

    await login({ page, user: testUser })
    await openArticleEditor(page, article.id)

    const block = page.locator('.vml-canvas-root').last()
    await expect(block.locator('.vml-image-cell')).toHaveCount(2)
    await expectImagesLoaded(block)

    const srcs = await block
      .locator('.vml-image-cell img')
      .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src')))
    expect(srcs).toEqual([mediaDocs[0].url, mediaDocs[1].url])

    // Delete both legacy images and save.
    await deleteAllLayoutCells(page, block)
    await expect(page.locator('.vml-empty-canvas')).toBeVisible()

    const draftSave = waitForArticleSave(page, article.id)
    await waitForEditorFieldSync(page)
    await page.locator('#action-save-draft').click()
    expect((await draftSave).status).toBeLessThan(400)
    await page.waitForTimeout(1000)

    const draft = await payload.findByID({
      collection: 'articles',
      id: article.id,
      draft: true,
      depth: 0,
    })
    const draftBlock = getVisualBlocks(draft)[0]
    expect(draftBlock.fields.layoutData.cells).toEqual([])
    // The legacy relationship array is untouched but must be ignored.
    expect(draftBlock.fields.images).toHaveLength(2)

    await openArticleEditor(page, article.id)
    await expect(page.locator('.vml-empty-canvas')).toBeVisible()
    await expect(page.locator('.vml-image-cell')).toHaveCount(0)

    const publishRes = waitForArticleSave(page, article.id)
    await waitForEditorFieldSync(page)
    await page.locator('#action-save').click()
    expect((await publishRes).status).toBeLessThan(400)
    await page.waitForTimeout(1000)

    await page.goto(`http://localhost:3000/articles/${slug}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.vml-public-stage')).toHaveCount(0)
  })

  // --------------------------------------------------------------------------
  // TEST 9: Two Independent Layout Blocks (Requirement E)
  // --------------------------------------------------------------------------
  test('9. Two independent layout blocks: persist and customize independently without cross-talk', async ({ page }) => {
    test.setTimeout(300000)
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
    await openArticleEditor(page, article.id)

    const stages = page.locator('.vml-canvas-stage')
    await expect(stages).toHaveCount(2)

    // Block 1 has 1 cell; Block 2 has 2 cells
    await expect(stages.nth(0).locator('.vml-image-cell')).toHaveCount(1)
    await expect(stages.nth(1).locator('.vml-image-cell')).toHaveCount(2)

    // Customize Block 2 by resizing its first cell
    const block2Cell1 = stages.nth(1).locator('.vml-image-cell').first()
    await block2Cell1.click()
    const handleE = stages.nth(1).locator('div[title="Drag right edge to resize width"]')
    await expect(handleE).toBeVisible()
    const handleEBox = (await handleE.boundingBox())!

    await page.mouse.move(handleEBox.x + handleEBox.width / 2, handleEBox.y + handleEBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(handleEBox.x - 60, handleEBox.y, { steps: 5 })
    await page.mouse.up()
    await expect
      .poll(async () => (await block2Cell1.boundingBox())!.width)
      .toBeLessThan(592 - 5)

    const saveResponse = waitForArticleSave(page, article.id)
    await waitForEditorFieldSync(page)
    await page.locator('#action-save-draft').click()
    const savedJson = (await saveResponse).json

    // Inspect server response to verify independence in database
    const blocksInDb = getVisualBlocks(savedJson.doc)
    expect(blocksInDb.length).toBe(2)
    // Block 1 untouched
    expect(blocksInDb[0].fields.layoutData.cells.length).toBe(1)
    expect(blocksInDb[0].fields.layoutData.cells[0].width).toBe(1200)
    // Block 2 updated
    expect(blocksInDb[1].fields.layoutData.cells.length).toBe(2)
    expect(blocksInDb[1].fields.layoutData.cells[0].width).toBeLessThan(592)
    const block2SavedWidth = blocksInDb[1].fields.layoutData.cells[0].width

    // Reload editor and verify independence survives the round trip
    await openArticleEditor(page, article.id)

    const stagesAfter = page.locator('.vml-canvas-stage')
    await expect(stagesAfter).toHaveCount(2)
    await expect(stagesAfter.nth(0).locator('.vml-image-cell')).toHaveCount(1)
    await expect(stagesAfter.nth(1).locator('.vml-image-cell')).toHaveCount(2)

    const persisted = await payload.findByID({
      collection: 'articles',
      id: article.id,
      draft: true,
      depth: 0,
    })
    const persistedBlocks = getVisualBlocks(persisted)
    expect(persistedBlocks[0].fields.layoutData.cells[0].width).toBe(1200)
    expect(persistedBlocks[1].fields.layoutData.cells[0].width).toBe(block2SavedWidth)

    // Public preview renders both blocks accurately without cross-talk
    await page.goto(`http://localhost:3000/articles/${slug}?preview=true`)
    await page.waitForLoadState('networkidle')

    const publicStages = page.locator('.vml-public-stage')
    await expect(publicStages).toHaveCount(2)
    await expect(publicStages.nth(0).locator('.vml-public-cell')).toHaveCount(1)
    await expect(publicStages.nth(1).locator('.vml-public-cell')).toHaveCount(2)
    await publicStages.nth(1).scrollIntoViewIfNeeded()
    await expectImagesLoaded(publicStages.nth(1))
  })
})
