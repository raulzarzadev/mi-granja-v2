'use client'

import { useState } from 'react'
import { useAppFeedback } from '@/components/AppFeedbackProvider'
import { PlanTierCards } from '@/components/billing/PlanTierCards'
import PageShell from '@/components/PageShell'
import { useBilling } from '@/hooks/useBilling'
import { getTierById, PAID_STATUSES, type PlanTierId } from '@/types/billing'

export default function PlanPage() {
  const { usage, subscription, startCheckout, openBillingPortal, setCancelAtPeriodEnd } =
    useBilling()
  const { confirmAction, notify } = useAppFeedback()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [isUpdatingCancellation, setIsUpdatingCancellation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentTierId = usage?.currentTierId ?? subscription?.tierId ?? 'free'
  const currentTier = getTierById(currentTierId, usage?.tiers)
  const hasPaidSubscription = Boolean(
    subscription?.stripeSubscriptionId &&
      subscription.status &&
      PAID_STATUSES.includes(subscription.status),
  )
  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd as string | number | Date)
    : null
  const periodEndLabel =
    periodEnd && !Number.isNaN(periodEnd.getTime())
      ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(periodEnd)
      : 'el final del periodo actual'

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

  async function handleCancelSubscription() {
    const confirmed = await confirmAction({
      title: 'Cancelar renovación del plan',
      message: `Tu plan ${currentTier.label} seguirá activo hasta ${periodEndLabel}. No habrá otro cobro y tus datos no se eliminarán.`,
      confirmLabel: 'Cancelar renovación',
      cancelLabel: 'Conservar mi plan',
      danger: true,
    })
    if (!confirmed) return

    setError(null)
    setIsUpdatingCancellation(true)
    try {
      await setCancelAtPeriodEnd(true)
      notify(`Cancelación programada. Tu plan seguirá activo hasta ${periodEndLabel}.`, 'success')
    } catch (cancelError) {
      setError(
        cancelError instanceof Error ? cancelError.message : 'No se pudo cancelar la renovación',
      )
    } finally {
      setIsUpdatingCancellation(false)
    }
  }

  async function handleKeepSubscription() {
    setError(null)
    setIsUpdatingCancellation(true)
    try {
      await setCancelAtPeriodEnd(false)
      notify('La renovación automática de tu plan quedó activa nuevamente.', 'success')
    } catch (renewError) {
      setError(
        renewError instanceof Error ? renewError.message : 'No se pudo reactivar la renovación',
      )
    } finally {
      setIsUpdatingCancellation(false)
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
              <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
                <button
                  type="button"
                  disabled={isRedirecting || isUpdatingCancellation}
                  onClick={handlePortal}
                  className="min-h-11 rounded-lg border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 transition-colors hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Administrar pago y suscripción
                </button>
                {!subscription.cancelAtPeriodEnd && (
                  <button
                    type="button"
                    disabled={isUpdatingCancellation || isRedirecting}
                    onClick={handleCancelSubscription}
                    className="min-h-11 rounded-lg px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdatingCancellation ? 'Programando…' : 'Cancelar al finalizar el periodo'}
                  </button>
                )}
              </div>
            )}
          </div>
          {hasPaidSubscription && subscription?.cancelAtPeriodEnd && (
            <div
              role="status"
              className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-amber-950">Cancelación programada</p>
                <p className="mt-1 text-sm leading-5 text-amber-900">
                  Mantendrás todas las funciones de {currentTier.label} hasta {periodEndLabel}.
                  Después pasarás al plan Gratis y no habrá otro cobro.
                </p>
              </div>
              <button
                type="button"
                disabled={isUpdatingCancellation || isRedirecting}
                onClick={handleKeepSubscription}
                className="min-h-11 shrink-0 rounded-lg border border-amber-700 bg-white px-4 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdatingCancellation ? 'Actualizando…' : 'Conservar mi plan'}
              </button>
            </div>
          )}
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
