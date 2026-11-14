'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Modal } from '@/components/Modal'
import { auth } from '@/lib/firebase'

interface HistoryItem {
  id: string
  question: string
  answer: string | null
  status: 'pending' | 'completed' | 'failed'
  farmName: string
  farmId: string
  conversationId: string
  createdAt: string
  model: string | null
  tokens: number | null
}

export default function AiUserHistory({
  userId,
  name,
  onClose,
}: {
  userId: string
  name: string
  onClose: () => void
}) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const controller = useRef<AbortController | null>(null)
  const load = useCallback(
    async (after: string | null = null) => {
      if (busy.current) return
      busy.current = true
      const request = new AbortController()
      controller.current = request
      setLoading(true)
      setError('')
      try {
        const token = await auth.currentUser?.getIdToken()
        if (!token) throw new Error('La sesión de administrador no está disponible')
        const params = new URLSearchParams({ userId })
        if (after) params.set('cursor', after)
        const response = await fetch(`/api/admin/ai-history?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal: request.signal,
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'No se pudo cargar el historial')
        if (request.signal.aborted) return
        setItems((previous) => (after ? [...previous, ...payload.items] : payload.items))
        setCursor(payload.nextCursor)
      } catch (error) {
        if (!request.signal.aborted)
          setError(error instanceof Error ? error.message : 'No se pudo cargar el historial')
      } finally {
        if (!request.signal.aborted) {
          setLoading(false)
          busy.current = false
        }
      }
    },
    [userId],
  )
  useEffect(() => {
    void load()
    return () => {
      controller.current?.abort()
      busy.current = false
    }
  }, [load])

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Uso de IA"
      size="xl"
      mobileSheet
      footer={
        <div className="flex justify-between gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => void load()}
            className="min-h-11 cursor-pointer rounded-lg px-4 text-green-700 hover:bg-green-50 disabled:opacity-50"
          >
            Actualizar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 cursor-pointer rounded-lg border px-4 hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      }
    >
      <p className="break-all font-semibold text-gray-900">{name}</p>
      <p className="mt-1 text-sm text-gray-600">
        Preguntas y respuestas del asistente, de más reciente a más antigua. Solo se registran
        consultas nuevas desde la activación de este historial.
      </p>
      {error && (
        <div role="alert" className="my-3 rounded-lg bg-red-50 p-3 text-red-800">
          <p>{error}</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void load(items.length ? cursor : null)}
            className="min-h-11 cursor-pointer underline disabled:opacity-50"
          >
            Reintentar
          </button>
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="py-8 text-center text-gray-600">
          Este usuario todavía no tiene preguntas registradas.
        </p>
      )}
      <ol className="mt-4 space-y-4">
        {items.map((item) => (
          <li key={item.id} className="min-w-0 rounded-xl border border-gray-200 p-4">
            <p className="break-words text-sm text-gray-500">
              {new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(
                new Date(item.createdAt),
              )}{' '}
              · {item.farmName || item.farmId}
            </p>
            <p className="mt-3 text-sm font-semibold text-gray-600">Pregunta</p>
            <p className="whitespace-pre-wrap break-words text-gray-900">{item.question}</p>
            <p className="mt-3 text-sm font-semibold text-gray-600">Respuesta</p>
            <p className="whitespace-pre-wrap break-words text-gray-800">
              {item.answer ??
                (item.status === 'failed'
                  ? 'La consulta no se completó.'
                  : 'Respuesta pendiente de registro.')}
            </p>
            {item.model && (
              <p className="mt-3 break-words text-sm text-gray-500">
                {item.model}
                {item.tokens !== null && ` · ${item.tokens.toLocaleString('es-MX')} tokens`}
              </p>
            )}
          </li>
        ))}
      </ol>
      {loading && (
        <div role="status" aria-label="Cargando historial" className="flex justify-center py-6">
          <LoadingSpinner />
        </div>
      )}
      {cursor && !error && (
        <button
          type="button"
          disabled={loading}
          onClick={() => void load(cursor)}
          className="mt-4 min-h-11 w-full cursor-pointer rounded-lg border px-4 text-green-700 hover:bg-green-50 disabled:opacity-50"
        >
          Ver más preguntas
        </button>
      )}
    </Modal>
  )
}
