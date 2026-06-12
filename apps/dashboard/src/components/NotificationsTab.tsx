'use client'

import React from 'react'
import { useFcmRegistration } from '@/hooks/useFcmRegistration'
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'

/**
 * Tab de preferencias de notificaciones.
 * Lee/escribe vía useNotificationPreferences (slice + Firestore).
 */
const NotificationsTab: React.FC = () => {
  const { prefs, setPushEnabled, setEmailEnabled, setMarketingEmailEnabled } =
    useNotificationPreferences()
  const { status, error, enable } = useFcmRegistration()

  const pushEnabled = Boolean(prefs?.pushEnabled)
  const emailEnabled = prefs?.emailEnabled !== false
  const marketingEmailEnabled = prefs?.marketingEmailEnabled !== false
  const tokenCount = prefs?.fcmTokens?.length ?? 0

  const pushDenied = status === 'denied'
  const pushUnsupported = status === 'unsupported'

  const handlePushToggle = async () => {
    if (!pushEnabled) {
      await enable()
    } else {
      await setPushEnabled(false)
    }
  }

  const handleEmailToggle = async () => {
    await setEmailEnabled(!emailEnabled)
  }

  const handleMarketingEmailToggle = async () => {
    await setMarketingEmailEnabled(!marketingEmailEnabled)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
        <p className="text-sm text-gray-500">Elige cómo recibir avisos de tus recordatorios.</p>
      </div>

      {/* Push */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-gray-900">Notificaciones push</p>
          <p className="text-xs text-gray-500">
            Avisos en tu navegador, incluso con la pestaña cerrada.
          </p>
          {pushDenied && (
            <p className="text-xs text-red-600 mt-1">
              Permisos bloqueados. Habilítalos en la configuración del navegador.
            </p>
          )}
          {pushUnsupported && (
            <p className="text-xs text-amber-600 mt-1">
              Tu navegador no soporta notificaciones push.
            </p>
          )}
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          {pushEnabled && tokenCount > 0 && (
            <p className="text-xs text-green-600 mt-1">
              {tokenCount} dispositivo{tokenCount > 1 ? 's' : ''} registrado
              {tokenCount > 1 ? 's' : ''}.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handlePushToggle}
          disabled={pushDenied || pushUnsupported || status === 'pending'}
          aria-pressed={pushEnabled}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            pushEnabled ? 'bg-green-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
              pushEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Email */}
      <div className="flex items-start justify-between gap-4 pt-4 border-t border-gray-100">
        <div>
          <p className="font-medium text-gray-900">Resumen por correo</p>
          <p className="text-xs text-gray-500">
            Recibe cada mañana un correo con tus recordatorios pendientes y atrasados.
          </p>
        </div>
        <button
          type="button"
          onClick={handleEmailToggle}
          aria-pressed={emailEnabled}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            emailEnabled ? 'bg-green-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
              emailEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Marketing Email */}
      <div className="flex items-start justify-between gap-4 pt-4 border-t border-gray-100">
        <div>
          <p className="font-medium text-gray-900">Novedades y actualizaciones</p>
          <p className="text-xs text-gray-500">
            Recibe correos ocasionales sobre mejoras nuevas, cambios importantes y anuncios de Mi
            Granja.
          </p>
        </div>
        <button
          type="button"
          onClick={handleMarketingEmailToggle}
          aria-pressed={marketingEmailEnabled}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            marketingEmailEnabled ? 'bg-green-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
              marketingEmailEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

export default NotificationsTab
