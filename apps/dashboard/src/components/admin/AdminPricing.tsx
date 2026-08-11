'use client'

import { useCallback, useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { PLAN_TIERS, type PlanTier, type PlanTierId } from '@/types/billing'

interface AdminPricingProps {
  onTiersChange?: (tiers: PlanTier[]) => void
}

function recalculateRanges(tiers: PlanTier[]): PlanTier[] {
  let minAnimals = 0
  return tiers.map((tier, index) => {
    const maxAnimals = index === tiers.length - 1 ? null : tier.maxAnimals
    const description =
      maxAnimals === null
        ? `Mas de ${minAnimals - 1} animales — precio a convenir`
        : minAnimals === 0
          ? `Hasta ${maxAnimals} animales`
          : `De ${minAnimals} a ${maxAnimals} animales`
    const nextTier = { ...tier, minAnimals, maxAnimals, description }
    if (maxAnimals !== null) minAnimals = maxAnimals + 1
    return nextTier
  })
}

export default function AdminPricing({ onTiersChange }: AdminPricingProps) {
  const [tiers, setTiers] = useState<PlanTier[]>(PLAN_TIERS)
  const [savedTiers, setSavedTiers] = useState<PlanTier[]>(PLAN_TIERS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('La sesion de administrador no esta disponible')
      const response = await fetch('/api/admin/billing-config', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar la configuracion')
      setTiers(data.tiers)
      setSavedTiers(data.tiers)
      onTiersChange?.(data.tiers)
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'No se pudo cargar la configuracion',
      )
    } finally {
      setIsLoading(false)
    }
  }, [onTiersChange])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  function updateTier(tierId: PlanTierId, changes: Partial<PlanTier>) {
    setSuccess(null)
    setTiers((current) =>
      recalculateRanges(
        current.map((tier) => (tier.id === tierId ? { ...tier, ...changes } : tier)),
      ),
    )
  }

  async function handleSave() {
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('La sesion de administrador no esta disponible')
      const response = await fetch('/api/admin/billing-config', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tiers }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la configuracion')
      setTiers(data.tiers)
      setSavedTiers(data.tiers)
      onTiersChange?.(data.tiers)
      setSuccess('Planes, precios y limites actualizados correctamente.')
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'No se pudo guardar la configuracion',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <section aria-label="Cargando planes" className="space-y-3">
        <div className="h-20 animate-pulse rounded-xl bg-gray-200" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {PLAN_TIERS.map((tier) => (
            <div key={tier.id} className="h-64 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="pricing-admin-title" className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 id="pricing-admin-title" className="text-xl font-bold text-gray-900">
          Planes y precios
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          Define el nombre, capacidad y precio mensual de cada plan. Los rangos se mantienen
          consecutivos automáticamente para evitar huecos o traslapes.
        </p>
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          El Price ID determina el cobro real en Stripe. Si cambias un precio, registra también el
          nuevo Price ID antes de guardar.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-800">No se pudieron guardar los cambios</p>
          <p className="mt-0.5 text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {success}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tiers.map((tier, index) => {
          const isFree = tier.id === 'free'
          const isLast = index === tiers.length - 1
          return (
            <article
              key={tier.id}
              className={`rounded-xl border bg-white p-4 ${
                tier.isVisible ? 'border-gray-200' : 'border-gray-300 opacity-75'
              }`}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
                    {tier.id}
                  </span>
                  {!tier.isVisible && (
                    <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-700">
                      Oculto
                    </span>
                  )}
                </div>
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={tier.isVisible}
                    onChange={(event) => updateTier(tier.id, { isVisible: event.target.checked })}
                    className="h-5 w-5 rounded border-gray-300 text-green-700 focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
                  />
                  Visible
                </label>
              </div>

              <p className="mb-4 text-xs text-gray-500">Desde {tier.minAnimals} animales</p>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor={`tier-label-${tier.id}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    Nombre del plan
                  </label>
                  <input
                    id={`tier-label-${tier.id}`}
                    value={tier.label}
                    maxLength={40}
                    onChange={(event) => updateTier(tier.id, { label: event.target.value })}
                    className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-base text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor={`tier-max-${tier.id}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      Límite máximo
                    </label>
                    <input
                      id={`tier-max-${tier.id}`}
                      type="number"
                      min={tier.minAnimals}
                      step="1"
                      disabled={isLast}
                      value={tier.maxAnimals ?? ''}
                      placeholder={isLast ? 'Sin límite' : undefined}
                      onChange={(event) =>
                        updateTier(tier.id, { maxAnimals: Number(event.target.value) })
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-base text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`tier-price-${tier.id}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      USD / mes
                    </label>
                    <input
                      id={`tier-price-${tier.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={isFree}
                      value={tier.priceUsd ?? ''}
                      placeholder={tier.priceUsd === null ? 'A convenir' : undefined}
                      onChange={(event) =>
                        updateTier(tier.id, {
                          priceUsd: event.target.value === '' ? null : Number(event.target.value),
                        })
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-base text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </div>
                </div>

                <p className="min-h-5 text-xs text-gray-500">{tier.description}</p>

                {!isFree && tier.id !== 'empresarial' && (
                  <details className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700">
                      Configuración de Stripe
                    </summary>
                    <div className="mt-3">
                      <label
                        htmlFor={`tier-stripe-${tier.id}`}
                        className="block text-xs font-medium text-gray-600"
                      >
                        Price ID
                      </label>
                      <input
                        id={`tier-stripe-${tier.id}`}
                        value={tier.stripePriceId ?? ''}
                        placeholder="price_..."
                        onChange={(event) =>
                          updateTier(tier.id, { stripePriceId: event.target.value || null })
                        }
                        className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 font-mono text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
                      />
                    </div>
                  </details>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <div className="sticky bottom-3 flex flex-col-reverse gap-2 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => {
            setTiers(savedTiers)
            setError(null)
            setSuccess(null)
          }}
          className="min-h-11 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          Descartar cambios
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="min-h-11 rounded-lg bg-green-700 px-5 text-sm font-semibold text-white hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
        >
          {isSaving ? 'Guardando…' : 'Guardar planes y precios'}
        </button>
      </div>
    </section>
  )
}
