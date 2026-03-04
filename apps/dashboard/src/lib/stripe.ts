import Stripe from 'stripe'

// Inicialización lazy para evitar error durante el build
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY no está configurada')
    }
    stripeInstance = new Stripe(key)
  }
  return stripeInstance
}

// IDs de precios configurados en Stripe Dashboard
export const STRIPE_PRICES = {
  farmMonthly: process.env.STRIPE_FARM_PRICE_ID ?? '',
  collaboratorMonthly: process.env.STRIPE_COLLABORATOR_PRICE_ID ?? '',
  farmAnnual: process.env.STRIPE_FARM_ANNUAL_PRICE_ID ?? '',
  collaboratorAnnual: process.env.STRIPE_COLLABORATOR_ANNUAL_PRICE_ID ?? '',
} as const
