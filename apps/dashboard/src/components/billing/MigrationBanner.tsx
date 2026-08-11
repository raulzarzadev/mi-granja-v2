'use client'

import { useBilling } from '@/hooks/useBilling'
import { getTierById } from '@/types/billing'

export default function MigrationBanner() {
  const { usage } = useBilling()
  if (!usage || usage.requiredTierId === usage.currentTierId) return null

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h4 className="text-sm font-semibold text-amber-900">Tu inventario requiere otro plan</h4>
      <p className="mt-1 text-sm text-amber-800">
        Tienes {usage.animalCount} animales activos. El tier recomendado es{' '}
        <strong>{getTierById(usage.requiredTierId, usage.tiers).label}</strong>.
      </p>
      <a href="/plan" className="mt-2 inline-flex text-sm font-semibold text-amber-900 underline">
        Revisar planes
      </a>
    </div>
  )
}
