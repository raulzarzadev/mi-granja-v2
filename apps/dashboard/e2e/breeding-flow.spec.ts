import { expect, test } from '@playwright/test'
import { login } from './helpers'

/**
 * E2E: Flujo de monta → confirmar embarazo → partos próximos
 *
 * Prerequisitos:
 *   - Emuladores Firebase corriendo (pnpm emulators)
 *   - Dashboard corriendo con emuladores
 *   - Al menos 1 monta activa con hembras pendientes de embarazo
 *
 * El test trabaja con datos existentes — no crea montas nuevas
 * para evitar problemas de IDs duplicados entre ejecuciones.
 */

// Helper: navegar a Etapas
async function goToEtapas(page: import('@playwright/test').Page) {
  await page.getByRole('tab', { name: /Animales/ }).click()
  await page.getByText('Etapas').click()
}

test.describe('Monta → Embarazo → Partos próximos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('confirmar embarazo en monta existente y verificar en partos próximos', async ({ page }) => {
    await goToEtapas(page)
    await page.getByText('Monta').first().click()

    // Debe haber al menos una monta en la tabla
    const montaTable = page.locator('table')
    await expect(montaTable).toBeVisible({ timeout: 5000 })

    // Buscar una monta con hembras pendientes (badge "pend")
    const pendRow = montaTable.locator('tr', { hasText: /pend/ }).first()
    const hasPending = (await pendRow.count()) > 0

    if (!hasPending) {
      test.skip()
      return
    }

    // Click en "Embarazo" de esa monta
    const embarazoBtn = pendRow.getByRole('button', { name: /embarazo/i })
    await embarazoBtn.click()

    // Modal de confirmar embarazo
    await expect(page.getByText(/Confirmar Embarazo/i)).toBeVisible({ timeout: 5000 })

    // Esperar el modal de confirmar embarazo
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog.getByText(/Confirmar Embarazo/i)).toBeVisible({ timeout: 5000 })

    // Click en el div de la primera hembra para toggle selección
    // Usar evaluate para disparar el click directamente en el DOM
    const femaleCard = dialog.locator('div.rounded-md.border').first()
    await femaleCard.evaluate((el) => el.click())

    // Esperar a que el botón submit se habilite
    const confirmBtn = dialog.locator('button[type="submit"]')
    await expect(confirmBtn).toContainText(/confirmar/i, { timeout: 3000 })
    await confirmBtn.evaluate((el) => (el as HTMLButtonElement).click())
    await page.waitForTimeout(1500)

    // ── Verificar en Partos Próximos ──
    await page.getByText('Partos próximos').click()
    await page.waitForTimeout(1000)

    const partosTable = page.locator('table')
    await expect(partosTable).toBeVisible({ timeout: 5000 })

    // La tabla debe tener al menos una fila
    const rowCount = await partosTable.locator('tbody tr').count()
    expect(rowCount).toBeGreaterThan(0)

    // La primera fila debe tener fecha de parto esperado (no "—")
    const partoText = await partosTable
      .locator('tbody tr')
      .first()
      .locator('td')
      .nth(2)
      .textContent()
    expect(partoText).not.toBe('—')
    expect(partoText).toMatch(/\d/)
  })

  test('hembras en partos próximos excluidas de Reproducción', async ({ page }) => {
    await goToEtapas(page)

    // Recoger números de partos próximos
    await page.getByText('Partos próximos').click()
    await page.waitForTimeout(1000)

    const rows = page.locator('table tbody tr')
    const count = await rows.count()

    if (count === 0) {
      test.skip()
      return
    }

    const pregnantNumbers: string[] = []
    for (let i = 0; i < count; i++) {
      const cell = await rows.nth(i).locator('td').first().textContent()
      if (cell && cell.trim() !== '—') {
        pregnantNumbers.push(cell.trim())
      }
    }

    if (pregnantNumbers.length === 0) {
      test.skip()
      return
    }

    // Ir a Reproducción — ninguna embarazada debe aparecer
    await page.getByText('Reproducción').click()
    await page.waitForTimeout(500)

    if ((await page.locator('table').count()) > 0) {
      for (const num of pregnantNumbers) {
        await expect(page.locator('table')).not.toContainText(num)
      }
    }
  })

  test('hembras en partos próximos excluidas de Juvenil y Engorda', async ({ page }) => {
    await goToEtapas(page)

    // Recoger números de partos próximos
    await page.getByText('Partos próximos').click()
    await page.waitForTimeout(1000)

    const rows = page.locator('table tbody tr')
    const count = await rows.count()

    if (count === 0) {
      test.skip()
      return
    }

    const pregnantNumbers: string[] = []
    for (let i = 0; i < Math.min(count, 5); i++) {
      const cell = await rows.nth(i).locator('td').first().textContent()
      if (cell && cell.trim() !== '—') {
        pregnantNumbers.push(cell.trim())
      }
    }

    if (pregnantNumbers.length === 0) {
      test.skip()
      return
    }

    // Verificar Juvenil
    await page.getByText('Juvenil').first().click()
    await page.waitForTimeout(500)

    if ((await page.locator('table').count()) > 0) {
      for (const num of pregnantNumbers) {
        await expect(page.locator('table')).not.toContainText(num)
      }
    }

    // Verificar Engorda
    await page.getByText('Engorda').first().click()
    await page.waitForTimeout(500)

    if ((await page.locator('table').count()) > 0) {
      for (const num of pregnantNumbers) {
        await expect(page.locator('table')).not.toContainText(num)
      }
    }
  })

  test('fecha de parto esperado contiene dígitos válidos', async ({ page }) => {
    await goToEtapas(page)
    await page.getByText('Partos próximos').click()
    await page.waitForTimeout(1000)

    const rows = page.locator('table tbody tr')
    const count = await rows.count()

    if (count === 0) {
      test.skip()
      return
    }

    // Verificar que cada fila tiene fecha válida en columna de parto esperado
    for (let i = 0; i < Math.min(count, 10); i++) {
      const partoText = await rows.nth(i).locator('td').nth(2).textContent()
      // Debe ser una fecha (contiene dígitos) o "—" si no hay monta asociada
      if (partoText && partoText !== '—') {
        expect(partoText).toMatch(/\d{1,2}/)
      }
    }
  })
})
