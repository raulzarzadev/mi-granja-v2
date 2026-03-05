'use client'

import React from 'react'
import { useBilling } from '@/hooks/useBilling'

/**
 * Seccion de billing que muestra el plan actual y uso de lugares.
 * Los lugares son asignados por el admin — no hay pagos ni facturas.
 */
const BillingSection: React.FC = () => {
  const {
    usage,
    planType,
    isLoading,
  } = useBilling()

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="h-32 bg-gray-200 rounded-lg" />
      </div>
    )
  }

  const isFreePlan = planType === 'free'

  return (
    <div className="space-y-6">
      {/* Plan actual */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Plan Actual</h3>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isFreePlan
                ? 'bg-gray-100 text-gray-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {isFreePlan ? 'Gratuito' : 'Pro'}
          </span>
        </div>

        {isFreePlan ? (
          <div>
            <p className="text-gray-600 mb-2">
              Estas en el plan gratuito. Incluye 1 granja y tu usuario.
            </p>
            <p className="text-sm text-gray-500">
              Contacta al administrador para obtener mas lugares (granjas o colaboradores).
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Lugares asignados</span>
              <span className="font-medium text-gray-900">
                {usage?.totalPlaces ?? 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Lugares en uso</span>
              <span className="font-medium text-gray-900">
                {usage?.usedPlaces ?? 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Disponibles</span>
              <span className="font-medium text-green-600">
                {(usage?.totalPlaces ?? 0) - (usage?.usedPlaces ?? 0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Uso actual */}
      {usage && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalle de uso</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-green-700">{usage.farmCount}</p>
              <p className="text-sm text-gray-600 mt-1">
                {usage.farmCount === 1 ? 'Granja' : 'Granjas'}
              </p>
              <p className="text-xs text-gray-400 mt-1">1 incluida gratis</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-700">{usage.collaboratorCount}</p>
              <p className="text-sm text-gray-600 mt-1">
                {usage.collaboratorCount === 1 ? 'Colaborador' : 'Colaboradores'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de contacto */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Para cambiar tu plan o agregar lugares, contacta al administrador de la plataforma.
        </p>
      </div>
    </div>
  )
}

export default BillingSection
