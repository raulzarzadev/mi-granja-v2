import type { AppDate } from './date'

// --- Enums y constantes ---

export type SubscriptionStatus =
  | 'none' // Sin suscripción (plan gratuito)
  | 'active' // Suscripción activa
  | 'past_due' // Pago fallido, en periodo de gracia
  | 'suspended' // Suspendido por falta de pago
  | 'canceled' // Cancelado por el usuario

export type PlanType = 'free' | 'pro'

export type BillingInterval = 'month' | 'year'

export type PaymentProvider = 'stripe' | 'conekta' | 'mercadopago'

export type InvoiceStatus = 'paid' | 'pending' | 'failed' | 'refunded'

// --- Interfaces principales ---

export interface PlanLimits {
  maxFarms: number
  maxCollaboratorsPerFarm: number
}

export const FREE_PLAN_LIMITS: PlanLimits = {
  maxFarms: 1,
  maxCollaboratorsPerFarm: 0,
}

export const PAID_PLAN_LIMITS: PlanLimits = {
  maxFarms: Infinity,
  maxCollaboratorsPerFarm: Infinity,
}

/** Precios en centavos MXN */
export const BILLING_PRICES = {
  farmMonthly: 25000, // $250 MXN
  collaboratorMonthly: 25000, // $250 MXN
  farmAnnual: 250000, // $2,500 MXN (~17% descuento)
  collaboratorAnnual: 250000, // $2,500 MXN (~17% descuento)
} as const

export const GRACE_PERIOD_DAYS = 3

export interface BillingSubscription {
  id: string
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  status: SubscriptionStatus
  planType: PlanType
  interval: BillingInterval
  provider: PaymentProvider

  // Cantidades facturadas
  farmQuantity: number // granjas adicionales (total - 1)
  collaboratorQuantity: number // colaboradores totales

  // Stripe subscription item IDs para actualizar cantidades
  stripeFarmItemId?: string
  stripeCollaboratorItemId?: string

  // Periodo actual
  currentPeriodStart: AppDate
  currentPeriodEnd: AppDate

  // Periodo de gracia (cuando payment_failed)
  gracePeriodEnd?: AppDate

  // Monto mensual estimado en centavos MXN
  monthlyAmount: number

  cancelAtPeriodEnd: boolean
  canceledAt?: AppDate
  createdAt: AppDate
  updatedAt: AppDate
}

export interface BillingInvoice {
  id: string
  userId: string
  stripeInvoiceId: string
  amount: number // centavos MXN
  currency: string
  status: InvoiceStatus
  description?: string
  invoiceUrl?: string
  invoicePdf?: string
  periodStart: AppDate
  periodEnd: AppDate
  createdAt: AppDate
}

export interface BillingUsage {
  farmCount: number
  collaboratorCount: number
  limits: PlanLimits
}

/** Evento de Stripe procesado (para idempotencia) */
export interface StripeEvent {
  id: string // stripe event ID
  type: string
  processedAt: AppDate
}

// --- Helpers ---

export function getPlanLimits(planType: PlanType): PlanLimits {
  return planType === 'pro' ? PAID_PLAN_LIMITS : FREE_PLAN_LIMITS
}

export function computeActualLimits(
  planType: PlanType,
  subscription?: { farmQuantity: number; collaboratorQuantity: number } | null,
): PlanLimits {
  if (planType !== 'pro' || !subscription) return FREE_PLAN_LIMITS
  return {
    maxFarms: subscription.farmQuantity + 1,
    maxCollaboratorsPerFarm: subscription.collaboratorQuantity,
  }
}

export function canAddFarm(usage: BillingUsage): boolean {
  return usage.farmCount < usage.limits.maxFarms
}

export function canAddCollaborator(usage: BillingUsage): boolean {
  return usage.collaboratorCount < usage.limits.maxCollaboratorsPerFarm
}

export function calculateMonthlyTotal(
  extraFarms: number,
  extraCollaborators: number,
  interval: BillingInterval = 'month',
): number {
  const farmPrice =
    interval === 'year'
      ? Math.round(BILLING_PRICES.farmAnnual / 12)
      : BILLING_PRICES.farmMonthly
  const collabPrice =
    interval === 'year'
      ? Math.round(BILLING_PRICES.collaboratorAnnual / 12)
      : BILLING_PRICES.collaboratorMonthly
  return extraFarms * farmPrice + extraCollaborators * collabPrice
}

export function formatMXN(centavos: number): string {
  return `$${(centavos / 100).toLocaleString('es-MX')} MXN`
}
