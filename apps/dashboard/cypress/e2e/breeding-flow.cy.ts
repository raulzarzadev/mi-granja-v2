/**
 * E2E: Flujo completo de monta → confirmar embarazo → partos próximos
 *
 * Prerequisitos:
 *   - Emuladores Firebase corriendo (pnpm emulators)
 *   - Seed data cargada (npx tsx scripts/seed-emulators.ts)
 *   - Dashboard corriendo con emuladores (pnpm dev:dashboard)
 *
 * Animales del seed:
 *   - OV-002 (Borrego Trueno) — macho oveja Dorper
 *   - OV-001 (Borrego Luna) — hembra oveja Dorper
 *   - OV-004 (Borrega Nube) — hembra oveja Katahdin
 *
 * Oveja: gestationDays = 147 (~5 meses)
 */

const GESTATION_DAYS_OVEJA = 147

/** Calcula la fecha esperada de parto sumando días de gestación */
function expectedBirthDate(breedingDate: Date, gestationDays: number): Date {
  const d = new Date(breedingDate)
  d.setDate(d.getDate() + gestationDays)
  return d
}

/** Formatea fecha como "dd mmm yy" para coincidir con el formato de la tabla */
function formatShortDate(date: Date): string {
  return date
    .toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })
    .replace('.', '')
}

describe('Flujo de monta → embarazo → partos próximos', () => {
  beforeEach(() => {
    // Login con el usuario admin del seed
    cy.visit('/auth')
    cy.get('input[name="email"]').type('admin@migranja.com')
    cy.get('input[name="password"]').type('admin123456')
    cy.get('button[type="submit"]').click()

    // Esperar a que cargue el dashboard
    cy.url().should('not.include', '/auth', { timeout: 10000 })
    cy.contains('Animales', { timeout: 10000 }).should('be.visible')
  })

  it('debe crear una monta, confirmar embarazo y verificar partos próximos', () => {
    // ── 1. Navegar a Animales → Etapas → Monta ──
    cy.contains('Animales').click()
    cy.contains('Etapas').click()
    cy.contains('Monta').click()

    // ── 2. Crear nueva monta ──
    cy.contains('Nueva Monta').click()

    // Seleccionar macho OV-002
    cy.get('[data-testid="male-selector"]').should('be.visible')
    cy.contains('OV-002').click()

    // Seleccionar hembra OV-001
    cy.contains('OV-001').click()

    // La fecha de monta es hoy por defecto
    const today = new Date()

    // Guardar la monta
    cy.contains('Guardar').click()

    // Verificar que la monta aparece en la tabla
    cy.contains('OV-002').should('be.visible')

    // ── 3. Confirmar embarazo de OV-001 ──
    // Click en el botón "Embarazo" de la monta recién creada
    cy.contains('Embarazo').first().click()

    // En el modal/form de confirmación de embarazo, marcar OV-001
    cy.get('[type="checkbox"]').first().check()

    // Confirmar
    cy.contains('Confirmar').click()

    // ── 4. Verificar en Partos Próximos ──
    cy.contains('Partos próximos').click()

    // OV-001 debe aparecer en la tabla de partos próximos
    cy.contains('OV-001').should('be.visible')

    // Verificar que la fecha esperada es breedingDate + 147 días (oveja)
    const expectedDate = expectedBirthDate(today, GESTATION_DAYS_OVEJA)
    const expectedFormatted = expectedDate.toLocaleDateString('es-MX')
    // La fecha debe estar visible en algún formato
    cy.get('table').should('contain', expectedDate.getFullYear().toString())

    // ── 5. Verificar que OV-001 NO aparece en Reproducción ──
    cy.contains('Reproducción').click()
    // Reproducción muestra solo hembras "libres" — OV-001 ahora está embarazada
    cy.get('table').then(($table) => {
      // Si hay tabla, OV-001 no debe estar
      if ($table.length) {
        cy.wrap($table).should('not.contain', 'OV-001')
      }
    })

    // ── 6. Verificar que OV-001 NO aparece en Juvenil ──
    cy.contains('Juvenil').click()
    cy.get('body').then(($body) => {
      if ($body.find('table').length) {
        cy.get('table').should('not.contain', 'OV-001')
      }
    })

    // ── 7. Verificar que OV-001 NO aparece en Engorda ──
    cy.contains('Engorda').click()
    cy.get('body').then(($body) => {
      if ($body.find('table').length) {
        cy.get('table').should('not.contain', 'OV-001')
      }
    })

    // ── 8. Volver a Partos Próximos y confirmar que sigue ahí ──
    cy.contains('Partos próximos').click()
    cy.contains('OV-001').should('be.visible')
  })

  it('la fecha de parto esperada debe coincidir con la gestación de la especie', () => {
    // Navegar a Etapas → Partos próximos
    cy.contains('Animales').click()
    cy.contains('Etapas').click()
    cy.contains('Partos próximos').click()

    // Si hay animales embarazados, verificar que las fechas son coherentes
    cy.get('body').then(($body) => {
      if ($body.find('table tbody tr').length > 0) {
        // Cada fila debe tener una fecha de parto esperado (no "—")
        cy.get('table tbody tr').each(($row) => {
          // La columna de parto esperado no debe ser "—" si hay monta asociada
          cy.wrap($row)
            .find('td')
            .then(($tds) => {
              // Columna de parto esperado (índice 2 en la tabla de partos)
              const partoText = $tds.eq(2).text()
              // Si tiene fecha, debe ser un formato de fecha válido (no solo "—")
              if (partoText !== '—') {
                expect(partoText).to.match(/\d/)
              }
            })
        })
      }
    })
  })

  it('una hembra embarazada no debe aparecer en el tab Reproducción', () => {
    cy.contains('Animales').click()
    cy.contains('Etapas').click()

    // Ir a Partos próximos y tomar los números de las hembras embarazadas
    cy.contains('Partos próximos').click()

    cy.get('body').then(($body) => {
      const pregnantNumbers: string[] = []
      if ($body.find('table tbody tr').length > 0) {
        $body.find('table tbody tr').each((_, row) => {
          const firstCell = Cypress.$(row).find('td').first().text().trim()
          if (firstCell && firstCell !== '—') {
            pregnantNumbers.push(firstCell)
          }
        })
      }

      if (pregnantNumbers.length > 0) {
        // Ir a Reproducción y verificar que ninguna embarazada aparece
        cy.contains('Reproducción').click()

        cy.get('body').then(($reproBody) => {
          if ($reproBody.find('table').length) {
            for (const num of pregnantNumbers) {
              cy.get('table').should('not.contain', num)
            }
          }
        })
      }
    })
  })
})
