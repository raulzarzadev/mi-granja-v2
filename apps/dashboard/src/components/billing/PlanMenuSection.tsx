'use client'

import Link from 'next/link'
import { useBilling } from '@/hooks/useBilling'
import { getTierById } from '@/types/billing'

interface PlanMenuSectionProps {
  onNavigate: () => void
}

export function PlanMenuSection({ onNavigate }: PlanMenuSectionProps) {
  const { usage, subscription, isLoading } = useBilling()
  const currentTier = getTierById(
    usage?.currentTierId ?? subscription?.tierId ?? 'free',
    usage?.tiers,
  )

  return (
    <div className="px-3 py-3" role="none">
      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-600 text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M3.75 7.5h16.5m-15 9h3m-3.75 3h15a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5h-15A1.5 1.5 0 0 0 3 6v12a1.5 1.5 0 0 0 1.5 1.5Z"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-600">
              Plan: <strong className="font-semibold text-gray-900">{currentTier.label}</strong>
            </p>
            <p className="mt-0.5 text-xs text-gray-600">
              {isLoading || !usage ? 'Consultando uso…' : `${usage.animalCount} animales activos`}
            </p>
          </div>
        </div>
        <Link
          href="/plan"
          role="menuitem"
          onClick={onNavigate}
          className="mt-3 flex min-h-11 w-full items-center justify-between rounded-md border border-green-600 bg-white px-3 py-2 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
        >
          <span>Ver planes y cambiar</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  )
}
