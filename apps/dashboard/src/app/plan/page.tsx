'use client'

import { useState } from 'react'
import { PlanTierCards } from '@/components/billing/PlanTierCards'
import PageShell from '@/components/PageShell'
import { useBilling } from '@/hooks/useBilling'
import { getTierById, PAID_STATUSES, type PlanTierId } from '@/types/billing'

export default function PlanPage() {
  const { usage, subscription, startCheckout, openBillingPortal } = useBilling()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentTierId = usage?.currentTierId ?? subscription?.tierId ?? 'free'
  const currentTier = getTierById(currentTierId, usage?.tiers)
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

  async function handlePortal() {
    setError(null)
    setIsRedirecting(true)
    try {
      await openBillingPortal()
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : 'No se pudo abrir Stripe')
      setIsRedirecting(false)
    }
  }

  return (
    <PageShell title="Plan y facturación">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-500">Plan actual</p>
              <h2 className="text-2xl font-bold text-gray-900">{currentTier.label}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {usage?.animalCount ?? 0} animales activos · límite{' '}
                {usage?.animalLimit === null
                  ? 'ilimitado'
                  : (usage?.animalLimit ?? currentTier.maxAnimals)}
              </p>
            </div>
            {hasPaidSubscription && subscription?.stripeCustomerId && (
              <button
                type="button"
                disabled={isRedirecting}
                onClick={handlePortal}
                className="rounded-lg border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
              >
                Administrar pago y suscripción
              </button>
            )}
          </div>
          {usage && usage.requiredTierId !== usage.currentTierId && (
            <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Por tu inventario actual te corresponde el plan{' '}
              {getTierById(usage.requiredTierId, usage.tiers).label}.
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Planes por cantidad de animales
          </h2>
          <PlanTierCards
            currentTierId={currentTierId}
            requiredTierId={usage?.requiredTierId}
            tiers={usage?.tiers}
            isLoading={isRedirecting}
            onSelect={handleSelect}
          />
        </section>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <p className="text-center text-xs text-gray-500">
          Las granjas y colaboradores no generan cargos adicionales. Los pagos se procesan de forma
          segura con Stripe.
        </p>
      </div>
    </PageShell>
  )
}
