'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { auth } from '@/lib/firebase'

const OWNER_EMAIL = 'raulzarza.dev@gmail.com'

async function sendEmail(payload: object) {
  const token = await auth.currentUser?.getIdToken()
  const res = await fetch('/api/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Error al enviar')
}

interface ProFeatureBannerProps {
  feature?: string
}

/**
 * Banner informativo para funciones exclusivas del plan Pro.
 * Incluye mini formulario que envía correo al dueño y confirmación al usuario.
 */
const ProFeatureBanner: React.FC<ProFeatureBannerProps> = ({
  feature = 'Esta función',
}) => {
  const { user } = useSelector((s: RootState) => s.auth)
  const [granjas, setGranjas] = useState(0)
  const [colaboradores, setColaboradores] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setStatus('loading')
    try {
      // Email al dueño
      await sendEmail({
        to: OWNER_EMAIL,
        subject: `Solicitud de plan Pro — ${user.email}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px">
            <h2 style="color:#15803d">Nueva solicitud de plan Pro</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#6b7280">Usuario ID</td><td style="padding:6px 0;font-weight:600">${user.id}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0;font-weight:600">${user.email}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Granjas adicionales</td><td style="padding:6px 0;font-weight:600">${granjas}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Colaboradores</td><td style="padding:6px 0;font-weight:600">${colaboradores}</td></tr>
            </table>
          </div>
        `,
      })

      // Email de confirmación al usuario
      await sendEmail({
        to: user.email,
        subject: 'Recibimos tu solicitud — Mi Granja Pro',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px">
            <h2 style="color:#15803d">¡Recibimos tu solicitud! 🎉</h2>
            <p style="color:#374151">Hola, gracias por tu interés en el plan Pro de Mi Granja.</p>
            <p style="color:#374151">Pronto te enviaremos más información para comenzar tu período de prueba.</p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:0;color:#166534;font-size:14px"><strong>Tu solicitud incluye:</strong></p>
              <p style="margin:4px 0 0;color:#166534;font-size:14px">• ${granjas} ${granjas === 1 ? 'granja adicional' : 'granjas adicionales'}</p>
              <p style="margin:4px 0 0;color:#166534;font-size:14px">• ${colaboradores} ${colaboradores === 1 ? 'colaborador' : 'colaboradores'}</p>
            </div>
            <p style="color:#6b7280;font-size:13px">Si tienes dudas, responde este correo o escríbenos a hola@migranja.app</p>
          </div>
        `,
      })

      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <span className="text-xl flex-shrink-0">✅</span>
        <div>
          <p className="text-sm font-semibold text-green-800">¡Solicitud enviada!</p>
          <p className="text-sm text-green-700 mt-0.5">
            Te enviamos un correo de confirmación a <strong>{user?.email}</strong>. Pronto nos
            pondremos en contacto contigo.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">⭐</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">{feature} es exclusiva del plan Pro</p>
          <p className="text-sm text-amber-700 mt-0.5 mb-3">
            Puedes explorar el formulario. Solicita tu período de prueba para guardar registros
            masivos.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-amber-800 mb-1">
                  Granjas adicionales
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={granjas}
                  onChange={(e) => setGranjas(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm border border-amber-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-amber-800 mb-1">
                  Colaboradores
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={colaboradores}
                  onChange={(e) => setColaboradores(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm border border-amber-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            {status === 'error' && (
              <p className="text-xs text-red-600">Hubo un error al enviar. Intenta de nuevo.</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-medium rounded-md transition-colors cursor-pointer"
            >
              {status === 'loading' ? (
                <>
                  <span className="animate-spin text-xs">⏳</span> Enviando…
                </>
              ) : (
                <>✉️ Solicitar período de prueba</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProFeatureBanner
