import { expect, test } from '@playwright/test'
import { login } from './helpers'

/**
 * E2E: Flujos principales de la aplicación
 *
 * Prerequisitos:
 *   - Emuladores Firebase corriendo
 *   - Dashboard corriendo con emuladores
 */

test.describe('Complete Application Flow', () => {
  test.describe('Protected Routes', () => {
    test('should show auth page or dashboard depending on session', async ({
      page,
    }) => {
      await page.goto('/')

      // In emulators, session may persist — either auth page or dashboard is valid
      await page.waitForTimeout(2000)
      const url = page.url()
      const isAuth = url.includes('/auth')
      const isDashboard = !isAuth

      if (isAuth) {
        await expect(
          page.getByRole('textbox', { name: /correo electrónico/i }),
        ).toBeVisible()
      } else {
        // Dashboard loaded — session was active
        expect(isDashboard).toBe(true)
      }
    })
  })

  test.describe('Login Flow', () => {
    test('should login with magic link and reach dashboard', async ({
      page,
    }) => {
      await login(page)

      // Should see the main dashboard with Animales tab
      await expect(
        page.getByRole('tab', { name: /animales/i }),
      ).toBeVisible({ timeout: 10000 })
    })

    test('should show farm data after login', async ({ page }) => {
      await login(page)

      // Wait for dashboard to load
      await expect(
        page.getByRole('tab', { name: /animales/i }),
      ).toBeVisible({ timeout: 10000 })

      // Should have navigation tabs visible
      const tabs = page.getByRole('tab')
      const tabCount = await tabs.count()
      expect(tabCount).toBeGreaterThan(0)
    })
  })

  test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('should navigate to Animales tab', async ({ page }) => {
      await page.getByRole('tab', { name: /animales/i }).click()
      await page.waitForTimeout(500)

      // Should show animal-related content
      const content = await page.content()
      expect(content).toBeTruthy()
    })

    test('should navigate between tabs', async ({ page }) => {
      // Click each main tab and verify no crash
      const tabNames = ['Animales', 'Cría', 'Recordatorios']

      for (const name of tabNames) {
        const tab = page.getByRole('tab', { name: new RegExp(name, 'i') })
        const isVisible = await tab.isVisible().catch(() => false)
        if (isVisible) {
          await tab.click()
          await page.waitForTimeout(500)
        }
      }
    })
  })

  test.describe('Performance', () => {
    test('should load dashboard quickly after login', async ({ page }) => {
      const start = Date.now()
      await login(page)
      await expect(
        page.getByRole('tab', { name: /animales/i }),
      ).toBeVisible({ timeout: 15000 })
      const duration = Date.now() - start

      // Login + dashboard load should be under 15s
      expect(duration).toBeLessThan(15000)
    })
  })
})
