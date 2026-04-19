'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { Modal } from '@/components/Modal'
import type { RootState } from '@/features/store'
import { auth } from '@/lib/firebase'
import { PRICE_PER_PLACE_MXN } from '@/types/billing'

const OWNER_EMAIL = 'raulzarza.dev@gmail.com'

/** Sends a single email via the /api/send endpoint */
async function sendEmail(payload: { to: string; subject: string; html: string }): Promise<void> {
  const token = await auth.currentUser?.getIdToken()
  const res = await fetch('/api/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Error al enviar correo')
}

// ─── Plan features data ───────────────────────────────────────────────────────

const FREE_FEATURES = [
  '1 granja incluida',
  'Animales ilimitados',
  'Control de reproducción completo',
  'Recordatorios y áreas',
]

const PRO_FEATURES = [
  'Todo lo del plan Gratis',
  'Granjas adicionales (1 lugar = 1 granja)',
  'Colaboradores (1 lugar = 1 colaborador)',
  'Tú decides cómo usar tus lugares',
  'Registro masivo de animales',
  'Importación de datos (CSV)',
  'Respaldo y restauración',
  'Soporte prioritario',
]

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Checkmark icon for free plan features */
function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`w-4 h-4 flex-shrink-0 ${className}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/** Spinner for loading state */
function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface ModalUpgradePlanProps {
  isOpen: boolean
  onClose: () => void
}

type FormStatus = 'idle' | 'loading' | 'sent' | 'error'

/**
 * Modal that lets free-plan users request a Pro upgrade.
 * Shows a plan comparison and sends confirmation emails to both the owner and user.
 */
const ModalUpgradePlan: React.FC<ModalUpgradePlanProps> = ({ isOpen, onClose }) => {
  const { user } = useSelector((s: RootState) => s.auth)

  const [granjas, setGranjas] = useState(0)
  const [colaboradores, setColaboradores] = useState(0)
  const [mensaje, setMensaje] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setStatus('loading')

    try {
      // Email to owner
      await sendEmail({
        to: OWNER_EMAIL,
        subject: `Solicitud de plan Pro — ${user.email}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;color:#111827">
            <h2 style="color:#15803d;margin-bottom:16px">Nueva solicitud de plan Pro ⭐</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tbody>
                <tr style="border-bottom:1px solid #e5e7eb">
                  <td style="padding:8px 4px;color:#6b7280;width:40%">Usuario ID</td>
                  <td style="padding:8px 4px;font-weight:600">${user.id}</td>
                </tr>
                <tr style="border-bottom:1px solid #e5e7eb">
                  <td style="padding:8px 4px;color:#6b7280">Email</td>
                  <td style="padding:8px 4px;font-weight:600">${user.email}</td>
                </tr>
                <tr style="border-bottom:1px solid #e5e7eb">
                  <td style="padding:8px 4px;color:#6b7280">Granjas solicitadas</td>
                  <td style="padding:8px 4px;font-weight:600">${granjas}</td>
                </tr>
                <tr style="border-bottom:1px solid #e5e7eb">
                  <td style="padding:8px 4px;color:#6b7280">Colaboradores solicitados</td>
                  <td style="padding:8px 4px;font-weight:600">${colaboradores}</td>
                </tr>
                ${
                  mensaje
                    ? `<tr>
                        <td style="padding:8px 4px;color:#6b7280;vertical-align:top">Mensaje</td>
                        <td style="padding:8px 4px">${mensaje}</td>
                       </tr>`
                    : ''
                }
              </tbody>
            </table>
          </div>
        `,
      })

      // Confirmation email to user
      await sendEmail({
        to: user.email,
        subject: 'Recibimos tu solicitud — Mi Granja Pro',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;color:#111827">
            <h2 style="color:#15803d">¡Recibimos tu solicitud! 🎉</h2>
            <p style="color:#374151">Hola, gracias por tu interés en el plan Pro de Mi Granja.</p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0">
              <p style="margin:0 0 8px;color:#166534;font-size:14px;font-weight:600">Tu solicitud incluye:</p>
              <p style="margin:0 0 4px;color:#166534;font-size:14px">
                • ${granjas} ${granjas === 1 ? 'granja adicional' : 'granjas adicionales'}
              </p>
              <p style="margin:0;color:#166534;font-size:14px">
                • ${colaboradores} ${colaboradores === 1 ? 'colaborador' : 'colaboradores'}
              </p>
              ${
                mensaje
                  ? `<p style="margin:8px 0 0;color:#166534;font-size:14px">• <em>${mensaje}</em></p>`
                  : ''
              }
            </div>
            <p style="color:#374151">
              Pronto te enviaremos más información para comenzar tu período de prueba.
              Si tienes dudas adicionales, responde este correo.
            </p>
            <p style="color:#6b7280;font-size:13px;margin-top:24px">— El equipo de Mi Granja</p>
          </div>
        `,
      })

      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Actualizar a Plan Pro ⭐" size="lg">
      <div className="space-y-6 pb-2">
        {/* ── Plan comparison ───────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Free plan */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base font-semibold text-gray-700">Plan Gratis</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                Actual
              </span>
            </div>
            <ul className="space-y-2">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckIcon className="text-gray-400 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro plan */}
          <div className="rounded-lg border-2 border-green-500 bg-green-50 p-4 relative overflow-hidden">
            <div
              className="absolute top-0 right-0 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg"
              aria-hidden="true"
            >
              PRO
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base font-semibold text-green-800">Plan Pro</span>
              <span className="text-green-600 text-base" aria-hidden="true">
                ⭐
              </span>
            </div>
            <ul className="space-y-2">
              {PRO_FEATURES.map((f, i) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckIcon
                    className={i === 0 ? 'text-green-500 mt-0.5' : 'text-green-600 mt-0.5'}
                  />
                  <span className={i === 0 ? 'text-green-700' : 'text-green-800 font-medium'}>
                    {f}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Sent state ────────────────────────────────────── */}
        {status === 'sent' ? (
          <div className="rounded-lg bg-green-50 border border-green-200 p-5 text-center space-y-3">
            <div className="text-3xl" aria-hidden="true">
              ✅
            </div>
            <p className="text-base font-semibold text-green-800">¡Solicitud enviada!</p>
            <p className="text-sm text-green-700">
              Te enviamos confirmación a <strong className="font-semibold">{user?.email}</strong>.{' '}
              Pronto nos ponemos en contacto.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 active:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-white text-sm font-medium rounded-md transition-colors duration-200 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        ) : (
          /* ── Request form ─────────────────────────────────── */
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Agrega lugares y crece
            </h3>
            <p className="text-sm text-gray-500 -mt-2">
              Cada lugar te da acceso a una granja adicional o un colaborador. Trabaja en equipo y gestiona más desde un solo lugar.
            </p>

            {/* Number inputs row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="upgrade-granjas"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  ¿Cuántas granjas adicionales necesitas?
                </label>
                <input
                  id="upgrade-granjas"
                  type="number"
                  min={0}
                  max={99}
                  value={granjas}
                  onChange={(e) => setGranjas(Math.max(0, Number(e.target.value)))}
                  disabled={status === 'loading'}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white
                    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                    disabled:opacity-60 disabled:cursor-not-allowed
                    transition-colors duration-150"
                />
              </div>

              <div>
                <label
                  htmlFor="upgrade-colaboradores"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  ¿Cuántos colaboradores necesitas?
                </label>
                <input
                  id="upgrade-colaboradores"
                  type="number"
                  min={0}
                  max={99}
                  value={colaboradores}
                  onChange={(e) => setColaboradores(Math.max(0, Number(e.target.value)))}
                  disabled={status === 'loading'}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white
                    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                    disabled:opacity-60 disabled:cursor-not-allowed
                    transition-colors duration-150"
                />
              </div>
            </div>

            {/* Calculadora de precio */}
            {(granjas + colaboradores) > 0 ? (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-center justify-between">
                <div className="text-sm text-green-800">
                  <span className="font-medium">{granjas + colaboradores} lugar{granjas + colaboradores !== 1 ? 'es' : ''}</span>
                  <span className="text-green-600"> × ${PRICE_PER_PLACE_MXN} MXN/mes</span>
                </div>
                <div className="text-lg font-bold text-green-900">
                  ${((granjas + colaboradores) * PRICE_PER_PLACE_MXN).toLocaleString('es-MX')} MXN/mes
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center">
                Ajusta las cantidades para ver el precio estimado · ${PRICE_PER_PLACE_MXN} MXN por lugar/mes
              </p>
            )}

            {/* Optional message */}
            <div>
              <label
                htmlFor="upgrade-mensaje"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                ¿Tienes alguna duda o funcionalidad que te gustaría ver?{' '}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                id="upgrade-mensaje"
                rows={3}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                disabled={status === 'loading'}
                placeholder="Cuéntanos tu caso o pídenos una funcionalidad. La consideraremos para futuras versiones."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white resize-none
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                  disabled:opacity-60 disabled:cursor-not-allowed
                  placeholder:text-gray-400 transition-colors duration-150"
              />
            </div>

            {/* Error message */}
            {status === 'error' && (
              <p
                role="alert"
                className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
              >
                Hubo un error al enviar tu solicitud. Por favor intenta de nuevo.
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5
                bg-green-600 hover:bg-green-700 active:bg-green-800
                disabled:opacity-60 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                text-white text-sm font-semibold rounded-md
                transition-colors duration-200 cursor-pointer"
            >
              {status === 'loading' ? (
                <>
                  <Spinner />
                  <span>Enviando…</span>
                </>
              ) : (
                <>✉️ Solicitar lugares</>
              )}
            </button>
          </form>
        )}
      </div>
    </Modal>
  )
}

export default ModalUpgradePlan
