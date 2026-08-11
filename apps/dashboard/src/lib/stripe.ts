import Stripe from 'stripe'
import { getTierById, PLAN_TIERS, type PlanTier, type PlanTierId } from '@/types/billing'

let stripeClient: Stripe | null = null

/** Cliente de Stripe (lazy). Lanza si falta STRIPE_SECRET_KEY. */
export function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY no configurada')
    }
    stripeClient = new Stripe(secretKey, { apiVersion: '2026-07-29.dahlia' })
  }
  return stripeClient
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

/** Price id de Stripe para un tier. `null` si el tier no es de pago o no esta configurado. */
export function getStripePriceId(
  tierId: PlanTierId,
  tiers: PlanTier[] = PLAN_TIERS,
): string | null {
  const tier = getTierById(tierId, tiers)
  if (tier.stripePriceId) return tier.stripePriceId
  if (!tier.stripePriceEnv) return null
  return process.env[tier.stripePriceEnv] ?? null
}

/** Tier al que corresponde un price id de Stripe (para el webhook). */
export function getTierByStripePriceId(
  priceId: string | null | undefined,
  tiers: PlanTier[] = PLAN_TIERS,
): PlanTier | null {
  if (!priceId) return null
  return (
    tiers.find(
      (tier) =>
        tier.stripePriceId === priceId ||
        (tier.stripePriceEnv && process.env[tier.stripePriceEnv] === priceId),
    ) ?? null
  )
}

/** Mapea un estado de Stripe a nuestro SubscriptionStatus */
export function mapStripeStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case 'active':
      return 'active' as const
    case 'trialing':
      return 'trialing' as const
    case 'past_due':
    case 'unpaid':
      return 'past_due' as const
    case 'canceled':
    case 'paused':
      return 'canceled' as const
    default:
      return 'incomplete' as const
  }
}
