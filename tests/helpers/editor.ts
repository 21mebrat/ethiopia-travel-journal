import { expect, type Page } from '@playwright/test'

const DEFAULT_SERVER_URL = 'http://localhost:3000'

/**
 * Payload automatically opens Live Preview for Articles. Its iframe is rendered
 * on top of the editor and intercepts pointer events, so every editor test must
 * leave preview mode before interacting with fields or blocks.
 */
export async function exitLivePreview(page: Page): Promise<void> {
  // Payload resolves the per-user `editViewType` preference asynchronously, so
  // Live Preview may auto-open *after* the editor looks ready. Wait for that
  // preference-driven mount before deciding whether the toggler must be clicked.
  const previewWindow = page.locator('.live-preview-window--is-live-previewing')
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    if ((await previewWindow.count()) > 0) break
    await page.waitForTimeout(150)
  }

  const toggler = page.locator('#live-preview-toggler')
  if (await toggler.isVisible().catch(() => false)) {
    const label = (await toggler.getAttribute('aria-label'))?.toLowerCase() ?? ''
    if (label.includes('exit')) {
      await toggler.click()
    }
  }

  await expect(previewWindow).toHaveCount(0, { timeout: 15000 })
}

/**
 * Opens an article edit view, exits Live Preview and waits until the document
 * form and the Lexical editor are ready for pointer/keyboard interaction.
 */
export async function openArticleEditor(
  page: Page,
  articleId: string | number,
  serverURL = DEFAULT_SERVER_URL,
): Promise<void> {
  await page.goto(`${serverURL}/admin/collections/articles/${articleId}`)
  await page.waitForLoadState('domcontentloaded')

  await page.locator('.collection-edit').waitFor({ state: 'visible', timeout: 60000 })
  await exitLivePreview(page)

  // Wait for the document form to hydrate (title field + rich text editor).
  await page.locator('#field-title').waitFor({ state: 'visible', timeout: 60000 })
  await page.locator('.rich-text-lexical').first().waitFor({ state: 'visible', timeout: 60000 })
  await expect(page.locator('.rich-text-lexical .ContentEditable__root').first()).toBeVisible({
    timeout: 60000,
  })
}

/**
 * Payload serializes Lexical field values through a deprioritized (~500ms)
 * OnChangePlugin callback. A Save click issued immediately after the last
 * layout mutation can therefore submit the previous editor state. Wait for
 * that hand-off before saving in tests.
 */
export async function waitForEditorFieldSync(page: Page): Promise<void> {
  await page.waitForTimeout(1200)
}

/**
 * Waits for a save/publish round-trip against the article endpoint and returns
 * the parsed response.
 */
export async function waitForArticleSave(
  page: Page,
  articleId: string | number,
): Promise<{ status: number; json: any }> {
  const response = await page.waitForResponse(
    (res) =>
      res.url().includes(`/api/articles/${articleId}`) && res.status() < 400,
    { timeout: 60000 },
  )

  return { status: response.status(), json: await response.json().catch(() => null) }
}

/**
 * Asserts every <img> inside the given locator has actually decoded.
 */
export async function expectImagesLoaded(
  container: ReturnType<Page['locator']>,
): Promise<void> {
  const images = container.locator('img')
  const count = await images.count()
  expect(count).toBeGreaterThan(0)

  for (let i = 0; i < count; i += 1) {
    const image = images.nth(i)
    await expect
      .poll(
        () =>
          image.evaluate(
            (el) =>
              (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0,
          ),
        { timeout: 15000, message: `image ${i} failed to load` },
      )
      .toBe(true)
  }
}

/**
 * Inserts a Visual Media Layout block through the real fixed-toolbar block
 * dropdown (the same path an editor uses), and waits for its empty canvas.
 */
export async function insertVisualMediaLayoutBlock(page: Page): Promise<void> {
  const editorRoot = page.locator('.rich-text-lexical .ContentEditable__root').first()
  await editorRoot.click()

  await page.locator('button[aria-label="blocks dropdown"]').first().click()
  const item = page
    .locator('button.toolbar-popup__dropdown-item', { hasText: 'Visual Media Layout' })
    .first()
  await expect(item).toBeVisible({ timeout: 15000 })
  await item.click()

  await expect(page.locator('.vml-empty-canvas').last()).toBeVisible({ timeout: 15000 })
}

/**
 * Opens the inline media picker for a block and selects specific media docs by
 * ID. Works for both empty blocks (Choose Existing Media) and populated blocks
 * (Add More Images to Layout, which is revealed once a cell is selected).
 */
export async function chooseMediaInLayout(
  page: Page,
  block: ReturnType<Page['locator']>,
  mediaIds: string[],
): Promise<void> {
  const chooseExisting = block.getByRole('button', { name: 'Choose Existing Media' })
  if ((await chooseExisting.count()) > 0) {
    await chooseExisting.first().click()
  } else {
    await block.locator('.vml-image-cell').first().click()
    const addMore = block.getByRole('button', { name: /Add More Images to Layout/i })
    await expect(addMore).toBeVisible()
    await addMore.click()
  }

  const dialog = page.locator('[data-testid="vml-media-selector"]')
  await expect(dialog).toBeVisible({ timeout: 15000 })

  for (const id of mediaIds) {
    const card = dialog.locator(
      `[data-testid="vml-media-card"][data-media-id="${id}"]`,
    )
    await expect(card).toBeVisible({ timeout: 15000 })
    await card.click()
  }

  await dialog.locator('[data-testid="vml-insert-selected"]').click()
  await expect(dialog).toHaveCount(0, { timeout: 15000 })
}

/**
 * Deletes every image in a layout block using the real per-cell Delete action,
 * ending in the canonical empty canvas state.
 */
export async function deleteAllLayoutCells(
  page: Page,
  block: ReturnType<Page['locator']>,
): Promise<void> {
  const cells = block.locator('.vml-image-cell')
  let remaining = await cells.count()

  while (remaining > 0) {
    const cell = cells.first()
    await cell.hover()
    const deleteButton = cell.locator('[title="Delete image"]')
    await expect(deleteButton).toBeVisible({ timeout: 10000 })
    await deleteButton.click()
    await expect
      .poll(async () => cells.count(), { timeout: 10000 })
      .toBe(remaining - 1)
    remaining -= 1
  }

  await expect(page.locator('.vml-empty-canvas').last()).toBeVisible()
}

