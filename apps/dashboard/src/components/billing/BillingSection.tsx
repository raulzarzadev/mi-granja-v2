'use client'

import { useState } from 'react'
import { useBilling } from '@/hooks/useBilling'
import { getTierById } from '@/types/billing'

export default function BillingSection() {
  const { usage, subscription, isLoading, openBillingPortal } = useBilling()
  const [error, setError] = useState<string | null>(null)
  const [isOpeningPortal, setIsOpeningPortal] = useState(false)

  if (isLoading) return <div className="h-32 animate-pulse rounded-lg bg-gray-200" />

  const tier = getTierById(usage?.currentTierId ?? subscription?.tierId ?? 'free', usage?.tiers)

  async function handlePortal() {
    setError(null)
    setIsOpeningPortal(true)
    try {
      await openBillingPortal()
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : 'No se pudo abrir Stripe')
      setIsOpeningPortal(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Plan actual</p>
            <h3 className="text-xl font-semibold text-gray-900">{tier.label}</h3>
            <p className="mt-1 text-sm text-gray-600">{tier.description}</p>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            {subscription?.status ?? 'none'}
          </span>
        </div>
        {subscription?.stripeCustomerId && (
          <button
            type="button"
            disabled={isOpeningPortal}
            onClick={handlePortal}
            className="mt-4 rounded-lg border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
          >
            Administrar facturación
          </button>
        )}
      </div>

      {usage && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ['Animales activos', usage.animalCount],
            ['Granjas', usage.farmCount],
            ['Colaboradores', usage.collaboratorCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{value}</p>
              <p className="mt-1 text-sm text-gray-600">{label}</p>
            </div>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
