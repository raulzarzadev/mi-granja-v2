'use client'

import { getVisiblePlanTiers, type PlanTier, type PlanTierId } from '@/types/billing'

interface PlanTierCardsProps {
  currentTierId: PlanTierId
  requiredTierId?: PlanTierId
  tiers?: PlanTier[]
  isLoading?: boolean
  onSelect: (tierId: PlanTierId) => void
}

export function PlanTierCards({
  currentTierId,
  requiredTierId = 'free',
  tiers,
  isLoading = false,
  onSelect,
}: PlanTierCardsProps) {
  if (!tiers) {
    return (
      <div
        aria-busy="true"
        aria-label="Cargando planes disponibles"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-100 motion-reduce:animate-none"
          />
        ))}
      </div>
    )
  }

  const currentTierIndex = tiers.findIndex((tier) => tier.id === currentTierId)
  const requiredTierIndex = tiers.findIndex((tier) => tier.id === requiredTierId)
  const visibleTiers = getVisiblePlanTiers(tiers)

  if (visibleTiers.length === 0) {
    return (
      <p role="status" className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
        No hay planes disponibles por el momento.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visibleTiers.map((tier) => {
        const tierIndex = tiers.findIndex((candidate) => candidate.id === tier.id)
        const isCurrent = tier.id === currentTierId
        const isEnterprise = tier.id === 'empresarial'
        const isDowngrade = tierIndex < currentTierIndex
        const isBelowRequiredTier = tierIndex < requiredTierIndex
        const actionLabel = isBelowRequiredTier
          ? 'No cubre tu inventario'
          : isEnterprise
            ? 'Contactar'
            : tier.id === 'free'
              ? 'Cambiar a Gratis'
              : isDowngrade
                ? 'Bajar de plan'
                : 'Subir de plan'
        return (
          <article
            key={tier.id}
            className={`flex flex-col rounded-xl border p-4 ${
              isCurrent
                ? 'border-green-500 bg-green-50 ring-1 ring-green-500'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-900">{tier.label}</h3>
              {isCurrent && (
                <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                  Actual
                </span>
              )}
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {tier.priceUsd === null
                ? 'A convenir'
                : `$${tier.priceUsd.toLocaleString('en-US')} USD`}
            </p>
            <p className="text-xs text-gray-500">{tier.priceUsd ? 'por mes' : '\u00a0'}</p>
            <p className="mt-3 flex-1 text-sm text-gray-600">{tier.description}</p>
            {!isCurrent && (
              <button
                type="button"
                disabled={isLoading || isBelowRequiredTier}
                title={
                  isBelowRequiredTier
                    ? 'Este plan no admite la cantidad actual de animales'
                    : undefined
                }
                onClick={() => onSelect(tier.id)}
                className={`mt-4 min-h-11 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isDowngrade
                    ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {actionLabel}
              </button>
            )}
          </article>
        )
      })}
    </div>
  )
}
