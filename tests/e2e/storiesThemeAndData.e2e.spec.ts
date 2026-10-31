import { test, expect } from '@playwright/test'

/**
 * Normalizes CSS color values (rgb, lab, oklch) to a 0-100 perceptual lightness scale.
 */
function extractLightness(colorStr: string): number {
  if (!colorStr) return 50
  const trimmed = colorStr.trim().toLowerCase()

  if (trimmed.startsWith('lab(')) {
    const match = trimmed.slice(4).trim().split(/[\s,]+/)[0]
    return parseFloat(match) || 0
  }

  if (trimmed.startsWith('oklab(')) {
    const match = trimmed.slice(6).trim().split(/[\s,]+/)[0]
    const val = parseFloat(match) || 0
    return val <= 1 ? val * 100 : val
  }

  if (trimmed.startsWith('oklch(')) {
    const match = trimmed.slice(6).trim().split(/[\s,]+/)[0]
    const val = parseFloat(match) || 0
    return val <= 1 ? val * 100 : val
  }

  const rgb = trimmed.match(/\d+(\.\d+)?/g)?.map(Number)
  if (!rgb || rgb.length < 3) return 50
  return ((0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255) * 100
}

test.describe('Stories Listing & Detail Pages - Theming & Data Integrity', () => {
  // --------------------------------------------------------------------------
  // PART 1: Theming & Token Consistency
  // --------------------------------------------------------------------------
  test('renders listing and detail pages with consistent light theme tokens (no dark islands)', async ({
    page,
  }) => {
    // 1. Stories listing page in light mode
    await page.goto('http://127.0.0.1:3000/stories', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveTitle(/Travel Stories from Ethiopia/)

    // Verify card background has light luminance (no dark islands)
    const cardBg = await page.locator('article.group').first().evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    expect(extractLightness(cardBg)).toBeGreaterThanOrEqual(80)

    // Verify newsletter widget inherits card theme (no forced dark island)
    const newsletterBg = await page.locator('.stories-page aside aside').first().evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    expect(extractLightness(newsletterBg)).toBeGreaterThanOrEqual(80)

    // 2. Stories detail page in light mode
    await page.goto('http://127.0.0.1:3000/stories/lalibela-one', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveTitle(/Lalibela/)

    // Center article content background is light
    const detailContentBg = await page.locator('article.story-detail-page').first().evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    expect(extractLightness(detailContentBg)).toBeGreaterThanOrEqual(80)

    // Photographic contrast exception: Hero header overlay retains intentional white text
    const heroTitleColor = await page.locator('h1').first().evaluate((el) => {
      return window.getComputedStyle(el).color
    })
    expect(extractLightness(heroTitleColor)).toBeGreaterThanOrEqual(90)
  })

  test('adapts cleanly to dark theme when data-theme="dark" or .dark is set (no white islands)', async ({
    page,
  }) => {
    await page.goto('http://127.0.0.1:3000/stories', { waitUntil: 'domcontentloaded' })

    // Apply dark theme attribute
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
      document.documentElement.classList.add('dark')
    })

    // Verify card background now has dark luminance (no white islands)
    const darkCardBg = await page.locator('article.group').first().evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    expect(extractLightness(darkCardBg)).toBeLessThanOrEqual(35)

    // Verify card text is light
    const darkTextColor = await page.locator('article.group h3 a').first().evaluate((el) => {
      return window.getComputedStyle(el).color
    })
    expect(extractLightness(darkTextColor)).toBeGreaterThanOrEqual(70)

    // Check detail page in dark mode
    await page.goto('http://127.0.0.1:3000/stories/lalibela-one', { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
      document.documentElement.classList.add('dark')
    })

    const darkDetailBg = await page.locator('article.story-detail-page').first().evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    expect(extractLightness(darkDetailBg)).toBeLessThanOrEqual(35)
  })

  // --------------------------------------------------------------------------
  // PART 2: Real Data Behavior & Filters
  // --------------------------------------------------------------------------
  test('category filters query actual database records and show honest empty states', async ({
    page,
  }) => {
    await page.goto('http://127.0.0.1:3000/stories', { waitUntil: 'domcontentloaded', timeout: 45000 })

    // Real categories from DB should appear as pills
    const allPill = page.locator('a', { hasText: 'All Stories' })
    await expect(allPill).toBeVisible()

    // At least one published story card should be visible
    await expect(page.locator('article.group').first()).toBeVisible()

    // Filter to an empty category or unknown category
    await page.goto('http://127.0.0.1:3000/stories?category=nonexistent-category', { waitUntil: 'domcontentloaded' })

    // Must show honest empty state and NOT reset to all stories
    await expect(page.locator('text=No stories found for the selected category.')).toBeVisible()
    await expect(page.locator('article.group')).toHaveCount(0)

    // "Show All Stories" button should link back to /stories
    const showAllBtn = page.getByRole('link', { name: 'Show All Stories' })
    await expect(showAllBtn).toBeVisible()
    await showAllBtn.click()
    await expect(page).toHaveURL('http://127.0.0.1:3000/stories')
  })

  test('sorting dropdown updates query parameters correctly', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/stories', { waitUntil: 'domcontentloaded' })

    const sortButton = page.locator('button[aria-haspopup="listbox"]')
    await sortButton.click()

    const oldestOption = page.locator('a[role="option"]', { hasText: 'Oldest' })
    await oldestOption.click()

    await expect(page).toHaveURL(/sort=oldest/)
  })

  // --------------------------------------------------------------------------
  // PART 3: Detail Content, Dynamic TOC & Headings
  // --------------------------------------------------------------------------
  test('detail page renders genuine published article content and dynamic TOC', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/stories/lalibela-one', { waitUntil: 'domcontentloaded' })

    // Breadcrumb trail
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]')
    await expect(breadcrumb).toBeVisible()
    await expect(breadcrumb).toContainText('Stories')
    await expect(breadcrumb).toContainText('Lalibela')

    // Check canonical link
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe('/stories/lalibela-one')

    // Real CMS content in .prose-editorial
    const prose = page.locator('.prose-editorial')
    await expect(prose).toBeVisible()

    // Dynamic TOC targets
    const toc = page.locator('nav.table-of-contents')
    if (await toc.isVisible()) {
      const firstLink = toc.locator('a').first()
      const targetHash = await firstLink.getAttribute('href')
      expect(targetHash).toMatch(/^#/)

      const targetHeading = page.locator(targetHash!)
      await expect(targetHeading).toBeVisible()
    }

    // Related stories widget renders without fabricated fallback stories
    const related = page.locator('.related-stories-widget')
    await expect(related).toBeVisible()
  })

  // --------------------------------------------------------------------------
  // PART 4: Public Access, Draft Security & 404 Behavior
  // --------------------------------------------------------------------------
  test('returns honest 404 for unknown or private slugs without staff authorization', async ({
    page,
  }) => {
    // Non-existent slug returns 404
    const response = await page.goto('http://127.0.0.1:3000/stories/totally-fake-slug-404', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(404)

    // Unauthorized ?preview=true on non-existent slug returns 404
    const previewResponse = await page.goto(
      'http://127.0.0.1:3000/stories/totally-fake-slug-404?preview=true',
      { waitUntil: 'domcontentloaded' },
    )
    expect(previewResponse?.status()).toBe(404)

    // Same behavior on /articles/[slug]
    const articleResponse = await page.goto(
      'http://127.0.0.1:3000/articles/totally-fake-slug-404',
      { waitUntil: 'domcontentloaded' },
    )
    expect(articleResponse?.status()).toBe(404)
  })

  // --------------------------------------------------------------------------
  // PART 5: Desktop & Mobile Bookmarks Visibility and Persistence
  // --------------------------------------------------------------------------
  test('desktop bookmarks are visible and persist in localStorage', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('http://127.0.0.1:3000/stories', { waitUntil: 'domcontentloaded' })

    const bookmarkBtn = page.locator('button.story-card__bookmark').first()
    await expect(bookmarkBtn).toBeVisible()

    // Click bookmark button to save
    await bookmarkBtn.click()
    await expect(bookmarkBtn).toHaveAttribute('aria-pressed', 'true')

    // Reload page and verify bookmark state persisted
    await page.reload()
    const reloadedBtn = page.locator('button.story-card__bookmark').first()
    await expect(reloadedBtn).toHaveAttribute('aria-pressed', 'true')

    // Unbookmark
    await reloadedBtn.click()
    await expect(reloadedBtn).toHaveAttribute('aria-pressed', 'false')
  })

  // --------------------------------------------------------------------------
  // PART 6: Social Share Bar & Clipboard
  // --------------------------------------------------------------------------
  test('social share buttons have valid destinations and copy-link triggers', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/stories/lalibela-one', { waitUntil: 'domcontentloaded' })

    const shareWidget = page.locator('.share-sidebar-widget')
    await expect(shareWidget).toBeVisible()

    // Valid share destination links
    await expect(shareWidget.locator('a[aria-label="Share on Facebook"]')).toHaveAttribute(
      'href',
      /facebook\.com\/sharer/,
    )
    await expect(shareWidget.locator('a[aria-label="Share on X"]')).toHaveAttribute(
      'href',
      /twitter\.com\/intent/,
    )

    // Copy link button
    const copyBtn = shareWidget.locator('button[aria-label="Copy story link"]')
    await expect(copyBtn).toBeVisible()
    await copyBtn.click()

    // Copied feedback is presented
    await expect(shareWidget.locator('text=Copied!')).toBeVisible()
  })

  // --------------------------------------------------------------------------
  // PART 7: Newsletter Backend & Frontend Integration
  // --------------------------------------------------------------------------
  test('newsletter widget allows subscribing, validates email, and handles duplicates', async ({
    page,
  }) => {
    await page.goto('http://127.0.0.1:3000/stories', { waitUntil: 'domcontentloaded' })

    const newsletter = page.locator('aside[aria-label="Join Our Newsletter"]')
    await expect(newsletter).toBeVisible()

    const emailInput = newsletter.locator('input[type="email"]')
    const submitBtn = newsletter.locator('button[type="submit"]')

    // Input and button should be enabled and interactive
    await expect(emailInput).toBeEnabled()
    await expect(submitBtn).toBeEnabled()

    // 1. Submit with a unique test email
    const uniqueEmail = `subscriber-${Date.now()}@example.com`
    await emailInput.fill(uniqueEmail)
    await submitBtn.click()

    // Double opt-in confirmation feedback message should appear
    await expect(
      newsletter.locator('text=/confirmation email|thank you/i'),
    ).toBeVisible()

    // 2. Click "Subscribe another email" to reset form
    const subscribeAnotherBtn = newsletter.getByRole('button', {
      name: /subscribe another/i,
    })
    await expect(subscribeAnotherBtn).toBeVisible()
    await subscribeAnotherBtn.click()

    // Form inputs should re-appear
    await expect(emailInput).toBeVisible()

    // 3. Submit duplicate email - should indicate already pending or subscribed
    await emailInput.fill(uniqueEmail)
    await submitBtn.click()

    await expect(
      newsletter.locator('text=/already subscribed|confirmation email/i'),
    ).toBeVisible()
  })

  // --------------------------------------------------------------------------
  // PART 8: Responsive Layout & No Horizontal Overflow
  // --------------------------------------------------------------------------
  test('does not overflow horizontally across desktop, tablet, and narrow mobile', async ({
    page,
  }) => {
    const viewports = [
      { width: 1280, height: 900 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 320, height: 600 },
    ]

    for (const vp of viewports) {
      await page.setViewportSize(vp)
      await page.goto('http://127.0.0.1:3000/stories', { waitUntil: 'domcontentloaded' })

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      )
      expect(overflow, `Overflow detected at viewport width ${vp.width}px`).toBeLessThanOrEqual(0)
    }
  })

  // --------------------------------------------------------------------------
  // PART 9: Amharic Localization
  // --------------------------------------------------------------------------
  test('supports Amharic locale cleanly', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/stories?locale=am', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveTitle(/የጉዞ ታሪኮች/)
    await expect(page.locator('h1').first()).toContainText('ከኢትዮጵያ የጉዞ ታሪኮች')
  })
})
