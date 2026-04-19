'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import PageShell from '@/components/PageShell'
import type { RootState } from '@/features/store'
import { useBilling } from '@/hooks/useBilling'
import { auth } from '@/lib/firebase'
import { PRICE_PER_PLACE_MXN } from '@/types/billing'

const OWNER_EMAIL = 'raulzarza.dev@gmail.com'

async function sendEmail(payload: { to: string; subject: string; html: string }) {
  const token = await auth.currentUser?.getIdToken()
  const res = await fetch('/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Error al enviar')
}

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

function Check({ muted = false }: { muted?: boolean }) {
  return (
    <svg
      className={`w-4 h-4 flex-shrink-0 mt-0.5 ${muted ? 'text-gray-400' : 'text-green-600'}`}
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

export default function PlanPage() {
  const router = useRouter()
  const { user } = useSelector((s: RootState) => s.auth)
  const { planType, usage } = useBilling()
  const isPro = planType === 'pro'

  const [granjas, setGranjas] = useState(0)
  const [colaboradores, setColaboradores] = useState(0)
  const [mensaje, setMensaje] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setStatus('loading')
    try {
      await sendEmail({
        to: OWNER_EMAIL,
        subject: `Solicitud de plan Pro — ${user.email}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;color:#111827">
            <h2 style="color:#15803d">Nueva solicitud de plan Pro ⭐</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 4px;color:#6b7280;width:40%">Usuario ID</td><td style="padding:8px 4px;font-weight:600">${user.id}</td></tr>
              <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 4px;color:#6b7280">Email</td><td style="padding:8px 4px;font-weight:600">${user.email}</td></tr>
              <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 4px;color:#6b7280">Granjas</td><td style="padding:8px 4px;font-weight:600">${granjas}</td></tr>
              <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 4px;color:#6b7280">Colaboradores</td><td style="padding:8px 4px;font-weight:600">${colaboradores}</td></tr>
              ${mensaje ? `<tr><td style="padding:8px 4px;color:#6b7280;vertical-align:top">Mensaje</td><td style="padding:8px 4px">${mensaje}</td></tr>` : ''}
            </table>
          </div>`,
      })
      await sendEmail({
        to: user.email,
        subject: 'Recibimos tu solicitud — Mi Granja Pro',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;color:#111827">
            <h2 style="color:#15803d">¡Recibimos tu solicitud! 🎉</h2>
            <p>Hola, gracias por tu interés en el plan Pro de Mi Granja.</p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0">
              <p style="margin:0 0 8px;color:#166534;font-size:14px;font-weight:600">Tu solicitud incluye:</p>
              <p style="margin:0 0 4px;color:#166534;font-size:14px">• ${granjas} ${granjas === 1 ? 'granja adicional' : 'granjas adicionales'}</p>
              <p style="margin:0;color:#166534;font-size:14px">• ${colaboradores} ${colaboradores === 1 ? 'colaborador' : 'colaboradores'}</p>
              ${mensaje ? `<p style="margin:8px 0 0;color:#166534;font-size:14px">• <em>${mensaje}</em></p>` : ''}
            </div>
            <p>Pronto te enviaremos más información para comenzar tu período de prueba.</p>
            <p style="color:#6b7280;font-size:13px;margin-top:24px">— El equipo de Mi Granja</p>
          </div>`,
      })
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <PageShell title="Tu Plan">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Plan actual */}
        <div className={`rounded-xl border-2 p-5 flex items-center gap-4 ${isPro ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
          <div className={`text-3xl`}>{isPro ? '⭐' : '🌱'}</div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{isPro ? 'Plan Pro' : 'Plan Gratis'}</p>
            {isPro && usage && (
              <p className="text-sm text-gray-600 mt-0.5">
                {usage.usedPlaces}/{usage.totalPlaces} lugares usados · {usage.farmCount}{' '}
                {usage.farmCount === 1 ? 'granja' : 'granjas'} · {usage.collaboratorCount}{' '}
                {usage.collaboratorCount === 1 ? 'colaborador' : 'colaboradores'}
              </p>
            )}
            {!isPro && (
              <p className="text-sm text-gray-500 mt-0.5">1 granja incluida sin costo</p>
            )}
          </div>
          {isPro && (
            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
              Activo
            </span>
          )}
        </div>

        {/* Comparativa */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-600 mb-3">Gratis</p>
            <ul className="space-y-2">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check muted />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border-2 border-green-500 bg-green-50 p-4 relative overflow-hidden">
            <span className="absolute top-0 right-0 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
              PRO
            </span>
            <p className="text-sm font-semibold text-green-800 mb-3">Pro ⭐</p>
            <ul className="space-y-2">
              {PRO_FEATURES.map((f, i) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check />
                  <span className={i === 0 ? 'text-green-700' : 'text-green-800 font-medium'}>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Formulario solo para usuarios free */}
        {!isPro && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            {status === 'sent' ? (
              <div className="text-center space-y-3 py-4">
                <div className="text-4xl">✅</div>
                <p className="font-semibold text-green-800">¡Solicitud enviada!</p>
                <p className="text-sm text-gray-600">
                  Te enviamos confirmación a <strong>{user?.email}</strong>.<br />
                  Pronto nos ponemos en contacto.
                </p>
                <button
                  onClick={() => router.back()}
                  className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors cursor-pointer"
                >
                  Volver
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Agrega lugares y crece
                </h3>
                <p className="text-sm text-gray-500 -mt-2">
                  Cada lugar te da acceso a una granja adicional o un colaborador. Trabaja en equipo y gestiona más desde un solo lugar.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="plan-granjas" className="block text-sm font-medium text-gray-700 mb-1">
                      Granjas adicionales
                    </label>
                    <input
                      id="plan-granjas"
                      type="number"
                      min={0}
                      max={99}
                      value={granjas}
                      onChange={(e) => setGranjas(Math.max(0, Number(e.target.value)))}
                      disabled={status === 'loading'}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label htmlFor="plan-colabs" className="block text-sm font-medium text-gray-700 mb-1">
                      Colaboradores
                    </label>
                    <input
                      id="plan-colabs"
                      type="number"
                      min={0}
                      max={99}
                      value={colaboradores}
                      onChange={(e) => setColaboradores(Math.max(0, Number(e.target.value)))}
                      disabled={status === 'loading'}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Calculadora de precio */}
                {(granjas + colaboradores) > 0 && (
                  <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-center justify-between">
                    <div className="text-sm text-green-800">
                      <span className="font-medium">{granjas + colaboradores} lugar{granjas + colaboradores !== 1 ? 'es' : ''}</span>
                      <span className="text-green-600"> × ${PRICE_PER_PLACE_MXN} MXN/mes</span>
                    </div>
                    <div className="text-lg font-bold text-green-900">
                      ${((granjas + colaboradores) * PRICE_PER_PLACE_MXN).toLocaleString('es-MX')} MXN/mes
                    </div>
                  </div>
                )}
                {(granjas + colaboradores) === 0 && (
                  <p className="text-xs text-gray-500 text-center">
                    Ajusta las cantidades para ver el precio estimado · ${PRICE_PER_PLACE_MXN} MXN por lugar/mes
                  </p>
                )}
                <div>
                  <label htmlFor="plan-mensaje" className="block text-sm font-medium text-gray-700 mb-1">
                    ¿Alguna duda o funcionalidad que quisieras ver?{' '}
                    <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <textarea
                    id="plan-mensaje"
                    rows={3}
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    disabled={status === 'loading'}
                    placeholder="Cuéntanos tu caso o pídenos una funcionalidad. La consideraremos para futuras versiones."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-green-500 placeholder:text-gray-400 disabled:opacity-60"
                  />
                </div>
                {status === 'error' && (
                  <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    Hubo un error al enviar. Intenta de nuevo.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors cursor-pointer"
                >
                  {status === 'loading' ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Enviando…
                    </>
                  ) : (
                    '✉️ Solicitar lugares'
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </PageShell>
  )
}
