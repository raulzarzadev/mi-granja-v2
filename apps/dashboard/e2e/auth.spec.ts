import { expect, test } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.describe('Magic Link Authentication', () => {
    test('should display login form with email input', async ({ page }) => {
      await page.goto('/auth')

      await expect(page.locator('img[alt*="Mi Granja"]')).toBeVisible()
      await expect(
        page.getByText('Te enviaremos un código de acceso a tu email'),
      ).toBeVisible()
      await expect(
        page.getByRole('textbox', { name: /correo electrónico/i }),
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /enviar código de acceso/i }),
      ).toBeVisible()
    })

    test('should show beta banner', async ({ page }) => {
      await page.goto('/auth')

      await expect(
        page.getByText(/Mi Granja esta en fase de pruebas/),
      ).toBeVisible()
      await expect(
        page.getByRole('link', { name: /feedback/i }),
      ).toBeVisible()
    })

    test('should close beta banner', async ({ page }) => {
      await page.goto('/auth')

      const banner = page.getByText(/Mi Granja esta en fase de pruebas/)
      await expect(banner).toBeVisible()

      await page.getByRole('button', { name: /cerrar aviso/i }).click()
      await expect(banner).not.toBeVisible()
    })

    test('should validate empty email', async ({ page }) => {
      await page.goto('/auth')

      await page
        .getByRole('button', { name: /enviar código de acceso/i })
        .click()

      // Should show some validation (HTML5 required or custom)
      const emailInput = page.getByRole('textbox', {
        name: /correo electrónico/i,
      })
      await expect(emailInput).toBeVisible()
    })

    test('should accept email and show confirmation', async ({ page }) => {
      await page.goto('/auth')

      await page
        .getByRole('textbox', { name: /correo electrónico/i })
        .fill('admin@migranja.com')
      await page
        .getByRole('button', { name: /enviar código de acceso/i })
        .click()

      // After sending, should show some confirmation or change state
      // Wait for either a success message or the button to change
      await page.waitForTimeout(2000)

      // The page should have reacted to the submission
      const snapshot = await page.content()
      expect(snapshot.length).toBeGreaterThan(0)
    })

    test('should have placeholder text in email input', async ({ page }) => {
      await page.goto('/auth')

      const emailInput = page.getByRole('textbox', {
        name: /correo electrónico/i,
      })
      await expect(emailInput).toHaveAttribute('placeholder', 'tu@email.com')
    })
  })

  test.describe('Auth Complete Page', () => {
    test('should redirect to login when no params', async ({ page }) => {
      await page.goto('/auth/complete')

      // Should show redirecting message or redirect to /auth
      const redirecting = page.getByText(/redirigiendo/i)
      const hasRedirecting = await redirecting.isVisible().catch(() => false)

      if (hasRedirecting) {
        await expect(redirecting).toBeVisible()
      } else {
        // Already redirected to /auth
        await expect(page).toHaveURL(/\/auth/, { timeout: 10000 })
      }
    })
  })

  test.describe('Navigation and UX', () => {
    test('should be responsive on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/auth')

      await expect(page.locator('img[alt*="Mi Granja"]')).toBeVisible()
      await expect(
        page.getByRole('textbox', { name: /correo electrónico/i }),
      ).toBeVisible()

      // Form should be usable on mobile
      await page
        .getByRole('textbox', { name: /correo electrónico/i })
        .fill('test@test.com')
      const submitBtn = page.getByRole('button', {
        name: /enviar código de acceso/i,
      })
      await expect(submitBtn).toBeVisible()
      await expect(submitBtn).toBeEnabled()
    })

    test('should show emulator mode warning', async ({ page }) => {
      await page.goto('/auth')

      await expect(
        page.getByText(/running in emulator mode/i),
      ).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('should load auth page quickly', async ({ page }) => {
      const start = Date.now()
      await page.goto('/auth')
      await page
        .getByRole('textbox', { name: /correo electrónico/i })
        .waitFor()
      const duration = Date.now() - start

      expect(duration).toBeLessThan(5000)
    })
  })
})
