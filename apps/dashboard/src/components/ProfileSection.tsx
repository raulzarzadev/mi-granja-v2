'use client'

import React, { useState } from 'react'
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
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Correo electronico
              </label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            {user.createdAt && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Fecha de registro
                </label>
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
      content: <PlanTab isFreePlan={isFreePlan} usage={usage} userEmail={user.email} />,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-green-300 to-green-500 flex items-center justify-center text-green-900 text-xl font-bold shadow-inner">
            {user.farmName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.farmName || user.email}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Tabs con chips */}
      <Tabs tabs={tabs} tabsId="profile-tabs" />
    </div>
  )
}

import { PRICE_PER_PLACE_MXN } from '@/types/billing'
const FEEDBACK_EMAIL = 'hola@migranja.app'

const PlanTab: React.FC<{
  isFreePlan: boolean
  usage: {
    totalPlaces: number
    usedPlaces: number
    farmCount: number
    collaboratorCount: number
  } | null
  userEmail: string
}> = ({ isFreePlan, usage, userEmail }) => {
  const [addPlaces, setAddPlaces] = useState(1)
  const [emailSent, setEmailSent] = useState(false)

  const currentPlaces = usage?.totalPlaces ?? 0
  const newTotal = currentPlaces + addPlaces
  const newMonthly = newTotal * PRICE_PER_PLACE_MXN

  const buildMailtoLink = () => {
    const subject = encodeURIComponent('Solicitud de lugares adicionales - Mi Granja')
    const body = encodeURIComponent(
      `Hola, me gustaria agregar lugares a mi plan.\n\n` +
        `Cuenta: ${userEmail}\n` +
        `Lugares actuales: ${currentPlaces}\n` +
        `Lugares a agregar: ${addPlaces}\n` +
        `Nuevo total de lugares: ${newTotal}\n` +
        `Nuevo total mensual: $${newMonthly.toLocaleString('es-MX')} MXN/mes\n\n` +
        `Detalle:\n` +
        `- Cada lugar = 1 granja adicional O 1 colaborador adicional\n` +
        `- Precio por lugar: $${PRICE_PER_PLACE_MXN} MXN/mes\n\n` +
        `Quedo atento al enlace de pago.\n\nGracias.`,
    )
    return `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <div className="space-y-4">
      {/* Plan actual */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Mi Plan</h3>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isFreePlan ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'
            }`}
          >
            {isFreePlan ? 'Gratuito' : 'Pro'}
          </span>
        </div>

        {isFreePlan ? (
          <p className="text-sm text-gray-600">
            Incluye <span className="font-medium">1 granja</span> y{' '}
            <span className="font-medium">1 usuario</span>. Sin costo.
          </p>
        ) : (
          <div className="space-y-2">
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
              <span className="font-medium text-green-600">
                {(usage?.totalPlaces ?? 0) - (usage?.usedPlaces ?? 0)}
              </span>
            </div>
          </div>
        )}

        {/* Detalle de uso */}
        {usage && (
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-700">{usage.farmCount}</p>
              <p className="text-xs text-gray-500">Granjas</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-700">{usage.collaboratorCount}</p>
              <p className="text-xs text-gray-500">Colaboradores</p>
            </div>
          </div>
        )}
      </div>

      {/* Agregar lugares */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Agregar lugares</h3>
          <p className="text-sm text-gray-500">
            Cada lugar te permite agregar 1 granja adicional o 1 colaborador. Tu decides como
            usarlos.
          </p>
        </div>

        {/* Precio */}
        <div className="border border-green-200 rounded-lg p-3 bg-green-50 flex items-baseline gap-1">
          <span className="text-xl font-bold text-green-700">${PRICE_PER_PLACE_MXN}</span>
          <span className="text-sm text-green-600">MXN / lugar / mes</span>
        </div>

        {emailSent ? (
          <div className="flex flex-col items-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-7 h-7 text-green-600"
              >
                <path
                  fillRule="evenodd"
                  d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-600 text-center">
              Solicitud enviada. Te responderemos pronto con el enlace de pago.
            </p>
            <button
              onClick={() => setEmailSent(false)}
              className="text-xs text-green-600 hover:text-green-800 cursor-pointer"
            >
              Enviar otra solicitud
            </button>
          </div>
        ) : (
          <>
            {/* Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lugares a agregar
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAddPlaces((p) => Math.max(1, p - 1))}
                  disabled={addPlaces <= 1}
                  className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  -
                </button>
                <span className="text-2xl font-bold text-gray-900 w-10 text-center tabular-nums">
                  {addPlaces}
                </span>
                <button
                  onClick={() => setAddPlaces((p) => Math.min(20, p + 1))}
                  disabled={addPlaces >= 20}
                  className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Resumen */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              {currentPlaces > 0 && (
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Lugares actuales</span>
                  <span>{currentPlaces}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  + {addPlaces} lugar{addPlaces > 1 ? 'es' : ''}
                </span>
                <span className="font-medium text-gray-900">
                  + ${(addPlaces * PRICE_PER_PLACE_MXN).toLocaleString('es-MX')} MXN
                </span>
              </div>
              <div className="flex justify-between text-sm pt-1.5 border-t border-gray-200">
                <span className="font-medium text-gray-700">Total ({newTotal} lugares)</span>
                <span className="font-bold text-green-700">
                  ${newMonthly.toLocaleString('es-MX')}/mes
                </span>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                <span className="font-semibold">Nota:</span> Solo enviaras una solicitud. Como
                estamos en fase de pruebas, es posible que seas seleccionado como usuario de prueba
                y tu solicitud sea <span className="font-semibold">sin costo</span>.
              </p>
            </div>

            <a
              href={buildMailtoLink()}
              onClick={() => setEmailSent(true)}
              className="block w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors text-center cursor-pointer"
            >
              Enviar solicitud por correo
            </a>
          </>
        )}
      </div>
    </div>
  )
}

export default ProfileSection
