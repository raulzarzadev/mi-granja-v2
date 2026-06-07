'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { Modal } from '@/components/Modal'
import { RootState } from '@/features/store'
import { auth } from '@/lib/firebase'

type ChatItem = { role: 'user' | 'assistant'; text: string }

interface AiUsageView {
  used: number
  remaining: number
  totalTokens?: number
  totalCost?: number
  isUnlimited?: boolean
}

async function aiFetch(body: unknown) {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Usuario no autenticado')
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      typeof data.error === 'string'
        ? data.error
        : data.message || 'No pude procesar tu mensaje. Intenta con más datos.'
    throw new Error(message || `Error ${res.status}`)
  }
  return data
}

/** Renders plain text with [label](url) markdown links. Internal links use pushState + popstate so Tabs sync correctly. */
function MessageText({ text, onNavigate }: { text: string; onNavigate: (href: string) => void }) {
  const parts = text.split(/\[([^\]]+)\]\(([^)]+)\)/g)
  const nodes: React.ReactNode[] = []
  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      // plain text — preserve newlines
      nodes.push(
        ...parts[i]
          .split('\n')
          .flatMap((line, j) => [j > 0 ? <br key={`br-${i}-${j}`} /> : null, line]),
      )
    } else if (i % 3 === 1) {
      const label = parts[i]
      const href = parts[i + 1]
      const isInternal = href.startsWith('/') || href.startsWith('/?')
      nodes.push(
        isInternal ? (
          <button
            key={`link-${i}`}
            type="button"
            onClick={() => onNavigate(href)}
            className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700 underline-offset-2 hover:bg-emerald-100 hover:underline"
          >
            {label} →
          </button>
        ) : (
          <a
            key={`link-${i}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
          >
            {label}
          </a>
        ),
      )
      i++ // skip the url part
    }
  }
  return <>{nodes}</>
}

const SUGERENCIAS = [
  '¿Qué pendientes hay hoy?',
  '¿Cuántos animales tengo?',
  '¿Cómo registro un parto?',
  '¿Cómo crear un empadre?',
  '¿Cómo agregar un animal nuevo?',
  '¿Qué hembras están embarazadas?',
  '¿Cómo registrar una venta?',
  '¿Cómo crear un recordatorio?',
]

export default function AiAssistant() {
  const { currentFarm } = useSelector((state: RootState) => state.farm)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [items, setItems] = useState<ChatItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [usage, setUsage] = useState<AiUsageView | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const storageKey = currentFarm?.id ? `ai-chat-${currentFarm.id}` : null

  // Load history from localStorage when farm is set
  useEffect(() => {
    if (!storageKey) return
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setItems(JSON.parse(saved))
    } catch {
      // ignore corrupted data
    }
  }, [storageKey])

  // Persist history to localStorage on change
  useEffect(() => {
    if (!storageKey || items.length === 0) return
    try {
      // Keep last 60 messages to avoid bloating storage
      localStorage.setItem(storageKey, JSON.stringify(items.slice(-60)))
    } catch {
      // ignore quota errors
    }
  }, [items, storageKey])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items])

  const navigate = (href: string) => {
    const url = new URL(href, window.location.origin)
    window.history.pushState({}, '', url.toString())
    window.dispatchEvent(new PopStateEvent('popstate'))
    setOpen(false)
  }

  const canSend = useMemo(() => {
    return Boolean(currentFarm?.id && message.trim() && !isLoading)
  }, [currentFarm?.id, isLoading, message])

  const sendSuggestion = (text: string) => {
    setMessage('')
    sendText(text)
  }

  const send = () => {
    if (!currentFarm?.id || !message.trim()) return
    sendText(message.trim())
    setMessage('')
  }

  const sendText = async (text: string) => {
    if (!currentFarm?.id || !text.trim()) return
    setItems((prev) => [...prev, { role: 'user', text }])
    setIsLoading(true)
    try {
      const history = items.slice(-30).map((item) => ({ role: item.role, text: item.text }))
      const data = await aiFetch({ farmId: currentFarm.id, message: text, history })
      if (data.usage) setUsage(data.usage)
      setItems((prev) => [...prev, { role: 'assistant', text: data.message }])
    } catch (error) {
      setItems((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: error instanceof Error ? error.message : 'No pude procesar tu mensaje',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!currentFarm}
        className="inline-flex h-10 min-w-[112px] shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold shadow-sm ring-2 ring-green-800/20 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: '#15803d', color: '#ffffff' }}
        title="Abrir asistente IA"
      >
        <span>Asistente IA</span>
        {usage && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {usage.isUnlimited ? usage.used : `${usage.remaining}/3`}
          </span>
        )}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Asistente" size="lg">
        <div className="flex h-[70vh] flex-col gap-3">
          <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
            <span className="min-w-0 truncate">
              {currentFarm?.name || 'Sin granja seleccionada'}
              {usage
                ? usage.isUnlimited
                  ? ` · Dev: ${usage.used} consultas hoy${usage.totalCost ? ` · $${usage.totalCost.toFixed(4)}` : ''}${usage.totalTokens ? ` · ${usage.totalTokens} tokens` : ''}`
                  : ` · ${usage.remaining} usos restantes hoy`
                : ''}
            </span>
            <button
              type="button"
              onClick={() => {
                setItems([])
                if (storageKey) localStorage.removeItem(storageKey)
              }}
              className="shrink-0 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Nueva conversación
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3">
            {items.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Pregunta sobre tus animales, pendientes, partos, empadres o cómo realizar
                  cualquier acción en la app.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGERENCIAS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={isLoading}
                      onClick={() => sendSuggestion(s)}
                      className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {items.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`rounded-md px-3 py-2 text-sm ${
                  item.role === 'user'
                    ? 'ml-auto max-w-[85%] bg-emerald-700 text-white'
                    : 'mr-auto max-w-[92%] border border-gray-200 bg-white text-gray-800'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  <MessageText text={item.text} onNavigate={navigate} />
                </p>
              </div>
            ))}
            {isLoading && <div className="text-sm text-gray-500">Procesando...</div>}
            <div ref={bottomRef} />
          </div>

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              send()
            }}
          >
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ej. ¿Qué pendientes hay hoy?"
              className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Enviar
            </button>
          </form>
        </div>
      </Modal>
    </>
  )
}
