import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Assumes user is logged in via cookie/localStorage
    await page.goto('/')
  })

  test('redirects to dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/)
  })

  test('sidebar has main navigation items', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Leads')).toBeVisible()
    await expect(page.getByText('Pipeline')).toBeVisible()
  })

  test('navigate to leads page', async ({ page }) => {
    await page.getByText('Leads').click()
    await expect(page).toHaveURL(/leads/)
  })

  test('navigate to pipeline', async ({ page }) => {
    await page.getByText('Pipeline').click()
    await expect(page).toHaveURL(/pipeline/)
  })

  test('navigate to marketing', async ({ page }) => {
    await page.getByText('Marketing').click()
    await expect(page).toHaveURL(/marketing/)
  })

  test('navigate to SEO Center', async ({ page }) => {
    await page.getByText('SEO Center').click()
    await expect(page).toHaveURL(/seo-center/)
  })
})
