import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export interface LoginOptions {
  page: Page
  serverURL?: string
  user: {
    email: string
    password: string
  }
}

/**
 * Logs the user into the admin panel via the login page.
 */
export async function login({
  page,
  serverURL = 'http://localhost:3000',
  user,
}: LoginOptions): Promise<void> {
  await page.goto(`${serverURL}/admin/login`)
  await page.waitForLoadState('domcontentloaded')

  // If already logged in, Payload redirects to /admin
  if (page.url().includes('/admin') && !page.url().includes('/login')) {
    return
  }

  const emailInput = page.locator('#field-email')
  const isLoginForm = await emailInput.isVisible({ timeout: 10000 }).catch(() => false)
  if (isLoginForm) {
    await emailInput.fill(user.email)
    await page.fill('#field-password', user.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(new RegExp(`${serverURL}/admin(?!/login)`))
  }
}
