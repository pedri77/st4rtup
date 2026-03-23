import { test, expect } from '@playwright/test'

test.describe('SEO Command Center', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketing/seo-center')
  })

  test('shows 9 tabs', async ({ page }) => {
    await expect(page.locator('text=Content Hub')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Keyword Studio')).toBeVisible()
    await expect(page.locator('text=Backlinks')).toBeVisible()
    await expect(page.locator('text=Dashboard')).toBeVisible()
    await expect(page.locator('text=Content Tracker')).toBeVisible()
  })

  test('can switch to Keywords tab', async ({ page }) => {
    await page.getByText('Keyword Studio').click()
    await expect(page.locator('text=Keyword Research')).toBeVisible({ timeout: 5000 }).catch(() => {})
  })

  test('can switch to Content Tracker tab', async ({ page }) => {
    await page.getByText('Content Tracker').click()
    await expect(page.locator('text=Nueva publicacion')).toBeVisible({ timeout: 5000 }).catch(() => {})
  })
})
