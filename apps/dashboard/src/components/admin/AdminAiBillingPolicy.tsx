'use client'

import { useEffect, useState } from 'react'
import InputIconSelect from '@/components/inputs/InputIconSelect'
import type { AiBillingPolicy } from '@/lib/ai/billing-policy'
import { auth } from '@/lib/firebase'

export default function AdminAiBillingPolicy() {
  const [policy, setPolicy] = useState<AiBillingPolicy | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const request = async (method = 'GET') => {
    setBusy(true)
    setMessage('')
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('Inicia sesión de administrador.')
      const response = await fetch('/api/admin/ai-billing-policy', {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(method === 'PUT' ? { body: JSON.stringify({ policy }) } : {}),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar la política.')
      setPolicy(data.policy)
      if (method === 'PUT') setMessage('Política de IA guardada.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    void request()
  }, [])
  const number = (
    key:
      | 'freeDailyQueries'
      | 'monthlyCreditUsd'
      | 'monthlyInternalUsd'
      | 'ranchoMultiplier'
      | 'empresarialMultiplier',
    label: string,
  ) => (
    <label className="space-y-1 text-sm font-medium text-gray-700">
      {label}
      <input
        type="number"
        min={key === 'freeDailyQueries' ? 0 : 0.01}
        step={key === 'freeDailyQueries' ? 1 : 0.01}
        max={key.includes('Multiplier') ? 20 : undefined}
        required
        disabled={busy}
        value={policy?.[key] ?? ''}
        onChange={(event) =>
          setPolicy((current) =>
            current ? { ...current, [key]: Number(event.target.value) } : current,
          )
        }
        className="block min-h-11 w-full rounded-lg border border-gray-300 px-3"
      />
    </label>
  )
  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <h2 className="text-lg font-bold">Créditos de IA por plan</h2>
      <p className="text-sm text-gray-600">
        El regalo se activa únicamente tras el pago mensual confirmado. No se entrega en pruebas,
        pagos fallidos ni al asignar un plan manualmente. Los cambios se aplican a los próximos
        regalos; no modifican créditos ya otorgados.
      </p>
      {policy ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void request('PUT')
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {number('freeDailyQueries', 'Consultas gratis por día')}
            <div className="space-y-1 text-sm font-medium text-gray-700">
              <span id="ai-paid-plan-label">Plan con regalo mensual</span>
              <InputIconSelect
                aria-labelledby="ai-paid-plan-label"
                disabled={busy}
                value={policy.paidTierId}
                onChange={(value) => setPolicy({ ...policy, paidTierId: value })}
                options={[
                  { value: 'inicial', label: 'Inicial' },
                  { value: 'basico', label: 'Básico' },
                  { value: 'pro', label: 'Pro' },
                  { value: 'rancho', label: 'Rancho' },
                  { value: 'empresarial', label: 'Empresarial' },
                ]}
              />
            </div>
            {number('monthlyCreditUsd', 'Créditos mensuales visibles (USD)')}
            {number('monthlyInternalUsd', 'Presupuesto interno mensual (USD)')}
            {number('ranchoMultiplier', 'Multiplicador de IA en Rancho')}
            {number('empresarialMultiplier', 'Multiplicador de IA Empresarial (hasta 20×)')}
          </div>
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-lg bg-green-700 px-4 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
          >
            {busy ? 'Guardando…' : 'Guardar política de IA'}
          </button>
        </form>
      ) : (
        <p className="text-sm">{busy ? 'Cargando política…' : 'No se pudo cargar.'}</p>
      )}
      {message && (
        <p role="status" className="text-sm text-gray-700">
          {message}
        </p>
      )}
      {!policy && !busy && (
        <button type="button" onClick={() => void request()} className="min-h-11 text-green-700">
          Reintentar
        </button>
      )}
    </section>
  )
}
