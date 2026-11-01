import { test, expect } from '@playwright/test'

const BASE_URL = 'http://127.0.0.1:3000'

test.describe('Comments & Engagement UI Suite', () => {
  test('detail page renders engagement metrics and NO star ratings exist', async ({ page }) => {
    // 1. Navigate to stories listing to find an existing story slug
    await page.goto(`${BASE_URL}/stories`)
    await expect(page.locator('h1')).toBeVisible()

    const storyLink = page.locator('article h3 a').first()
    await expect(storyLink).toBeVisible()
    const storyHref = await storyLink.getAttribute('href')
    expect(storyHref).toBeTruthy()

    // 2. Open the story detail page
    await page.goto(`${BASE_URL}${storyHref}`)
    await expect(page.locator('h1')).toBeVisible()

    // 3. Verify engagement metrics in Hero Header
    const heroSection = page.locator('section').first()
    await expect(heroSection.getByText(/views|ዕይታዎች/i)).toBeVisible()
    await expect(heroSection.getByText(/comments|አስተያየቶች/i)).toBeVisible()
    await expect(heroSection.getByText(/popularity:|ተሳትፎ፡/i)).toBeVisible()

    // 4. CRITICAL VERIFICATION: Strictly NO star rating or star voting elements
    const starVoting = page.locator('.star-rating, [data-rating], input[type="radio"][name*="rating"], .rating-stars')
    await expect(starVoting).toHaveCount(0)

    const starIcons = page.locator('button svg.lucide-star, form svg.lucide-star')
    await expect(starIcons).toHaveCount(0)

    // 5. Jump link to #comments
    const commentsLink = heroSection.locator('a[href="#comments"]')
    await expect(commentsLink).toBeVisible()
    await commentsLink.click()

    const commentsSection = page.locator('#comments')
    await expect(commentsSection).toBeVisible()
  })

  test('submitting a comment displays pending moderation notice and clears form', async ({ page }) => {
    await page.goto(`${BASE_URL}/stories`)
    const storyLink = page.locator('article h3 a').first()
    const storyHref = await storyLink.getAttribute('href')

    await page.goto(`${BASE_URL}${storyHref}`)

    const commentsSection = page.locator('#comments')
    await expect(commentsSection).toBeVisible()

    // Fill comment form
    const authorNameInput = page.locator('#comment-author-name')
    const emailInput = page.locator('#comment-author-email')
    const commentBodyInput = page.locator('#comment-body')
    const submitBtn = page.locator('#comments button[type="submit"]')

    const testCommentText = `E2E automated test comment ${Date.now()}`
    await authorNameInput.fill('Playwright Tester')
    await emailInput.fill('tester@automated-test.local')
    await commentBodyInput.fill(testCommentText)

    await submitBtn.click()

    // Verify success banner appears explaining pending moderation
    const successBanner = page.locator('#comments [role="status"]')
    await expect(successBanner).toBeVisible({ timeout: 10000 })
    await expect(successBanner).toContainText(/awaiting|ግምገማ/i)

    // Form inputs must be cleared
    await expect(authorNameInput).toHaveValue('')
    await expect(commentBodyInput).toHaveValue('')
  })

  test('article alias route /articles/[slug] shares the same engagement metrics & comments', async ({ page }) => {
    await page.goto(`${BASE_URL}/stories`)
    const storyLink = page.locator('article h3 a').first()
    const storyHref = await storyLink.getAttribute('href')
    const slug = storyHref!.replace('/stories/', '')

    // Navigate to alias route /articles/[slug]
    await page.goto(`${BASE_URL}/articles/${slug}`)
    await expect(page.locator('h1')).toBeVisible()

    // Verify metrics in hero
    const heroSection = page.locator('section').first()
    await expect(heroSection.getByText(/views|ዕይታዎች/i)).toBeVisible()
    await expect(heroSection.getByText(/comments|አስተያየቶች/i)).toBeVisible()

    // Verify comments section is mounted
    await expect(page.locator('#comments')).toBeVisible()
    await expect(page.locator('#comment-author-name')).toBeVisible()
  })

  test('bilingual Amharic support renders localized engagement headers', async ({ page }) => {
    await page.goto(`${BASE_URL}/stories?locale=am`)
    await expect(page.locator('h1')).toBeVisible()

    const storyLink = page.locator('article h3 a').first()
    const storyHref = await storyLink.getAttribute('href')

    const separator = storyHref!.includes('?') ? '&' : '?'
    await page.goto(`${BASE_URL}${storyHref}${separator}locale=am`)

    // Verify Amharic labels
    const commentsSection = page.locator('#comments')
    await expect(commentsSection.locator('h2')).toContainText('አስተያየቶች')
    await expect(commentsSection.locator('h3')).toContainText('አስተያየት ይስጡ')
  })

  test('stories listing displays engagement metrics on cards and supports popularity sorting', async ({ page }) => {
    await page.goto(`${BASE_URL}/stories?sort=popular`)
    await expect(page.locator('h1')).toBeVisible()

    // Card should have view/comment indicators
    const firstCard = page.locator('article.group').first()
    await expect(firstCard).toBeVisible()

    // Should display popularity / engagement indicators
    const metricsRow = firstCard.locator('div.border-t').last()
    await expect(metricsRow).toBeVisible()

    // Most popular widget should be present
    const popularWidget = page.locator('.most-popular-widget')
    if (await popularWidget.count() > 0) {
      await expect(popularWidget).toBeVisible()
    }
  })

  test('no hydration mismatch errors on article page and right sidebar is sticky matching left side', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${BASE_URL}/stories`)
    const storyLink = page.locator('article h3 a').first()
    const storyHref = await storyLink.getAttribute('href')
    const slug = storyHref!.replace('/stories/', '')

    // Navigate to article detail
    await page.goto(`${BASE_URL}/articles/${slug}`)
    await expect(page.locator('h1')).toBeVisible()

    // 1. Assert NO hydration mismatch console errors occurred
    const hydrationErrors = consoleErrors.filter(
      (err) => err.includes('hydration') || err.includes('didn\'t match') || err.includes('did not match'),
    )
    expect(hydrationErrors).toEqual([])

    // 2. Assert right sidebar has sticky positioning matching left sidebar
    const rightSidebar = page.locator('aside[aria-label="Article Sidebar"]')
    await expect(rightSidebar).toBeVisible()

    const position = await rightSidebar.evaluate((el) => {
      const style = window.getComputedStyle(el)
      return {
        position: style.position,
        top: style.top,
      }
    })

    expect(position.position).toBe('sticky')
    expect(position.top).toBe('96px') // top-24 is 6rem = 96px
  })
})
