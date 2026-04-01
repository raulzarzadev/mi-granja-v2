import { expect } from '@playwright/test'

/**
 * Login en emulador usando el flujo OTP.
 * El AuthForm auto-rellena y auto-verifica el código en modo emulador.
 * Si falla el auto-verify, interceptamos el devCode y lo completamos manualmente.
 */
export async function login(page: import('@playwright/test').Page, email = 'admin@migranja.com') {
  // Interceptar la respuesta de send-code para obtener devCode
  let devCode: string | null = null
  await page.route('**/api/auth/send-code', async (route) => {
    const response = await route.fetch()
    const body = await response.json()
    devCode = body.devCode || null
    await route.fulfill({ response })
  })

  // Ir a /auth y enviar código
  await page.goto('/auth')
  await page.getByRole('textbox', { name: /correo electrónico/i }).fill(email)
  await page.getByRole('button', { name: /enviar código/i }).click()

  // Esperar a que el auto-verify complete (el AuthForm lo hace en 300ms)
  // Dar suficiente tiempo para que el flujo completo funcione
  try {
    await expect(page).not.toHaveURL(/\/auth/, { timeout: 10000 })
  } catch {
    // Si el auto-verify no funcionó, intentar manualmente con el devCode
    if (devCode) {
      const otpInputs = page.locator('input[inputmode="numeric"]')
      const otpCount = await otpInputs.count()

      if (otpCount > 0) {
        const digits = devCode.split('')
        for (let i = 0; i < Math.min(digits.length, otpCount); i++) {
          await otpInputs.nth(i).fill(digits[i])
        }

        const verifyBtn = page.getByRole('button', { name: /verificar/i })
        if (await verifyBtn.isVisible().catch(() => false)) {
          await verifyBtn.click()
        }
      }
    }

    await expect(page).not.toHaveURL(/\/auth/, { timeout: 15000 })
  }

  await expect(page.getByRole('tab', { name: /Animales/ })).toBeVisible({
    timeout: 10000,
  })
}
