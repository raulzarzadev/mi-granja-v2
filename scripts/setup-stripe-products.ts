/**
 * Script one-time: Crea los productos y precios de MiGranja en Stripe.
 *
 * Uso:
 *   npx tsx scripts/setup-stripe-products.ts
 *
 * Requiere STRIPE_SECRET_KEY en apps/dashboard/.env.local
 * (o como variable de entorno).
 *
 * Al terminar imprime los Price IDs para pegar en .env.local
 */

import Stripe from 'stripe'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Cargar .env.local del dashboard
function loadEnv() {
  const envPath = resolve(__dirname, '../apps/dashboard/.env.local')
  try {
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx)
      const val = trimmed.slice(eqIdx + 1)
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  } catch {
    // .env.local no encontrado, confiar en env vars del sistema
  }
}

loadEnv()

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) {
  console.error('❌ STRIPE_SECRET_KEY no encontrada. Agrégala a apps/dashboard/.env.local')
  process.exit(1)
}

const stripe = new Stripe(secretKey)

// Precios en centavos MXN
const PRICES = {
  farmMonthly: 25000, // $250 MXN/mes
  farmAnnual: 249600, // $2,496 MXN/año (~$208/mes, 17% descuento)
  collaboratorMonthly: 25000, // $250 MXN/mes
  collaboratorAnnual: 249600, // $2,496 MXN/año (~$208/mes, 17% descuento)
}

async function main() {
  console.log('🚜 Creando productos y precios en Stripe...\n')

  // --- Producto 1: Granja Adicional ---
  const farmProduct = await stripe.products.create({
    name: 'Granja Adicional',
    description: 'Granja adicional para tu cuenta de MiGranja',
    metadata: { app: 'migranja', type: 'farm' },
  })
  console.log(`✅ Producto: ${farmProduct.name} (${farmProduct.id})`)

  const farmMonthlyPrice = await stripe.prices.create({
    product: farmProduct.id,
    unit_amount: PRICES.farmMonthly,
    currency: 'mxn',
    recurring: { interval: 'month' },
    metadata: { app: 'migranja', type: 'farm', interval: 'month' },
  })
  console.log(`   Mensual: ${farmMonthlyPrice.id} → $${PRICES.farmMonthly / 100} MXN/mes`)

  const farmAnnualPrice = await stripe.prices.create({
    product: farmProduct.id,
    unit_amount: PRICES.farmAnnual,
    currency: 'mxn',
    recurring: { interval: 'year' },
    metadata: { app: 'migranja', type: 'farm', interval: 'year' },
  })
  console.log(`   Anual:   ${farmAnnualPrice.id} → $${PRICES.farmAnnual / 100} MXN/año`)

  // --- Producto 2: Colaborador Adicional ---
  const collabProduct = await stripe.products.create({
    name: 'Colaborador Adicional',
    description: 'Colaborador adicional para tu cuenta de MiGranja',
    metadata: { app: 'migranja', type: 'collaborator' },
  })
  console.log(`\n✅ Producto: ${collabProduct.name} (${collabProduct.id})`)

  const collabMonthlyPrice = await stripe.prices.create({
    product: collabProduct.id,
    unit_amount: PRICES.collaboratorMonthly,
    currency: 'mxn',
    recurring: { interval: 'month' },
    metadata: { app: 'migranja', type: 'collaborator', interval: 'month' },
  })
  console.log(`   Mensual: ${collabMonthlyPrice.id} → $${PRICES.collaboratorMonthly / 100} MXN/mes`)

  const collabAnnualPrice = await stripe.prices.create({
    product: collabProduct.id,
    unit_amount: PRICES.collaboratorAnnual,
    currency: 'mxn',
    recurring: { interval: 'year' },
    metadata: { app: 'migranja', type: 'collaborator', interval: 'year' },
  })
  console.log(`   Anual:   ${collabAnnualPrice.id} → $${PRICES.collaboratorAnnual / 100} MXN/año`)

  // --- Resumen para .env.local ---
  console.log('\n' + '='.repeat(60))
  console.log('Pega esto en apps/dashboard/.env.local:')
  console.log('='.repeat(60))
  console.log(
    `
# Stripe Price IDs (test mode — MXN)
STRIPE_FARM_PRICE_ID=${farmMonthlyPrice.id}
STRIPE_COLLABORATOR_PRICE_ID=${collabMonthlyPrice.id}
STRIPE_FARM_ANNUAL_PRICE_ID=${farmAnnualPrice.id}
STRIPE_COLLABORATOR_ANNUAL_PRICE_ID=${collabAnnualPrice.id}
`.trim(),
  )
  console.log('='.repeat(60))
}

main().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
