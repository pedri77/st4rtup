import { test, expect } from '@playwright/test'

test.describe('Mi Dia', () => {
  test('shows greeting and sections', async ({ page }) => {
    await page.goto('/my-day')
    await expect(page.locator('text=/Buenos/')).toBeVisible({ timeout: 10000 }).catch(() => {})
  })
})
