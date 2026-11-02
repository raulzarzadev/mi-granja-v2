'use client'

import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { getVisiblePlanTiers, type PlanTier, type PlanTierId } from '@/types/billing'

interface AiBenefits {
  freeDailyQueries: number
  paidTierId: PlanTierId
  monthlyCreditUsd: number
  ranchoMultiplier?: number
  empresarialMultiplier?: number
}
interface Props {
  currentTierId: PlanTierId
  requiredTierId?: PlanTierId
  tiers?: PlanTier[]
  isLoading?: boolean
  onSelect: (tierId: PlanTierId) => void
}
export function PlanTierComparison({
  currentTierId,
  requiredTierId = 'free',
  tiers,
  isLoading = false,
  onSelect,
}: Props) {
  const [benefits, setBenefits] = useState<AiBenefits | null>(null)
  const [error, setError] = useState('')
  const loadBenefits = async (signal?: AbortSignal) => {
    setError('')
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('Sesión no disponible')
      const response = await fetch('/api/billing/ai-benefits', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal,
      })
      const data = await response.json()
      if (
        !response.ok ||
        typeof data.freeDailyQueries !== 'number' ||
        typeof data.monthlyCreditUsd !== 'number' ||
        typeof data.paidTierId !== 'string'
      )
        throw new Error('No se pudieron cargar los límites de IA.')
      if (!signal?.aborted) setBenefits(data)
    } catch {
      if (!signal?.aborted) setError('No se pudieron cargar los límites de IA.')
    }
  }
  useEffect(() => {
    const abort = new AbortController()
    void loadBenefits(abort.signal)
    return () => abort.abort()
  }, [])
  if (!tiers)
    return (
      <div
        aria-label="Cargando comparativa de planes"
        aria-busy="true"
        className="h-72 animate-pulse rounded-xl bg-gray-100"
      />
    )
  const visible = getVisiblePlanTiers(tiers)
  if (!visible.length) return <p role="status">No hay planes disponibles por el momento.</p>
  const currentIndex = tiers.findIndex((tier) => tier.id === currentTierId)
  const requiredIndex = tiers.findIndex((tier) => tier.id === requiredTierId)
  const cell = (tier: PlanTier) =>
    `px-4 py-4 text-center text-sm ${tier.id === currentTierId ? 'bg-green-50/70' : 'bg-white'}`
  const multiplier = (tier: PlanTier) =>
    tier.id === 'rancho'
      ? (benefits?.ranchoMultiplier ?? 4)
      : tier.id === 'empresarial'
        ? (benefits?.empresarialMultiplier ?? 20)
        : tier.id === benefits?.paidTierId
          ? 1
          : 0
  const labelClass =
    'sticky left-0 z-10 w-32 min-w-32 bg-gray-50 px-3 py-4 text-left text-xs font-semibold text-gray-600 sm:w-44 sm:min-w-44 sm:px-4 sm:text-sm'
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 sm:hidden">
        Desliza la tabla para comparar todos los planes.
      </p>
      <div
        className="isolate overflow-x-auto rounded-xl border border-gray-200"
        role="region"
        aria-label="Comparativa de planes"
        tabIndex={0}
      >
        <table className="w-full border-collapse text-gray-900">
          <caption className="sr-only">
            Precios, capacidad y límites de IA de los planes disponibles
          </caption>
          <thead>
            <tr>
              <th scope="col" className={labelClass}>
                Tu plan, a detalle
              </th>
              {visible.map((tier) => (
                <th key={tier.id} scope="col" className={`${cell(tier)} min-w-44 align-top`}>
                  <span className="block text-base font-bold">{tier.label}</span>
                  {tier.id === currentTierId ? (
                    <span className="mt-2 inline-block rounded-full bg-green-700 px-2 py-1 text-xs font-medium text-white">
                      Plan actual
                    </span>
                  ) : tier.id === requiredTierId ? (
                    <span className="mt-2 inline-block text-xs font-medium text-green-700">
                      Para tu inventario
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <th scope="row" className={labelClass}>
                Precio mensual
              </th>
              {visible.map((tier) => (
                <td key={tier.id} className={cell(tier)}>
                  <span className="block text-xl font-bold">
                    {tier.priceUsd === null
                      ? 'A convenir'
                      : `$${tier.priceUsd.toLocaleString('es-MX')} USD`}
                  </span>
                  <span className="text-xs text-gray-500">
                    {tier.priceUsd === null
                      ? 'Cotización personalizada'
                      : tier.priceUsd
                        ? 'por mes'
                        : 'Sin mensualidad'}
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={labelClass}>
                Animales activos
              </th>
              {visible.map((tier) => (
                <td key={tier.id} className={cell(tier)}>
                  {tier.description}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={labelClass}>
                IA incluida
              </th>
              {visible.map((tier) => (
                <td key={tier.id} className={cell(tier)}>
                  {benefits ? (
                    multiplier(tier) > 0 ? (
                      <>
                        <span className="block font-semibold text-green-800">
                          {tier.id === 'empresarial' ? 'Hasta ' : ''}USD{' '}
                          {(benefits.monthlyCreditUsd * multiplier(tier)).toLocaleString('es-MX')}{' '}
                          en créditos / mes
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          {tier.id === 'rancho'
                            ? `${multiplier(tier)}× la IA de ${tiers.find((item) => item.id === benefits.paidTierId)?.label ?? 'Pro'}. `
                            : tier.id === 'empresarial'
                              ? `Hasta ${multiplier(tier)}× según el acuerdo. `
                              : ''}
                          Después de cada pago mensual confirmado
                        </span>
                      </>
                    ) : (
                      <span>{benefits.freeDailyQueries} consultas al día</span>
                    )
                  ) : (
                    <span className="text-gray-500">
                      {error ? 'No disponible' : 'Cargando límites…'}
                    </span>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={labelClass}>
                Al agotar la IA
              </th>
              {visible.map((tier) => (
                <td key={tier.id} className={cell(tier)}>
                  {benefits
                    ? multiplier(tier) > 0
                      ? 'Se renueva con el siguiente pago mensual'
                      : 'Se renueva al día siguiente'
                    : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={labelClass}>
                Granjas y colaboradores
              </th>
              {visible.map((tier) => (
                <td key={tier.id} className={cell(tier)}>
                  Sin cargos adicionales
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={labelClass}>
                Elegir plan
              </th>
              {visible.map((tier) => {
                const index = tiers.findIndex((item) => item.id === tier.id),
                  below = index < requiredIndex,
                  downgrade = index < currentIndex
                return (
                  <td key={tier.id} className={cell(tier)}>
                    {tier.id === currentTierId ? (
                      <span className="font-medium text-green-800">Tu plan actual</span>
                    ) : (
                      <button
                        type="button"
                        disabled={isLoading || below}
                        onClick={() => onSelect(tier.id)}
                        className="min-h-11 w-full cursor-pointer rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800 focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                      >
                        {below
                          ? 'No cubre tu inventario'
                          : tier.id === 'empresarial'
                            ? 'Contactar'
                            : tier.id === 'free'
                              ? 'Cambiar a Gratis'
                              : downgrade
                                ? 'Bajar de plan'
                                : 'Subir de plan'}
                      </button>
                    )}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-amber-800">
          {error}{' '}
          <button
            type="button"
            onClick={() => void loadBenefits()}
            className="min-h-11 px-2 font-medium underline"
          >
            Reintentar
          </button>
        </p>
      ) : (
        benefits && (
          <p className="text-xs leading-5 text-gray-500">
            Los créditos de IA se consumen según el uso; no equivalen a un número fijo de consultas.
            El regalo mensual requiere pago confirmado y no se acumula entre periodos.
          </p>
        )
      )}
    </div>
  )
}
