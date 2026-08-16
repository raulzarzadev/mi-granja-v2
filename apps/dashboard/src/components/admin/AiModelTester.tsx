'use client'

import { FormEvent, useMemo, useState } from 'react'
import { auth } from '@/lib/firebase'

interface FarmOption {
  id: string
  name: string
}

interface Attempt {
  provider: string
  model: string
  status: 'success' | 'error'
  error?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  provider?: string
  model?: string
  usage?: Record<string, unknown> | null
  attempts?: Attempt[]
  clientDailyLimit?: number
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  kimi: 'Kimi',
  openrouter: 'OpenRouter',
}

export default function AiModelTester({ farms }: { farms: FarmOption[] }) {
  const availableFarms = useMemo(
    () => [...farms].sort((a, b) => a.name.localeCompare(b.name)),
    [farms],
  )
  const [farmId, setFarmId] = useState(availableFarms[0]?.id ?? '')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [clientDailyLimit, setClientDailyLimit] = useState<number | null>(null)
  const [failedAttempts, setFailedAttempts] = useState<Attempt[]>([])

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = message.trim()
    if (!text || !farmId || isSending) return

    setIsSending(true)
    setError(null)
    setFailedAttempts([])
    setMessage('')
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text }
    setMessages((current) => [...current, userMessage])

    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('La sesión de administrador no está disponible')
      const response = await fetch('/api/admin/ai-test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmId,
          message: text,
          history: messages.map(({ role, text: historyText }) => ({ role, text: historyText })),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (typeof payload.clientDailyLimit === 'number') {
        setClientDailyLimit(payload.clientDailyLimit)
      }
      setFailedAttempts(Array.isArray(payload.attempts) ? payload.attempts : [])
      if (!response.ok) throw new Error(payload.error || 'El flujo de IA no pudo responder')
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: payload.message,
          provider: payload.provider,
          model: payload.model,
          usage: payload.usage,
          attempts: payload.attempts,
          clientDailyLimit: payload.clientDailyLimit,
        },
      ])
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'No se pudo probar el flujo')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section
      aria-labelledby="ai-model-test-title"
      className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="ai-model-test-title" className="text-lg font-bold text-gray-900">
            Probar flujo del cliente
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-600">
            Usa el contexto real de la granja y la configuración guardada de proveedor principal y
            fallbacks. La prueba no consume el cupo diario de ningún usuario.
          </p>
          <p className="mt-2 text-xs font-semibold text-emerald-700">
            Límite del cliente: {clientDailyLimit ?? 3} consultas al día · esta prueba no consume
            cupo
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMessages([])
              setError(null)
              setFailedAttempts([])
            }}
            className="min-h-11 self-start rounded-lg px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            Limpiar conversación
          </button>
        )}
      </div>

      <label className="block py-4 text-sm font-semibold text-gray-800">
        Granja usada como contexto
        <select
          value={farmId}
          onChange={(event) => {
            setFarmId(event.target.value)
            setMessages([])
            setError(null)
            setFailedAttempts([])
          }}
          className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100 sm:max-w-xl"
        >
          {availableFarms.length === 0 && <option value="">No hay granjas disponibles</option>}
          {availableFarms.map((farm) => (
            <option key={farm.id} value={farm.id}>
              {farm.name}
            </option>
          ))}
        </select>
      </label>

      <div
        aria-live="polite"
        className="min-h-52 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4"
      >
        {messages.length === 0 ? (
          <div className="flex min-h-44 items-center justify-center text-center">
            <div>
              <p className="font-semibold text-gray-800">Pregunta como lo haría un usuario</p>
              <p className="mt-1 text-sm text-gray-500">
                Por ejemplo: “¿Cuántas crías tienen el destete vencido?”
              </p>
            </div>
          </div>
        ) : (
          messages.map((chatMessage) => (
            <article
              key={chatMessage.id}
              className={`max-w-[92%] rounded-xl px-3 py-2 text-sm sm:max-w-[78%] ${
                chatMessage.role === 'user'
                  ? 'ml-auto bg-emerald-700 text-white'
                  : 'border border-gray-200 bg-white text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{chatMessage.text}</p>
              {chatMessage.provider && (
                <div className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500">
                  <p>
                    Respondió {PROVIDER_LABELS[chatMessage.provider] ?? chatMessage.provider} ·{' '}
                    {chatMessage.model}
                  </p>
                  <UsageSummary usage={chatMessage.usage} />
                  {chatMessage.attempts && chatMessage.attempts.length > 1 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer font-semibold text-gray-700">
                        Ver intentos y fallbacks
                      </summary>
                      <ul className="mt-1 space-y-1">
                        {chatMessage.attempts.map((attempt, index) => (
                          <li key={`${attempt.provider}-${attempt.model}-${index}`}>
                            {attempt.status === 'success' ? 'Correcto' : 'Falló'} ·{' '}
                            {PROVIDER_LABELS[attempt.provider] ?? attempt.provider} ·{' '}
                            {attempt.model}
                            {attempt.error ? ` · ${attempt.error}` : ''}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </article>
          ))
        )}
        {isSending && (
          <p className="max-w-[78%] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
            Construyendo contexto y probando el flujo configurado…
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <p className="font-semibold">La prueba falló</p>
          <p className="mt-1 break-words">{error}</p>
          {failedAttempts.length > 0 && (
            <ol className="mt-3 space-y-2">
              {failedAttempts.map((attempt, index) => (
                <li
                  key={`${attempt.provider}-${attempt.model}-${index}`}
                  className="rounded-md border border-red-200 bg-white p-2"
                >
                  <p className="font-semibold">
                    {index + 1}. {PROVIDER_LABELS[attempt.provider] ?? attempt.provider} ·{' '}
                    {attempt.model}
                  </p>
                  <p className="mt-1 break-words text-xs">{attempt.error || 'Error desconocido'}</p>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-1 text-xs">
            El detalle incluye los límites HTTP y errores de cada proveedor intentado.
          </p>
        </div>
      )}

      <form onSubmit={sendMessage} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm font-semibold text-gray-800">
          Mensaje
          <textarea
            value={message}
            maxLength={2_000}
            rows={2}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Haz una pregunta sobre la granja seleccionada"
            className="mt-1 min-h-20 w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        <button
          type="submit"
          disabled={!message.trim() || !farmId || isSending}
          className="min-h-11 rounded-lg bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isSending ? 'Probando…' : 'Enviar prueba'}
        </button>
      </form>
    </section>
  )
}

function UsageSummary({ usage }: { usage?: Record<string, unknown> | null }) {
  if (!usage) return <p className="mt-1">El proveedor no reportó consumo.</p>
  const prompt = Number(usage.prompt_tokens ?? usage.input_tokens ?? 0)
  const completion = Number(usage.completion_tokens ?? usage.output_tokens ?? 0)
  const total = Number(usage.total_tokens ?? prompt + completion)
  return (
    <p className="mt-1 tabular-nums">
      Tokens: {total.toLocaleString('es-MX')} total · {prompt.toLocaleString('es-MX')} entrada ·{' '}
      {completion.toLocaleString('es-MX')} salida
    </p>
  )
}
