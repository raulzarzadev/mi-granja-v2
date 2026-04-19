import type { AppDate } from './date'

// --- Enums y constantes ---

export type SubscriptionStatus =
  | 'none' // Sin suscripcion (plan gratuito)
  | 'active' // Lugares asignados por admin

export type PlanType = 'free' | 'pro'

/** Precio por lugar adicional (granja o colaborador) en MXN/mes */
export const PRICE_PER_PLACE_MXN = 255

// --- Interfaces principales ---

export interface BillingSubscription {
  id: string
  userId: string
  status: SubscriptionStatus
  planType: PlanType

  // Lugares asignados por admin (cada lugar = 1 granja extra O 1 colaborador)
  places: number

  createdAt: AppDate
  updatedAt: AppDate
}

export interface BillingUsage {
  farmCount: number
  collaboratorCount: number
  totalPlaces: number // lugares asignados
  usedPlaces: number // farmCount + collaboratorCount
}

// --- Helpers ---

export function computeUsedPlaces(farmCount: number, collaboratorCount: number): number {
  // Cada granja y cada colaborador consume un lugar
  return farmCount + collaboratorCount
}

export function canAddFarm(usage: BillingUsage): boolean {
  return usage.usedPlaces < usage.totalPlaces
}

export function canAddCollaborator(usage: BillingUsage): boolean {
  return usage.usedPlaces < usage.totalPlaces
}
