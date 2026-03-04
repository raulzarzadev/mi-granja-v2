'use client'

import React, { useState } from 'react'
import { useBilling } from '@/hooks/useBilling'
import type { BillingInterval } from '@/types/billing'
import { BILLING_PRICES, calculateMonthlyTotal, formatMXN } from '@/types/billing'
import { Modal } from '../Modal'

const UPGRADE_MESSAGES: Record<string, string> = {
  farm_limit: 'Has alcanzado el limite de granjas en el plan gratuito. Agrega granjas adicionales para seguir creciendo.',
  collaborator_limit: 'Has alcanzado el limite de colaboradores en el plan gratuito. Agrega colaboradores para trabajar en equipo.',
  manual: 'Elige cuantas granjas y colaboradores adicionales necesitas.',
}

function QuantitySelector({
  label,
  icon,
  value,
  onChange,
  unitPrice,
  interval,
}: {
  label: string
  icon: string
  value: number
  onChange: (v: number) => void
  unitPrice: number
  interval: BillingInterval
}) {
  const displayPrice = interval === 'year' ? Math.round(unitPrice / 12) : unitPrice

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold text-gray-900 text-sm">{label}</span>
        </div>
        <span className="text-xs text-gray-500">
          {formatMXN(displayPrice)}/mes c/u
        </span>
      </div>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value === 0}
          className="h-9 w-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
        </button>
        <span className="text-3xl font-bold text-gray-900 w-10 text-center tabular-nums">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="h-9 w-9 rounded-full border border-green-400 bg-green-50 flex items-center justify-center text-green-700 hover:bg-green-100 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>
      {value > 0 && (
        <p className="text-center text-xs text-gray-500 mt-2">
          Subtotal: {formatMXN(displayPrice * value)}/mes
        </p>
      )}
    </div>
  )
}

const ModalUpgrade: React.FC = () => {
  const { showUpgradeModal, upgradeReason, dismissUpgrade, createCheckoutSession } = useBilling()
  const [interval, setInterval] = useState<BillingInterval>('month')
  const [extraFarms, setExtraFarms] = useState(1)
  const [extraCollaborators, setExtraCollaborators] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const farmPrice = interval === 'year' ? BILLING_PRICES.farmAnnual : BILLING_PRICES.farmMonthly
  const collabPrice =
    interval === 'year' ? BILLING_PRICES.collaboratorAnnual : BILLING_PRICES.collaboratorMonthly

  const monthlyTotal = calculateMonthlyTotal(extraFarms, extraCollaborators, interval)
  const hasSelection = extraFarms > 0 || extraCollaborators > 0

  const handleUpgrade = async () => {
    if (!hasSelection) return
    setIsLoading(true)
    try {
      await createCheckoutSession({
        extraFarms,
        extraCollaborators,
        interval,
      })
    } catch (error) {
      console.error('Error creando sesion de checkout:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Reset al abrir con contexto
  const initialFarms = upgradeReason === 'farm_limit' ? 1 : 0
  const initialCollabs = upgradeReason === 'collaborator_limit' ? 1 : 0

  // Reset cantidades cuando cambia la razón (nuevo open)
  React.useEffect(() => {
    if (showUpgradeModal) {
      setExtraFarms(initialFarms || 1)
      setExtraCollaborators(initialCollabs)
    }
  }, [showUpgradeModal])

  return (
    <Modal
      isOpen={showUpgradeModal}
      onClose={dismissUpgrade}
      title="Mejora tu Plan"
      size="md"
    >
      <div className="space-y-5">
        {/* Mensaje contextual */}
        <p className="text-gray-600 text-sm">
          {UPGRADE_MESSAGES[upgradeReason ?? 'manual']}
        </p>

        {/* Toggle mensual/anual */}
        <div className="flex items-center justify-center gap-3 bg-gray-50 rounded-lg py-3">
          <span
            className={`text-sm font-medium ${interval === 'month' ? 'text-green-700' : 'text-gray-500'}`}
          >
            Mensual
          </span>
          <button
            onClick={() => setInterval((i) => (i === 'month' ? 'year' : 'month'))}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              interval === 'year' ? 'bg-green-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                interval === 'year' ? 'translate-x-6' : ''
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${interval === 'year' ? 'text-green-700' : 'text-gray-500'}`}
          >
            Anual
            <span className="ml-1 text-xs text-green-600 font-semibold">-17%</span>
          </span>
        </div>

        {/* Selectores de cantidad */}
        <div className="space-y-3">
          <QuantitySelector
            label="Granjas adicionales"
            icon="🚜"
            value={extraFarms}
            onChange={setExtraFarms}
            unitPrice={farmPrice}
            interval={interval}
          />
          <QuantitySelector
            label="Colaboradores"
            icon="👥"
            value={extraCollaborators}
            onChange={setExtraCollaborators}
            unitPrice={collabPrice}
            interval={interval}
          />
        </div>

        {/* Resumen de costo */}
        {hasSelection && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-800">Total mensual estimado</span>
              <span className="text-xl font-bold text-green-700">{formatMXN(monthlyTotal)}</span>
            </div>
            {interval === 'year' && (
              <p className="text-xs text-green-600 mt-1">
                Cobro anual de {formatMXN(monthlyTotal * 12)} (ahorro del 17%)
              </p>
            )}
            <div className="mt-2 text-xs text-green-700 space-y-0.5">
              {extraFarms > 0 && (
                <p>{extraFarms} {extraFarms === 1 ? 'granja' : 'granjas'} adicional{extraFarms > 1 ? 'es' : ''}</p>
              )}
              {extraCollaborators > 0 && (
                <p>{extraCollaborators} colaborador{extraCollaborators > 1 ? 'es' : ''}</p>
              )}
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
          <button
            onClick={dismissUpgrade}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
          >
            Ahora no
          </button>
          <button
            onClick={handleUpgrade}
            disabled={isLoading || !hasSelection}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Procesando...
              </>
            ) : (
              `Ir a pagar${hasSelection ? ' ' + formatMXN(monthlyTotal) + '/mes' : ''}`
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ModalUpgrade
