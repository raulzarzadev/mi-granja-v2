'use client'

import React from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { useBilling } from '@/hooks/useBilling'
import Tabs from './Tabs'

/**
 * Seccion de perfil del usuario
 * Sub-tabs: Datos personales, Mi Plan
 */
const ProfileSection: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const { usage, planType } = useBilling()

  if (!user) return null

  const isFreePlan = planType === 'free'

  const tabs = [
    {
      label: '👤 Datos personales',
      content: (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos personales</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Nombre</label>
              <p className="text-gray-900">{user.farmName || 'Sin nombre'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Correo electronico</label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            {user.createdAt && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Fecha de registro</label>
                <p className="text-gray-900">
                  {new Date(
                    typeof user.createdAt === 'string'
                      ? user.createdAt
                      : (user.createdAt as unknown as { seconds: number }).seconds * 1000,
                  ).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      label: '💳 Mi Plan',
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Mi Plan</h3>
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
                  Contacta al administrador para obtener mas lugares.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Lugares asignados</span>
                  <span className="font-medium text-gray-900">{usage?.totalPlaces ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">En uso</span>
                  <span className="font-medium text-gray-900">{usage?.usedPlaces ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Disponibles</span>
                  <span className="font-medium text-green-600">{(usage?.totalPlaces ?? 0) - (usage?.usedPlaces ?? 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Detalle de uso */}
          {usage && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalle de uso</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Granjas</span>
                  </div>
                  <p className="text-3xl font-bold text-green-700">{usage.farmCount}</p>
                  <p className="text-xs text-gray-400 mt-1">1 incluida gratis</p>
                  {usage.farmCount > 1 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {usage.farmCount - 1} {usage.farmCount - 1 === 1 ? 'lugar usado' : 'lugares usados'}
                    </p>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Colaboradores</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-700">{usage.collaboratorCount}</p>
                  {usage.collaboratorCount > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {usage.collaboratorCount} {usage.collaboratorCount === 1 ? 'lugar usado' : 'lugares usados'}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                Para cambiar tu plan o agregar lugares, contacta al administrador de la plataforma.
              </p>
            </div>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-green-300 to-green-500 flex items-center justify-center text-green-900 text-xl font-bold shadow-inner">
            {user.farmName?.charAt(0)?.toUpperCase() ||
              user.email?.charAt(0)?.toUpperCase() ||
              'U'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {user.farmName || user.email}
            </h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Tabs con chips */}
      <Tabs tabs={tabs} tabsId="profile-tabs" />
    </div>
  )
}

export default ProfileSection
