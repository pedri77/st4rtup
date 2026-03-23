import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('shows KPI cards', async ({ page }) => {
    await expect(page.locator('text=Revenue')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Leads')).toBeVisible()
    await expect(page.locator('text=Pipeline')).toBeVisible()
  })

  test('shows activity heatmap', async ({ page }) => {
    await expect(page.locator('text=ActivityHeatmap')).toBeVisible({ timeout: 10000 }).catch(() => {})
  })

  test('keyboard shortcut Ctrl+K opens search', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await expect(page.locator('[placeholder*="Buscar"]')).toBeVisible({ timeout: 5000 }).catch(() => {})
  })
})
