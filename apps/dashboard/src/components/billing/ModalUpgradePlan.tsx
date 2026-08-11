'use client'

import { useState } from 'react'
import { useBilling } from '@/hooks/useBilling'
import { PAID_STATUSES, type PlanTierId } from '@/types/billing'
import { Modal } from '../Modal'
import { PlanTierCards } from './PlanTierCards'

export interface ModalUpgradePlanProps {
  isOpen: boolean
  onClose: () => void
}

export default function ModalUpgradePlan({ isOpen, onClose }: ModalUpgradePlanProps) {
  const { usage, subscription, startCheckout, openBillingPortal } = useBilling()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentTierId = usage?.currentTierId ?? subscription?.tierId ?? 'free'
  const hasPaidSubscription = Boolean(
    subscription?.stripeSubscriptionId &&
      subscription.status &&
      PAID_STATUSES.includes(subscription.status),
  )

  async function handleSelect(tierId: PlanTierId) {
    if (tierId === 'empresarial') {
      window.location.assign('mailto:hola@migranja.app?subject=Plan Empresarial Mi Granja')
      return
    }
    if (tierId === 'free' && !hasPaidSubscription) {
      window.location.assign('mailto:hola@migranja.app?subject=Cambiar al plan Gratis')
      return
    }
    setError(null)
    setIsRedirecting(true)
    try {
      if (hasPaidSubscription) await openBillingPortal()
      else await startCheckout(tierId)
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'No se pudo abrir Stripe')
      setIsRedirecting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Elige tu plan" size="xl">
      <div className="space-y-4 pb-2">
        <p className="text-sm text-gray-600">
          El precio depende únicamente de tus animales activos. Puedes crear granjas e invitar
          colaboradores sin costo adicional.
        </p>
        <PlanTierCards
          currentTierId={currentTierId}
          requiredTierId={usage?.requiredTierId}
          tiers={usage?.tiers}
          isLoading={isRedirecting}
          onSelect={handleSelect}
        />
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
