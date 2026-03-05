'use client'

import React from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { useBilling } from '@/hooks/useBilling'

/**
 * Banner para usuarios existentes con granjas/colaboradores extra
 * que aun no tienen lugares asignados por el admin.
 */
const MigrationBanner: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth)
  const { usage, planType, status } = useBilling()

  // Solo mostrar si el usuario:
  // 1. Tiene mas de 1 granja o colaboradores
  // 2. No tiene lugares asignados
  const needsPlaces =
    user &&
    planType === 'free' &&
    status === 'none' &&
    usage &&
    (usage.farmCount > 1 || usage.collaboratorCount > 0)

  if (!needsPlaces) return null

  const extraPlaces = usage.farmCount - 1 + usage.collaboratorCount

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">&#x26A0;&#xFE0F;</span>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-yellow-800">
            Necesitas {extraPlaces} {extraPlaces === 1 ? 'lugar' : 'lugares'} para mantener tu uso
            actual
          </h4>
          <p className="text-sm text-yellow-700 mt-1">
            Tienes {usage.farmCount} {usage.farmCount === 1 ? 'granja' : 'granjas'}
            {usage.collaboratorCount > 0 &&
              ` y ${usage.collaboratorCount} ${usage.collaboratorCount === 1 ? 'colaborador' : 'colaboradores'}`}
            . El plan gratuito incluye 1 granja sin colaboradores.
          </p>
          <p className="text-sm text-yellow-700 mt-2 font-medium">
            Contacta al administrador para obtener mas lugares.
          </p>
        </div>
      </div>
    </div>
  )
}

export default MigrationBanner
