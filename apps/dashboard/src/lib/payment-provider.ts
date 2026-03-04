import type { BillingInterval } from '@/types/billing'

/**
 * Interfaz abstracta para proveedores de pago.
 * Permite pluggear Stripe, Conekta, MercadoPago, etc.
 */
export interface PaymentProvider {
  name: string
  displayName: string
  enabled: boolean

  createCheckoutSession(params: {
    userId: string
    email: string
    customerId?: string
    extraFarms: number
    extraCollaborators: number
    interval: BillingInterval
    successUrl: string
    cancelUrl: string
  }): Promise<{ url: string }>

  createPortalSession(params: {
    customerId: string
    returnUrl: string
  }): Promise<{ url: string }>
}

/** Proveedores disponibles con su estado actual */
export const PAYMENT_PROVIDERS: {
  id: string
  name: string
  enabled: boolean
  description: string
}[] = [
  {
    id: 'stripe',
    name: 'Tarjeta de credito/debito',
    enabled: true,
    description: 'Visa, Mastercard, AMEX via Stripe',
  },
  {
    id: 'conekta',
    name: 'OXXO / SPEI',
    enabled: false,
    description: 'Pago en efectivo o transferencia bancaria (proximamente)',
  },
  {
    id: 'mercadopago',
    name: 'MercadoPago',
    enabled: false,
    description: 'Cobertura LATAM (proximamente)',
  },
]
