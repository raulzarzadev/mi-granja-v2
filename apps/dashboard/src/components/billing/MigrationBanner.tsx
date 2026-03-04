'use client'

import React from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { useBilling } from '@/hooks/useBilling'

/**
 * Banner para usuarios existentes con granjas/colaboradores extra
 * que aún no tienen suscripción activa (periodo de migración).
 */
const MigrationBanner: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth)
  const { usage, planType, status, requestUpgrade } = useBilling()

  // Solo mostrar si el usuario:
  // 1. Tiene más de 1 granja o colaboradores
  // 2. No tiene suscripción activa
  const needsUpgrade =
    user &&
    planType === 'free' &&
    status === 'none' &&
    usage &&
    (usage.farmCount > 1 || usage.collaboratorCount > 0)

  if (!needsUpgrade) return null

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">⚠️</span>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-yellow-800">
            Actualiza tu plan para mantener tus granjas y colaboradores
          </h4>
          <p className="text-sm text-yellow-700 mt-1">
            Tienes {usage.farmCount} {usage.farmCount === 1 ? 'granja' : 'granjas'}
            {usage.collaboratorCount > 0 &&
              ` y ${usage.collaboratorCount} ${usage.collaboratorCount === 1 ? 'colaborador' : 'colaboradores'}`}
            . El plan gratuito incluye 1 granja. Activa el Plan Pro para mantener acceso completo.
          </p>
          <button
            onClick={() => requestUpgrade('manual')}
            className="mt-3 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
          >
            Activar Plan Pro
          </button>
        </div>
      </div>
    </div>
  )
}

export default MigrationBanner
