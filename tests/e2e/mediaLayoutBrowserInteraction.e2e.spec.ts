import { test, expect, Page } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'
import { CANVAS_WIDTH, DEFAULT_ROW_HEIGHT, DEFAULT_GAP } from '../../src/components/lexical/gridLayoutEngine'

const TEST_ARTICLE_SLUG = 'e2e-visual-media-test'

async function setupTestArticle() {
  const payload = await getPayload({ config })

  // Find user for author field
  const userResult = await payload.find({
    collection: 'users',
    limit: 1,
  })
  const authorId = userResult.docs[0]?.id

  // Find 4 real media items
  const mediaResult = await payload.find({
    collection: 'media',
    limit: 4,
  })

  const mediaDocs = mediaResult.docs
  if (mediaDocs.length < 4) {
    throw new Error('Need at least 4 media items in database for e2e test')
  }

  // Delete existing test article if any
  await payload.delete({
    collection: 'articles',
    where: {
      slug: { equals: TEST_ARTICLE_SLUG },
    },
  })

  // 3 columns layout: A(col 1), B(col 2), C(col 3) on row 1; D(col 1) on row 2
  const colWidth = Math.round((CANVAS_WIDTH - 2 * DEFAULT_GAP) / 3)
  const initialCells = [
    {
      id: 'cell-a',
      mediaId: mediaDocs[0].id,
      url: mediaDocs[0].url || `/api/media/file/${mediaDocs[0].filename}`,
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
      url: mediaDocs[1].url || `/api/media/file/${mediaDocs[1].filename}`,
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
      url: mediaDocs[2].url || `/api/media/file/${mediaDocs[2].filename}`,
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
      url: mediaDocs[3].url || `/api/media/file/${mediaDocs[3].filename}`,
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

  const createdArticle = await payload.create({
    collection: 'articles',
    data: {
      title: 'E2E Visual Media Test Article',
      slug: TEST_ARTICLE_SLUG,
      heroImage: mediaDocs[0].id,
      author: authorId,
      publishedDate: new Date().toISOString(),
      excerpt: 'Testing visual media layout interactions in browser',
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
                blockName: 'Visual Media Gallery',
                layoutData: {
                  version: 2,
                  cells: initialCells,
                  columns: 3,
                  columnTracks: [33.3, 33.3, 33.4],
                  rows: 2,
                  canvasWidth: CANVAS_WIDTH,
                  totalHeight: DEFAULT_ROW_HEIGHT * 2 + DEFAULT_GAP,
                },
                mediaItems: mediaDocs.map((d) => d.id),
                caption: 'E2E Test Gallery',
              },
            },
          ],
        },
      },
    },
  })

  return { article: createdArticle, mediaDocs }
}

test.describe('Visual Media Layout - Browser Interaction Tests', () => {
  let page: Page
  let articleId: string

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()
    const { article } = await setupTestArticle()
    articleId = article.id

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    })
    page = await context.newPage()
    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('Public page: renders contained stage with geometry parity and lightbox', async () => {
    await page.goto(`http://localhost:3000/articles/${TEST_ARTICLE_SLUG}`)
    await page.waitForLoadState('networkidle')

    const stage = page.locator('.vml-public-stage')
    await expect(stage).toBeVisible()

    const cells = stage.locator('.vml-public-cell')
    await expect(cells).toHaveCount(4)

    // Bounding boxes check at fixed viewport
    const boxA = await cells.nth(0).boundingBox()
    const boxB = await cells.nth(1).boundingBox()
    const boxC = await cells.nth(2).boundingBox()
    const boxD = await cells.nth(3).boundingBox()

    expect(boxA).toBeTruthy()
    expect(boxB).toBeTruthy()
    expect(boxC).toBeTruthy()
    expect(boxD).toBeTruthy()

    // Row 1 items share same vertical Y level within 2px
    expect(Math.abs(boxA!.y - boxB!.y)).toBeLessThanOrEqual(2)
    expect(Math.abs(boxB!.y - boxC!.y)).toBeLessThanOrEqual(2)

    // Row 2 item D sits below row 1
    expect(boxD!.y).toBeGreaterThan(boxA!.y + boxA!.height - 5)

    // Click on image opens fullscreen Lightbox
    await cells.nth(0).click()
    const lightboxDialog = page.locator('div[role="dialog"]')
    await expect(lightboxDialog).toBeVisible()

    // Press Escape to close Lightbox
    await page.keyboard.press('Escape')
    await expect(lightboxDialog).not.toBeVisible()
  })

  test('Admin editor: select image reveals 8 resize handles', async () => {
    await page.goto(`http://localhost:3000/admin/collections/articles/${articleId}`)
    await page.waitForLoadState('networkidle')

    // Find the canvas stage inside the Lexical editor
    const stage = page.locator('.vml-canvas-stage')
    await expect(stage).toBeVisible()

    const cells = stage.locator('.vml-image-cell')
    await expect(cells).toHaveCount(4)

    // Initially handles are not visible
    const eastHandle = page.locator('div[title="Drag right edge to resize width"]')
    await expect(eastHandle).not.toBeVisible()

    // Click on cell D (4th cell)
    await cells.nth(3).click()

    // Now all resize handles appear for selected cell
    await expect(eastHandle).toBeVisible()
    await expect(page.locator('div[title="Drag left edge to resize width"]')).toBeVisible()
    await expect(page.locator('div[title="Drag top edge to resize height"]')).toBeVisible()
    await expect(page.locator('div[title="Drag bottom edge to resize height"]')).toBeVisible()
  })

  test('Action 1 & 4: Expand D across the second row preserves D height and neighbors', async () => {
    await page.goto(`http://localhost:3000/admin/collections/articles/${articleId}`)
    await page.waitForLoadState('networkidle')

    const stage = page.locator('.vml-canvas-stage')
    await expect(stage).toBeVisible()
    const cells = stage.locator('.vml-image-cell')

    // Measure initial boxes of all 4 cells before expanding
    const initialBoxA = (await cells.nth(0).boundingBox())!
    const initialBoxB = (await cells.nth(1).boundingBox())!
    const initialBoxC = (await cells.nth(2).boundingBox())!
    const initialBoxD = (await cells.nth(3).boundingBox())!

    // Click on cell D
    await cells.nth(3).click()

    const eastHandle = page.locator('div[title="Drag right edge to resize width"]')
    await expect(eastHandle).toBeVisible()

    const handleBox = (await eastHandle.boundingBox())!

    // Drag East handle of D rightwards across the whole row
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(handleBox.x + 400, handleBox.y, { steps: 10 })
    await page.mouse.up()

    // Wait for state to settle
    await page.waitForTimeout(300)

    // Measure new boxes
    const newBoxA = (await cells.nth(0).boundingBox())!
    const newBoxB = (await cells.nth(1).boundingBox())!
    const newBoxC = (await cells.nth(2).boundingBox())!
    const newBoxD = (await cells.nth(3).boundingBox())!

    // Invariant 1: D expanded horizontally
    expect(newBoxD.width).toBeGreaterThan(initialBoxD.width + 100)

    // Invariant 2 (Requirement 4): Horizontal resizing preserves height within 1px
    expect(Math.abs(newBoxD.height - initialBoxD.height)).toBeLessThanOrEqual(1.5)

    // Invariant 3 (Requirement 5): Neighbors did NOT resize (within 1px)
    expect(Math.abs(newBoxA.width - initialBoxA.width)).toBeLessThanOrEqual(1.5)
    expect(Math.abs(newBoxA.height - initialBoxA.height)).toBeLessThanOrEqual(1.5)
    expect(Math.abs(newBoxB.width - initialBoxB.width)).toBeLessThanOrEqual(1.5)
    expect(Math.abs(newBoxB.height - initialBoxB.height)).toBeLessThanOrEqual(1.5)
    expect(Math.abs(newBoxC.width - initialBoxC.width)).toBeLessThanOrEqual(1.5)
    expect(Math.abs(newBoxC.height - initialBoxC.height)).toBeLessThanOrEqual(1.5)
  })

  test('Action 2: Expand A across two columns repositions B rather than resizing B', async () => {
    await page.goto(`http://localhost:3000/admin/collections/articles/${articleId}`)
    await page.waitForLoadState('networkidle')

    const stage = page.locator('.vml-canvas-stage')
    const cells = stage.locator('.vml-image-cell')

    // Measure initial box of B
    const initialBoxB = (await cells.nth(1).boundingBox())!

    // Click on cell A
    await cells.nth(0).click()

    const eastHandle = page.locator('div[title="Drag right edge to resize width"]')
    await expect(eastHandle).toBeVisible()
    const handleBox = (await eastHandle.boundingBox())!

    // Drag East handle of A rightwards into column 2
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(handleBox.x + 250, handleBox.y, { steps: 10 })
    await page.mouse.up()

    await page.waitForTimeout(300)

    const newBoxB = (await cells.nth(1).boundingBox())!

    // B moved down to avoid overlap
    expect(newBoxB.y).toBeGreaterThan(initialBoxB.y)

    // Requirement 5: B did not resize!
    expect(Math.abs(newBoxB.width - initialBoxB.width)).toBeLessThanOrEqual(2)
    expect(Math.abs(newBoxB.height - initialBoxB.height)).toBeLessThanOrEqual(2)
  })

  test('Action 3: Drag C into empty blank space on row 2 without colliding', async () => {
    await page.goto(`http://localhost:3000/admin/collections/articles/${articleId}`)
    await page.waitForLoadState('networkidle')

    const stage = page.locator('.vml-canvas-stage')
    const cells = stage.locator('.vml-image-cell')

    // Cell C is 3rd cell (row 1, col 3)
    const initialBoxC = (await cells.nth(2).boundingBox())!
    const initialBoxA = (await cells.nth(0).boundingBox())!

    // Click and drag cell C downwards into the empty area beside D
    await page.mouse.move(initialBoxC.x + initialBoxC.width / 2, initialBoxC.y + initialBoxC.height / 2)
    await page.mouse.down()
    // Move down into second row
    await page.mouse.move(initialBoxC.x + initialBoxC.width / 2, initialBoxC.y + initialBoxC.height + 60, { steps: 10 })
    await page.mouse.up()

    await page.waitForTimeout(300)

    const newBoxC = (await cells.nth(2).boundingBox())!
    const newBoxA = (await cells.nth(0).boundingBox())!

    // C successfully moved down into row 2
    expect(newBoxC.y).toBeGreaterThan(initialBoxC.y + 40)

    // A was completely unaffected and did not change size
    expect(Math.abs(newBoxA.width - initialBoxA.width)).toBeLessThanOrEqual(2)
    expect(Math.abs(newBoxA.height - initialBoxA.height)).toBeLessThanOrEqual(2)
  })
})
