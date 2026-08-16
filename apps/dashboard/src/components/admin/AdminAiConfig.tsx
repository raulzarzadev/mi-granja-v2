'use client'

import { useCallback, useEffect, useState } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import { auth } from '@/lib/firebase'
import AiUsageStats from './AiUsageStats'

const PROVIDERS = ['openai', 'kimi', 'openrouter'] as const
type ProviderName = (typeof PROVIDERS)[number]

interface ProviderConfig {
  enabled: boolean
  model: string
}

interface AiConfig {
  primaryProvider: ProviderName
  fallbackProviders: ProviderName[]
  providers: Record<ProviderName, ProviderConfig>
}

interface ProviderStatus {
  configured: boolean
  operational: boolean
  error?: string
  keyPreview?: string
  source?: 'firestore' | 'environment'
  totalCredits?: number
  totalUsage?: number
  remainingCredits?: number
  hasCredit?: boolean
  models?: Array<{ id: string; name: string }>
}

const PROVIDER_LABELS: Record<ProviderName, string> = {
  openai: 'OpenAI',
  kimi: 'Kimi',
  openrouter: 'OpenRouter',
}

const MODEL_SUGGESTIONS: Record<ProviderName, string[]> = {
  openai: ['gpt-5.6-luna', 'gpt-5.6-terra'],
  kimi: ['kimi-k2.6', 'kimi-k2.5'],
  openrouter: [],
}

export default function AdminAiConfig() {
  const [config, setConfig] = useState<AiConfig | null>(null)
  const [statuses, setStatuses] = useState<Record<ProviderName, ProviderStatus> | null>(null)
  const [apiKeys, setApiKeys] = useState<Partial<Record<ProviderName, string>>>({})
  const [removeApiKeys, setRemoveApiKeys] = useState<ProviderName[]>([])
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
      setConfig(data.config)
      setStatuses(data.providers)
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

  function updateProvider(provider: ProviderName, update: Partial<ProviderConfig>) {
    setConfig((current) =>
      current
        ? {
            ...current,
            providers: {
              ...current.providers,
              [provider]: { ...current.providers[provider], ...update },
            },
          }
        : current,
    )
    setSuccess(null)
  }

  function selectPrimary(provider: ProviderName) {
    setConfig((current) => {
      if (!current) return current
      return {
        ...current,
        primaryProvider: provider,
        fallbackProviders: [
          ...current.fallbackProviders.filter((candidate) => candidate !== provider),
          current.primaryProvider,
        ].filter((candidate, index, values) => values.indexOf(candidate) === index),
        providers: {
          ...current.providers,
          [provider]: { ...current.providers[provider], enabled: true },
        },
      }
    })
    setSuccess(null)
  }

  function moveFallback(provider: ProviderName, direction: -1 | 1) {
    setConfig((current) => {
      if (!current) return current
      const fallbacks = [...current.fallbackProviders]
      const from = fallbacks.indexOf(provider)
      const to = from + direction
      if (from < 0 || to < 0 || to >= fallbacks.length) return current
      ;[fallbacks[from], fallbacks[to]] = [fallbacks[to], fallbacks[from]]
      return { ...current, fallbackProviders: fallbacks }
    })
  }

  async function saveConfig() {
    if (!config) return
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('La sesión de administrador no está disponible')
      const response = await fetch('/api/admin/ai-config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, apiKeys, removeApiKeys }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la configuración')
      setConfig(data.config)
      setApiKeys({})
      setRemoveApiKeys([])
      setSuccess('Configuración guardada. Las nuevas consultas usarán este orden de proveedores.')
      await loadConfig()
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'No se pudo guardar la configuración',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !config || !statuses) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-xl border bg-white">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section aria-labelledby="ai-admin-title" className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 id="ai-admin-title" className="text-xl font-bold text-gray-900">
                Asistente IA
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-gray-600">
                El proveedor principal responde primero. Si falla, se intenta cada respaldo
                habilitado en el orden indicado.
              </p>
            </div>
            <button
              type="button"
              onClick={loadConfig}
              className="min-h-11 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Probar conexiones
            </button>
          </div>
          <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            Las claves se cifran con AES-256-GCM antes de guardarse. La clave maestra permanece solo
            en el servidor y las credenciales completas nunca regresan al navegador.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {PROVIDERS.map((provider) => {
            const providerConfig = config.providers[provider]
            const status = statuses[provider]
            const isPrimary = config.primaryProvider === provider
            const fallbackPosition = config.fallbackProviders.indexOf(provider)
            const suggestions =
              provider === 'openrouter'
                ? (statuses.openrouter.models ?? []).map((model) => model.id)
                : MODEL_SUGGESTIONS[provider]
            return (
              <article
                key={provider}
                className={`rounded-xl border bg-white p-4 ${isPrimary ? 'border-emerald-500 ring-1 ring-emerald-200' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900">{PROVIDER_LABELS[provider]}</h3>
                    <p className="mt-1 break-all text-xs text-gray-500">
                      {status.keyPreview || 'Sin API key'}
                    </p>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <label className="mt-4 flex min-h-10 items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="primary-provider"
                    checked={isPrimary}
                    onChange={() => selectPrimary(provider)}
                  />
                  Proveedor principal
                </label>
                <label className="flex min-h-10 items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={providerConfig.enabled}
                    disabled={isPrimary}
                    onChange={(event) =>
                      updateProvider(provider, { enabled: event.target.checked })
                    }
                  />
                  Habilitado como respaldo
                </label>

                {!isPrimary && (
                  <div className="mb-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    <span>Respaldo {fallbackPosition + 1}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`Subir ${PROVIDER_LABELS[provider]} en el orden`}
                        disabled={fallbackPosition <= 0}
                        onClick={() => moveFallback(provider, -1)}
                        className="min-h-8 min-w-8 rounded border bg-white disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Bajar ${PROVIDER_LABELS[provider]} en el orden`}
                        disabled={fallbackPosition === config.fallbackProviders.length - 1}
                        onClick={() => moveFallback(provider, 1)}
                        className="min-h-8 min-w-8 rounded border bg-white disabled:opacity-40"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                )}

                <label
                  htmlFor={`${provider}-model`}
                  className="block text-sm font-semibold text-gray-800"
                >
                  Modelo
                </label>
                <input
                  id={`${provider}-model`}
                  list={`${provider}-models`}
                  value={providerConfig.model}
                  onChange={(event) => updateProvider(provider, { model: event.target.value })}
                  className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
                <datalist id={`${provider}-models`}>
                  {suggestions.map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>

                <label
                  htmlFor={`${provider}-key`}
                  className="mt-4 block text-sm font-semibold text-gray-800"
                >
                  {status.configured ? 'Reemplazar API key' : 'API key'}
                </label>
                <input
                  id={`${provider}-key`}
                  type="password"
                  autoComplete="new-password"
                  value={apiKeys[provider] ?? ''}
                  onChange={(event) => {
                    setApiKeys((current) => ({ ...current, [provider]: event.target.value }))
                    setRemoveApiKeys((current) =>
                      current.filter((candidate) => candidate !== provider),
                    )
                  }}
                  placeholder={
                    status.configured ? 'Déjala vacía para conservarla' : 'Pega la clave aquí'
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />

                {status.source === 'firestore' && (
                  <label className="mt-3 flex min-h-9 items-center gap-2 text-xs text-red-700">
                    <input
                      type="checkbox"
                      checked={removeApiKeys.includes(provider)}
                      onChange={(event) =>
                        setRemoveApiKeys((current) =>
                          event.target.checked
                            ? [...current.filter((candidate) => candidate !== provider), provider]
                            : current.filter((candidate) => candidate !== provider),
                        )
                      }
                    />
                    Eliminar la clave cifrada al guardar
                  </label>
                )}

                {status.error && (
                  <p className="mt-3 break-words text-xs text-red-700">{status.error}</p>
                )}
                {provider === 'openrouter' && status.operational && (
                  <p className="mt-3 text-xs text-gray-600">
                    Crédito disponible: ${(status.remainingCredits ?? 0).toFixed(2)} USD
                  </p>
                )}
              </article>
            )
          })}
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {success}
          </p>
        )}

        <div className="sticky bottom-3 flex justify-end rounded-xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={saveConfig}
            disabled={isSaving}
            className="min-h-11 w-full rounded-lg bg-emerald-600 px-6 text-sm font-bold text-white hover:bg-emerald-700 disabled:bg-gray-400 sm:w-auto"
          >
            {isSaving ? 'Cifrando y guardando…' : 'Guardar configuración'}
          </button>
        </div>
      </section>

      <AiUsageStats />
    </div>
  )
}

function StatusBadge({ status }: { status: ProviderStatus }) {
  if (!status.configured) {
    return (
      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
        Sin clave
      </span>
    )
  }
  return status.operational ? (
    <span className="shrink-0 rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
      Disponible
    </span>
  ) : (
    <span className="shrink-0 rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">
      Con error
    </span>
  )
}
