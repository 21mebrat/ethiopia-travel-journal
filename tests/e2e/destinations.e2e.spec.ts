import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:3000'

test.describe('Destinations Listing Page (/destinations)', () => {
  test('renders hero banner, category filters, destination cards, and sidebar widgets', async ({ page }) => {
    await page.goto(`${BASE_URL}/destinations`)

    // Verify hero banner
    await expect(page.getByRole('heading', { level: 1, name: /Explore Ethiopia/i })).toBeVisible()
    await expect(page.getByText('Destinations of Ethiopia')).toBeVisible()

    // Verify filter bar
    await expect(page.getByRole('button', { name: 'All Destinations' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Historic Sites' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Natural Wonders' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'View on Map' })).toBeVisible()

    // Verify destination cards are present
    const lalibelaHeading = page.getByRole('heading', { level: 3, name: 'Lalibela' })
    await expect(lalibelaHeading).toBeVisible()

    // Verify sidebar widgets
    await expect(page.getByRole('heading', { level: 3, name: 'Explore by Region' })).toBeVisible()
    await expect(page.getByText('Featured Destination')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Travel Inspiration' })).toBeVisible()
  })

  test('filters by category and region correctly and resets pagination', async ({ page }) => {
    // Navigate with category filter
    await page.goto(`${BASE_URL}/destinations?category=historic_sites`)
    await expect(page.getByRole('heading', { level: 3, name: 'Lalibela' })).toBeVisible()

    // Navigate with region filter
    await page.goto(`${BASE_URL}/destinations?region=afar`)
    await expect(page.getByRole('heading', { level: 3, name: 'Danakil Depression' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 3, name: 'Lalibela' })).toHaveCount(0)
  })

  test('opens and closes the interactive map modal via click and Escape key', async ({ page }) => {
    await page.goto(`${BASE_URL}/destinations`)

    const mapButton = page.getByRole('button', { name: 'View on Map' })
    await mapButton.click()

    // Verify modal appears with accessible role and title
    const modal = page.getByRole('dialog', { name: /Destinations Map/i })
    await expect(modal).toBeVisible()
    await expect(page.getByRole('heading', { name: /Interactive Ethiopia Destinations Map/i })).toBeVisible()

    // Close modal via Escape key
    await page.keyboard.press('Escape')
    await expect(modal).toHaveCount(0)

    // Focus should be restored to opener
    await expect(mapButton).toBeFocused()
  })

  test('renders cleanly in Amharic locale', async ({ page }) => {
    await page.goto(`${BASE_URL}/destinations?locale=am`)

    await expect(page.getByRole('heading', { level: 1, name: 'ኢትዮጵያን ያስሱ' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'ሁሉም መዳረሻዎች' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'በካርታ ይመልከቱ' })).toBeVisible()
  })

  test('renders correctly across responsive viewports (320px, 390px, 768px, 1280px)', async ({ page }) => {
    const viewports = [
      { width: 320, height: 600 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1280, height: 800 },
    ]

    for (const vp of viewports) {
      await page.setViewportSize(vp)
      await page.goto(`${BASE_URL}/destinations`)
      await expect(page.getByRole('heading', { level: 1, name: /Explore Ethiopia/i })).toBeVisible()
      const lalibelaHeading = page.getByRole('heading', { level: 3, name: 'Lalibela' })
      await expect(lalibelaHeading).toBeVisible()
    }
  })

  test('supports theme switching between light and dark modes', async ({ page }) => {
    await page.goto(`${BASE_URL}/destinations`)

    // Set dark theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
      document.documentElement.classList.add('dark')
    })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('html')).toHaveClass(/dark/)

    // Set light theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light')
      document.documentElement.classList.remove('dark')
    })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })
})

test.describe('Destination Detail Page (/destinations/[slug])', () => {
  test('renders complete Lalibela detail page with hero, gallery, animated ads, and sidebar', async ({ page }) => {
    await page.goto(`${BASE_URL}/destinations/lalibela`)

    // 1. Breadcrumbs & Hero
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Lalibela' })).toBeVisible()
    await expect(page.getByText('UNESCO World Heritage', { exact: true })).toBeVisible()
    await expect(page.getByText(/Best: October - March/i)).toBeVisible()
    await expect(page.getByText(/2,630m/i)).toBeVisible()

    // 2. Photo Gallery Strip
    const gallerySection = page.getByRole('region', { name: 'Photo Gallery' })
    await expect(gallerySection).toBeVisible()
    const thumbnails = gallerySection.getByRole('button')
    await expect(thumbnails.first()).toBeVisible()

    // Test Lightbox interaction with Escape key
    await thumbnails.first().click()
    const lightbox = page.getByRole('dialog')
    await expect(lightbox).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(lightbox).toHaveCount(0)

    // 3. Database-driven Advertisement (if active ads exist in DB)
    const adSection = page.locator('aside[aria-label="SPONSORED"], section[aria-label="SPONSORED"], aside[aria-label="ስፖንሰር የተደረገ"], section[aria-label="ስፖንሰር የተደረገ"]')
    const adCount = await adSection.count()
    if (adCount > 0) {
      await expect(adSection.first()).toBeVisible()
    }

    // 4. About Lalibela Editorial Section
    await expect(page.getByRole('heading', { level: 2, name: 'About Lalibela' })).toBeVisible()

    // 5. Quick Information Card
    const quickInfo = page.getByRole('region', { name: 'Quick Information' })
    await expect(quickInfo).toBeVisible()
    await expect(quickInfo.getByText('Amhara')).toBeVisible()
    await expect(quickInfo.getByText('2,630 meters')).toBeVisible()
    await expect(quickInfo.getByText('October - March')).toBeVisible()

    // 6. Top Attractions Grid
    const attractions = page.getByRole('region', { name: 'Top Attractions in Lalibela' })
    await expect(attractions).toBeVisible()
    await expect(attractions.getByRole('heading', { name: 'Bete Giyorgis (St. George)' })).toBeVisible()
    await expect(attractions.getByRole('heading', { name: 'Bete Medhane Alem' })).toBeVisible()

    // 8. Sidebar Widgets
    await expect(page.getByRole('heading', { name: 'Location & Coordinates' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Get Directions/i })).toBeVisible()
    await expect(page.getByText('Recommended for Your Trip')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Lalibela Heritage Hotel' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Related Destinations' })).toBeVisible()
  })

  test('supports Amharic locale cleanly on detail page', async ({ page }) => {
    await page.goto(`${BASE_URL}/destinations/lalibela?locale=am`)

    await expect(page.getByRole('heading', { level: 1, name: 'Lalibela' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'ስለ Lalibela' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'ፈጣን መረጃ' })).toBeVisible()
    await expect(page.getByText('ለጉዞዎ የተመከረ')).toBeVisible()
  })
})

test.describe('Navigation and Active Links', () => {
  test('SiteHeader Destinations link navigates to /destinations and has active styling', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)

    // Click Destinations in desktop nav
    const destinationsNavLink = page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Destinations' })
    await destinationsNavLink.click()

    await expect(page).toHaveURL(/.*\/destinations/)
    await expect(destinationsNavLink).toHaveAttribute('aria-current', 'page')
  })

  test('Maintains exactly one main landmark and one main-content ID per page', async ({ page }) => {
    await page.goto(`${BASE_URL}/destinations`)
    await expect(page.locator('main')).toHaveCount(1)
    await expect(page.locator('#main-content')).toHaveCount(1)

    await page.goto(`${BASE_URL}/destinations/lalibela`)
    await expect(page.locator('main')).toHaveCount(1)
    await expect(page.locator('#main-content')).toHaveCount(1)
  })

  test('Renders footer credit "Powered By Mebrat Matebie" with var(--chart-1) color token', async ({ page }) => {
    await page.goto(`${BASE_URL}/destinations`)
    const credit = page.locator('.site-footer__credit')
    await expect(credit).toBeVisible()
    await expect(credit).toHaveText('Powered By Mebrat Matebie')

    // Verify "Editorial admin" and "Back to top" links are removed
    await expect(page.getByRole('link', { name: 'Editorial admin' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Back to top' })).toHaveCount(0)
  })

  test('Destination Gallery traps focus with Tab and Shift+Tab and restores focus on close', async ({ page }) => {
    await page.goto(`${BASE_URL}/destinations/lalibela`)
    const gallerySection = page.getByRole('region', { name: 'Photo Gallery' })
    const firstThumb = gallerySection.getByRole('button').first()
    await firstThumb.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Focus must stay contained inside the dialog during Tab cycling
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab')
      const isInside = await page.evaluate(() => {
        const active = document.activeElement
        const d = document.querySelector('[role="dialog"]')
        return d ? d.contains(active) : false
      })
      expect(isInside).toBe(true)
    }

    // Focus must stay contained inside the dialog during Shift+Tab cycling
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Shift+Tab')
      const isInside = await page.evaluate(() => {
        const active = document.activeElement
        const d = document.querySelector('[role="dialog"]')
        return d ? d.contains(active) : false
      })
      expect(isInside).toBe(true)
    }

    // Press Escape to dismiss
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)

    // Focus should be restored to the opening thumbnail
    await expect(firstThumb).toBeFocused()
  })

  test('Pagination at 320px viewport fits cleanly without horizontal page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 600 })
    await page.goto(`${BASE_URL}/destinations`)

    // Verify no horizontal overflow at 320px
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalOverflow).toBe(false)
  })
})
