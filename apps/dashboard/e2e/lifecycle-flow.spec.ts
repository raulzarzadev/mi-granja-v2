import { expect, test } from '@playwright/test'
import { login } from './helpers'

/**
 * E2E: Ciclo de vida completo de una borrega
 *
 * 1. Crear borrega reproductora (hembra oveja)
 * 2. Crear monta (macho + la borrega) con embarazo confirmado
 * 3. Verificar en partos próximos
 * 4. Registrar parto con 1 cría
 * 5. Verificar cría en destetes próximos
 * 6. Destetar la cría a engorda
 *
 * Prerequisitos:
 *   - Emuladores Firebase corriendo
 *   - Dashboard corriendo con emuladores
 */

// IDs únicos para evitar colisiones entre ejecuciones
const ANIMAL_ID = `E2E-${Date.now().toString(36).slice(-4).toUpperCase()}`
const CRIA_ID = `${ANIMAL_ID}-C1`

test.describe('Ciclo de vida completo: borrega → monta → embarazo → parto → destete', () => {
  test.setTimeout(120000)

  test('flujo completo de vida reproductiva', async ({ page }) => {
    await login(page)

    // ── 1. CREAR BORREGA REPRODUCTORA ──────────────────────────
    await page.getByRole('button', { name: /registrar animal/i }).click()
    await expect(
      page.getByRole('heading', { name: /registrar nuevo animal/i }),
    ).toBeVisible()

    await page.getByRole('textbox', { name: /id del animal/i }).fill(ANIMAL_ID)
    await page.getByRole('textbox', { name: /nombre/i }).fill('E2E Borrega')
    // Especie: Oveja (default)
    await page.getByRole('button', { name: /reproductor/i }).click()
    await page.getByRole('combobox', { name: /género/i }).selectOption('hembra')
    await page.getByRole('textbox', { name: /peso/i }).fill('35')
    await page.getByRole('spinbutton', { name: /edad/i }).fill('12')

    await page.getByRole('button', { name: /^registrar$/i }).click()

    // Debe volver al dashboard
    await expect(page.getByRole('tab', { name: /animales/i })).toBeVisible({
      timeout: 10000,
    })

    // Verificar que el animal existe
    await page.getByRole('textbox', { name: /buscar/i }).fill(ANIMAL_ID)
    await page.waitForTimeout(500)
    await expect(page.getByText(ANIMAL_ID)).toBeVisible({ timeout: 5000 })
    await page.getByRole('textbox', { name: /buscar/i }).fill('')
    await page.waitForTimeout(300)

    // ── 2. CREAR MONTA CON EMBARAZO CONFIRMADO ─────────────────
    await page.getByRole('tab', { name: /etapas/i }).click()
    await page.getByRole('tab', { name: /monta/i }).click()
    await expect(page.getByRole('heading', { name: /montas/i })).toBeVisible()

    await page.getByRole('button', { name: /nueva monta/i }).click()
    await expect(
      page.getByRole('heading', { name: /registrar monta/i }),
    ).toBeVisible()

    // Cambiar ID de monta para evitar duplicados
    const montaIdInput = page.getByRole('textbox', { name: /id de monta/i })
    await montaIdInput.fill(`E2E-${Date.now().toString(36).slice(-6)}`)

    // Seleccionar macho
    await page.getByRole('combobox', { name: /buscar macho/i }).click()
    await page.getByRole('option').first().click()

    // Buscar y seleccionar nuestra borrega
    const femaleSearch = page.getByRole('combobox', { name: /buscar hembra/i })
    await expect(femaleSearch).toBeVisible({ timeout: 5000 })
    await femaleSearch.pressSequentially(ANIMAL_ID, { delay: 50 })
    await page.waitForTimeout(500)

    // Seleccionar del dropdown
    const femaleOption = page.getByRole('option').filter({ hasText: ANIMAL_ID })
    await expect(femaleOption).toBeVisible({ timeout: 3000 })
    await femaleOption.click()

    // Marcar "Embarazo confirmado"
    const embarazoCheckbox = page.getByRole('checkbox', {
      name: /embarazo confirmado/i,
    })
    await expect(embarazoCheckbox).toBeVisible({ timeout: 3000 })
    await embarazoCheckbox.check()

    // Registrar monta
    await page.getByRole('button', { name: /registrar monta/i }).click()
    await page.waitForTimeout(2000)

    // ── 3. VERIFICAR EN PARTOS PRÓXIMOS ────────────────────────
    // Navegar al dashboard → Etapas → Partos próximos
    await page.goto('/')
    await expect(page.getByRole('tab', { name: /animales/i })).toBeVisible({
      timeout: 10000,
    })
    await page.getByRole('tab', { name: /etapas/i }).click()
    await page.getByRole('tab', { name: /partos próximos/i }).click()
    await page.waitForTimeout(1000)

    // Buscar nuestra borrega con el campo de búsqueda
    const searchInput = page.getByRole('textbox', { name: /buscar/i })
    await searchInput.fill(ANIMAL_ID)
    await page.waitForTimeout(1000)

    // Nuestra borrega debe aparecer como embarazada
    await expect(page.getByText(ANIMAL_ID)).toBeVisible({ timeout: 5000 })

    // ── 4. REGISTRAR PARTO ─────────────────────────────────────
    const animalRow = page.locator('tr', { hasText: ANIMAL_ID })
    const partoBtn = animalRow.getByRole('button', { name: /parto/i })
    await expect(partoBtn).toBeVisible({ timeout: 3000 })
    await partoBtn.click()

    // Modal "Registrar Parto"
    const partoDialog = page.getByRole('dialog', { name: /registrar parto/i })
    await expect(partoDialog).toBeVisible({ timeout: 5000 })

    // Agregar una cría
    await partoDialog.getByRole('button', { name: /agregar cría/i }).click()

    // Modal "Agregar cría"
    await expect(
      page.getByRole('heading', { name: 'Agregar cría' }),
    ).toBeVisible({ timeout: 5000 })

    // Rellenar datos de la cría (usar los inputs del modal más reciente)
    await page.getByPlaceholder('Ej: OV-001').fill(CRIA_ID)
    await page.getByPlaceholder('0.0').fill('3.5')

    // Click "Agregar" (el botón verde del modal de cría)
    await page.getByRole('button', { name: /^agregar$/i }).click()
    await page.waitForTimeout(500)

    // Registrar el parto (debe mostrar "1 cría")
    const registrarPartoBtn = partoDialog.getByRole('button', {
      name: /registrar parto.*1/i,
    })
    await expect(registrarPartoBtn).toBeEnabled({ timeout: 3000 })
    await registrarPartoBtn.click()

    // Modal de éxito "Parto Registrado" — cerrar con "Aceptar"
    await expect(
      page.getByText('Parto registrado exitosamente'),
    ).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: /aceptar/i }).click()
    await page.waitForTimeout(1000)

    // ── 5. VERIFICAR CRÍA EN DESTETES PRÓXIMOS ─────────────────
    await page.getByRole('tab', { name: /destetes próximos/i }).click()
    await page.waitForTimeout(1000)

    await expect(page.getByText(CRIA_ID)).toBeVisible({ timeout: 5000 })

    // ── 6. DESTETAR LA CRÍA A ENGORDA ──────────────────────────
    const criaRow = page.locator('tr', { hasText: CRIA_ID })
    const engordaBtn = criaRow.getByRole('button', { name: /engorda/i })
    await expect(engordaBtn).toBeVisible({ timeout: 3000 })
    await engordaBtn.click()

    // Confirmar si hay diálogo de confirmación
    const confirmDialog = page.getByRole('dialog')
    if (await confirmDialog.isVisible().catch(() => false)) {
      const okBtn = confirmDialog.getByRole('button', {
        name: /confirmar|aceptar|sí|destetar/i,
      })
      if (await okBtn.isVisible().catch(() => false)) {
        await okBtn.click()
      }
    }
    await page.waitForTimeout(2000)

    // Cría ya no debe estar en destetes
    await expect(page.getByText(CRIA_ID)).not.toBeVisible({ timeout: 5000 })

    // ── 7. VERIFICAR CRÍA EN ENGORDA ───────────────────────────
    await page.getByRole('tab', { name: /engorda/i }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText(CRIA_ID)).toBeVisible({ timeout: 5000 })

    // ── 8. VERIFICAR AMBOS ANIMALES EN "TODOS" ─────────────────
    await page.getByRole('tab', { name: /todos/i }).first().click()
    await page.waitForTimeout(500)

    // Buscar la madre
    await page.getByRole('textbox', { name: /buscar/i }).fill(ANIMAL_ID)
    await page.waitForTimeout(500)
    await expect(page.getByText(ANIMAL_ID, { exact: true })).toBeVisible()

    // Buscar la cría
    await page.getByRole('textbox', { name: /buscar/i }).fill(CRIA_ID)
    await page.waitForTimeout(500)
    await expect(page.getByText(CRIA_ID)).toBeVisible()
  })
})
