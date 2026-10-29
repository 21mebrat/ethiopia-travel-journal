import { test, expect } from '@playwright/test'

test.describe('Public homepage', () => {
  test('renders the editorial homepage and shared header', async ({ page }) => {
    await page.goto('http://localhost:3000/')

    await expect(page).toHaveTitle(/Ethiopia Travel Journal/)
    await expect(page.locator('header.site-header')).toHaveCount(1)
    await expect(page.locator('h1').first()).not.toBeEmpty()
    await expect(page.locator('.site-nav__link').first()).toBeVisible()
    await expect(page.locator('#featured-stories')).toBeVisible()
    await expect(page.locator('.story-grid .story-card').first()).toBeVisible()
    await expect(page.locator('footer.site-footer')).toBeVisible()
    await expect(
      page.locator('footer.site-footer').getByRole('link', { name: 'Stories', exact: true }),
    ).toBeVisible()
  })

  test('mobile navigation opens with the keyboard and closes on Escape', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('http://localhost:3000/')

    const more = page.locator('.site-tab--button')
    await more.focus()
    await page.keyboard.press('Enter')

    await expect(more).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('dialog', { name: 'More' })).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(more).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('dialog', { name: 'More' })).toHaveCount(0)
    await expect(more).toBeFocused()

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const copyright = await page.locator('.site-footer__bottom p').boundingBox()
    const tabs = await page.locator('.site-tabs').boundingBox()
    expect(copyright).toBeTruthy()
    expect(tabs).toBeTruthy()
    expect(copyright!.y + copyright!.height).toBeLessThanOrEqual(tabs!.y + 1)
  })

  test('desktop search filters the story feed', async ({ page }) => {
    await page.goto('http://localhost:3000/')

    await page.locator('#site-search-desktop').fill('lalibela')
    await page.locator('.site-search__submit').click()

    await expect(page).toHaveURL(/q=lalibela/)
    await expect(page.locator('#home-section-title')).toHaveText('Featured Stories')
  })

  test('does not overflow horizontally on narrow screens', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto('http://localhost:3000/')

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
