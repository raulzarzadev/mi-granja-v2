'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import { auth } from '@/lib/firebase'

interface OpenRouterModel {
  id: string
  name: string
  contextLength: number | null
  promptPerMillion: number
  completionPerMillion: number
}

interface OpenRouterStatus {
  configured: boolean
  operational: boolean
  error?: string
  totalCredits?: number
  totalUsage?: number
  remainingCredits?: number
  hasCredit?: boolean
  models?: OpenRouterModel[]
}

const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

export default function AdminAiConfig() {
  const [model, setModel] = useState('')
  const [savedModel, setSavedModel] = useState('')
  const [provider, setProvider] = useState<OpenRouterStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('La sesión de administrador no está disponible')
      const response = await fetch('/api/admin/ai-config', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar la configuración')
      setModel(data.config.model)
      setSavedModel(data.config.model)
      setProvider(data.openRouter)
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'No se pudo cargar la configuración',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const selectedModel = useMemo(
    () => provider?.models?.find((candidate) => candidate.id === model) ?? null,
    [model, provider?.models],
  )

  async function saveConfig() {
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('La sesión de administrador no está disponible')
      const response = await fetch('/api/admin/ai-config', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la configuración')
      setSavedModel(data.config.model)
      setSuccess('Modelo actualizado. Las siguientes consultas usarán esta configuración.')
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'No se pudo guardar la configuración',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-xl border bg-white">
        <LoadingSpinner />
      </div>
    )
  }

  const remaining = provider?.remainingCredits ?? 0
  const modelExists = Boolean(selectedModel)

  return (
    <section aria-labelledby="ai-admin-title" className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="ai-admin-title" className="text-xl font-bold text-gray-900">
              Asistente IA
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Estado de OpenRouter y modelo utilizado por todas las consultas.
            </p>
          </div>
          <button
            type="button"
            onClick={loadConfig}
            className="min-h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Actualizar estado
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            label="Conexión"
            value={provider?.operational ? 'Disponible' : 'Con error'}
            tone={provider?.operational ? 'green' : 'red'}
          />
          <StatusCard
            label="Crédito restante"
            value={money.format(remaining)}
            tone={remaining > 0 ? 'green' : 'red'}
          />
          <StatusCard label="Créditos cargados" value={money.format(provider?.totalCredits ?? 0)} />
          <StatusCard label="Consumo acumulado" value={money.format(provider?.totalUsage ?? 0)} />
        </div>

        {!provider?.configured && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Falta configurar OPENROUTER_API_KEY en el servidor.
          </p>
        )}
        {provider?.configured && !provider.operational && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {provider.error || 'No se pudo consultar OpenRouter.'}
          </p>
        )}
        {provider?.operational && !provider.hasCredit && (
          <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            OpenRouter no tiene saldo disponible. Recarga créditos para que el asistente vuelva a
            responder.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <label htmlFor="ai-model" className="block text-sm font-bold text-gray-900">
          Modelo activo
        </label>
        <p className="mt-1 text-sm text-gray-600">
          Solo se muestran modelos compatibles con respuestas JSON estructuradas.
        </p>
        <input
          id="ai-model"
          list="openrouter-models"
          value={model}
          onChange={(event) => {
            setModel(event.target.value)
            setSuccess(null)
          }}
          placeholder="Busca o pega el ID del modelo"
          className="mt-3 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />
        <datalist id="openrouter-models">
          {(provider?.models ?? []).map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </datalist>

        {selectedModel && (
          <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">{selectedModel.name}</p>
            <p className="mt-1 break-words text-xs text-gray-500">{selectedModel.id}</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
              <span>Entrada: {money.format(selectedModel.promptPerMillion)} / 1M tokens</span>
              <span>Salida: {money.format(selectedModel.completionPerMillion)} / 1M tokens</span>
              {selectedModel.contextLength && (
                <span>Contexto: {selectedModel.contextLength.toLocaleString('es-MX')} tokens</span>
              )}
            </div>
          </div>
        )}

        {model && !modelExists && provider?.models?.length ? (
          <p className="mt-2 text-sm text-red-700">Selecciona un modelo disponible de la lista.</p>
        ) : null}
        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {success}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setModel(savedModel)}
            disabled={model === savedModel || isSaving}
            className="min-h-11 rounded-lg border border-gray-300 px-5 text-sm font-semibold text-gray-700 disabled:opacity-50"
          >
            Descartar cambios
          </button>
          <button
            type="button"
            onClick={saveConfig}
            disabled={model === savedModel || !modelExists || isSaving}
            className="min-h-11 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isSaving ? 'Guardando…' : 'Guardar modelo'}
          </button>
        </div>
      </div>
    </section>
  )
}

function StatusCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'green' | 'red'
}) {
  const toneClasses = {
    neutral: 'border-gray-200 bg-gray-50 text-gray-900',
    green: 'border-green-200 bg-green-50 text-green-800',
    red: 'border-red-200 bg-red-50 text-red-800',
  }
  return (
    <div className={`rounded-lg border p-3 ${toneClasses[tone]}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  )
}
