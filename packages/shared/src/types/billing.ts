import type { AppDate } from './date'

// --- Enums y constantes ---

/** Estados de suscripcion (espejo de los estados de Stripe que nos interesan) */
export type SubscriptionStatus =
  | 'none' // Sin suscripcion (plan gratuito)
  | 'active' // Suscripcion pagada y al corriente
  | 'trialing' // Periodo de prueba
  | 'past_due' // Pago fallido, aun con acceso
  | 'canceled' // Cancelada (o terminada)
  | 'incomplete' // Checkout iniciado sin completar pago

/** Estados que otorgan acceso de pago */
export const PAID_STATUSES: SubscriptionStatus[] = ['active', 'trialing', 'past_due']

/**
 * Tipo de plan derivado. Se conserva para las compuertas de features existentes:
 * cualquier tier de pago se expone como 'pro'.
 */
export type PlanType = 'free' | 'pro'

/** Identificadores de los niveles de precio por cantidad de animales */
export const PLAN_TIER_IDS = ['free', 'inicial', 'basico', 'pro', 'rancho', 'empresarial'] as const

export type PlanTierId = (typeof PLAN_TIER_IDS)[number]

export interface PlanTier {
  id: PlanTierId
  label: string
  /** Minimo de animales que cubre el tier (inclusivo) */
  minAnimals: number
  /** Maximo de animales que cubre el tier (inclusivo). `null` = ilimitado */
  maxAnimals: number | null
  /** Precio mensual en USD. `null` = precio a convenir (contactar) */
  priceUsd: number | null
  /** Nombre de la variable de entorno con el price id de Stripe */
  stripePriceEnv: string | null
  /** Price ID persistido. Tiene prioridad sobre la variable de entorno. */
  stripePriceId?: string | null
  description: string
}

/**
 * Escalera de precios. El cobro depende UNICAMENTE de la cantidad de animales
 * activos del usuario (granjas y colaboradores no se cobran aparte).
 */
export const PLAN_TIERS: PlanTier[] = [
  {
    id: 'free',
    label: 'Gratis',
    minAnimals: 0,
    maxAnimals: 10,
    priceUsd: 0,
    stripePriceEnv: null,
    description: 'Hasta 10 animales',
  },
  {
    id: 'inicial',
    label: 'Inicial',
    minAnimals: 11,
    maxAnimals: 50,
    priceUsd: 2.5,
    stripePriceEnv: 'STRIPE_PRICE_INICIAL',
    description: 'De 11 a 50 animales',
  },
  {
    id: 'basico',
    label: 'Basico',
    minAnimals: 51,
    maxAnimals: 100,
    priceUsd: 5,
    stripePriceEnv: 'STRIPE_PRICE_BASICO',
    description: 'De 51 a 100 animales',
  },
  {
    id: 'pro',
    label: 'Pro',
    minAnimals: 101,
    maxAnimals: 500,
    priceUsd: 20,
    stripePriceEnv: 'STRIPE_PRICE_PRO',
    description: 'De 101 a 500 animales',
  },
  {
    id: 'rancho',
    label: 'Rancho',
    minAnimals: 501,
    maxAnimals: 1000,
    priceUsd: 40,
    stripePriceEnv: 'STRIPE_PRICE_RANCHO',
    description: 'De 501 a 1000 animales',
  },
  {
    id: 'empresarial',
    label: 'Empresarial',
    minAnimals: 1001,
    maxAnimals: null,
    priceUsd: null,
    stripePriceEnv: null,
    description: 'Mas de 1000 animales — precio a convenir',
  },
]

export const FREE_TIER = PLAN_TIERS[0]

/** Limite de animales del plan gratuito */
export const FREE_ANIMAL_LIMIT = FREE_TIER.maxAnimals as number

// --- Interfaces principales ---

export interface BillingSubscription {
  id: string
  userId: string
  status: SubscriptionStatus
  planType: PlanType
  /** Tier contratado (el que el usuario paga, no el que su inventario exige) */
  tierId: PlanTierId

  // Stripe
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  stripePriceId?: string | null
  currentPeriodEnd?: AppDate | null
  cancelAtPeriodEnd?: boolean

  createdAt: AppDate
  updatedAt: AppDate
}

export interface BillingUsage {
  /** Animales activos contabilizados para el cobro */
  animalCount: number
  farmCount: number
  collaboratorCount: number
  /** Tier contratado actualmente */
  currentTierId: PlanTierId
  /** Tier que corresponde al inventario actual */
  requiredTierId: PlanTierId
  /** Maximo de animales permitidos por el tier contratado (`null` = ilimitado) */
  animalLimit: number | null
  /** Configuracion vigente de planes usada para calcular este uso */
  tiers: PlanTier[]
}

// --- Helpers ---

export function getTierById(id: PlanTierId, tiers: PlanTier[] = PLAN_TIERS): PlanTier {
  return tiers.find((t) => t.id === id) ?? tiers[0] ?? FREE_TIER
}

/** Tier minimo que cubre `animalCount` animales */
export function getTierForAnimalCount(
  animalCount: number,
  tiers: PlanTier[] = PLAN_TIERS,
): PlanTier {
  const safeCount = Number.isFinite(animalCount) && animalCount > 0 ? Math.floor(animalCount) : 0
  return (
    tiers.find(
      (t) => safeCount >= t.minAnimals && (t.maxAnimals === null || safeCount <= t.maxAnimals),
    ) ??
    tiers[tiers.length - 1] ??
    FREE_TIER
  )
}

/** Precio mensual en USD para una cantidad de animales (`null` = a convenir) */
export function getPriceForAnimalCount(
  animalCount: number,
  tiers: PlanTier[] = PLAN_TIERS,
): number | null {
  return getTierForAnimalCount(animalCount, tiers).priceUsd
}

export function isPaidTier(tierId: PlanTierId): boolean {
  return tierId !== 'free'
}

export function planTypeForTier(tierId: PlanTierId): PlanType {
  return isPaidTier(tierId) ? 'pro' : 'free'
}

/** Animales restantes antes de rebasar el tier contratado (`null` = ilimitado) */
export function animalsRemaining(usage: BillingUsage): number | null {
  if (usage.animalLimit === null) return null
  return Math.max(0, usage.animalLimit - usage.animalCount)
}

/** El inventario rebasa lo contratado */
export function isOverLimit(usage: BillingUsage): boolean {
  if (usage.animalLimit === null) return false
  return usage.animalCount > usage.animalLimit
}

/** Puede registrar `count` animales mas sin rebasar el tier contratado */
export function canAddAnimals(usage: BillingUsage, count = 1): boolean {
  if (usage.animalLimit === null) return true
  return usage.animalCount + count <= usage.animalLimit
}
