'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import ProposalCard from '@/components/assistant/ProposalCard'
import Button from '@/components/buttons/Button'
import { EmojiIcon } from '@/components/Icon/emoji-icons'
import { Modal } from '@/components/Modal'
import { RootState } from '@/features/store'
import { useAiConversations } from '@/hooks/useAiConversations'
import { browserTimeZone } from '@/lib/ai/proposal-client'
import { parseProposalView } from '@/lib/ai/proposal-view'
import { auth } from '@/lib/firebase'

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

function messageLink(href: string): { kind: 'internal' | 'external'; href: string } | undefined {
  const origin =
    typeof window === 'undefined' ? 'https://mi-granja.invalid' : window.location.origin
  try {
    if (href.startsWith('/') && !href.startsWith('//')) {
      const url = new URL(href, origin)
      if (url.origin !== origin) return undefined
      return { kind: 'internal', href: `${url.pathname}${url.search}${url.hash}` }
    }
    if (/^https?:\/\//i.test(href)) {
      const url = new URL(href)
      if (url.protocol === 'https:' || url.protocol === 'http:')
        return { kind: 'external', href: url.href }
    }
  } catch {
    /* Invalid model links remain readable text. */
  }
  return undefined
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
      const link = messageLink(href)
      nodes.push(
        link?.kind === 'internal' ? (
          <button
            key={`link-${i}`}
            type="button"
            onClick={() => onNavigate(link.href)}
            className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700 underline-offset-2 hover:bg-emerald-100 hover:underline"
          >
            {label} →
          </button>
        ) : link?.kind === 'external' ? (
          <a
            key={`link-${i}`}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
          >
            {label}
          </a>
        ) : (
          <span key={`link-${i}`}>{label}</span>
        ),
      )
      i++ // skip the url part
    }
  }
  return <>{nodes}</>
}

const SUGERENCIAS = [
  '¿Qué pendientes hay hoy?',
  '¿Qué animales requieren atención?',
  '¿Cuáles fueron los últimos movimientos?',
  '¿Cuánta leche se registró hoy?',
  '¿Qué lecheras no tienen ordeño hoy?',
  '¿Qué partos puedo registrar?',
  '¿Qué destetes están próximos?',
  '¿Cómo registro leche?',
  '¿Cómo agrego un animal?',
  '¿Cuántos animales activos tengo?',
]

type AiAssistantProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
}

export default function AiAssistant(props: AiAssistantProps = {}) {
  const farmId = useSelector((state: RootState) => state.farm.currentFarm?.id)
  const userId = useSelector((state: RootState) => state.auth.user?.id)
  return <ScopedAiAssistant key={`${userId ?? ''}:${farmId ?? ''}`} {...props} />
}

function ScopedAiAssistant({
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
} = {}) {
  const { currentFarm } = useSelector((state: RootState) => state.farm)
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = (value: boolean) => {
    setInternalOpen(value)
    onOpenChange?.(value)
  }
  const [message, setMessage] = useState('')
  const userId = useSelector((state: RootState) => state.auth.user?.id)
  const {
    conversations,
    activeId,
    setActiveId,
    createConversation,
    append,
    updateProposal,
    ready,
    storageError,
  } = useAiConversations(userId, currentFarm?.id)
  const items = conversations.find((conversation) => conversation.id === activeId)?.items ?? []
  const [showHistory, setShowHistory] = useState(false)
  const pending = useRef(false)
  const [isLoading, setIsLoading] = useState(false)
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null)
  const [usage, setUsage] = useState<AiUsageView | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items])

  const navigate = (href: string) => {
    const link = messageLink(href)
    if (link?.kind !== 'internal') return
    const url = new URL(link.href, window.location.origin)
    window.history.pushState({}, '', url.toString())
    window.dispatchEvent(new PopStateEvent('popstate'))
    setOpen(false)
  }

  const canSend = useMemo(() => {
    return Boolean(ready && currentFarm?.id && message.trim() && !isLoading)
  }, [ready, currentFarm?.id, isLoading, message])

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
    if (!ready || !currentFarm?.id || !text.trim() || pending.current) return
    pending.current = true
    const conversationId = activeId ?? createConversation()
    append(conversationId, { role: 'user', text })
    setPendingConversationId(conversationId)
    setIsLoading(true)
    try {
      const history = items.slice(-30).map((item) => ({
        role: item.role,
        text: item.text,
        ...(item.role === 'assistant' && item.proposal ? { proposalId: item.proposal.id } : {}),
      }))
      const data = await aiFetch({
        farmId: currentFarm.id,
        conversationId,
        timeZone: browserTimeZone(),
        message: text,
        history,
      })
      if (data.usage) setUsage(data.usage)
      const proposal = parseProposalView(data.proposal)
      const scopedProposal =
        proposal?.farmId === currentFarm.id && proposal.conversationId === conversationId
          ? proposal
          : undefined
      append(conversationId, {
        role: 'assistant',
        text: data.message,
        ...(scopedProposal ? { proposal: scopedProposal } : {}),
      })
    } catch (error) {
      append(conversationId, {
        role: 'assistant',
        text: error instanceof Error ? error.message : 'No pude procesar tu mensaje',
      })
    } finally {
      pending.current = false
      setPendingConversationId(null)
      setIsLoading(false)
    }
  }

  return (
    <>
      {showTrigger && (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!currentFarm}
          variant="filled"
          color="success"
          icon="comments"
          className="h-11 min-w-[160px] shrink-0 rounded-full border border-emerald-900/10 bg-emerald-600 px-5 text-base font-bold shadow-lg shadow-emerald-900/20 hover:bg-emerald-700"
          title="Abrir asistente IA"
        >
          Asistente IA
          {usage && (
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold">
              {usage.isUnlimited ? usage.used : `${usage.remaining}/3`}
            </span>
          )}
        </Button>
      )}

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={
          <span className="flex min-w-0 items-center gap-3">
            <span className="shrink-0">Asistente</span>
            <span className="truncate rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">
              {currentFarm?.name || 'Sin granja'}
            </span>
          </span>
        }
        size="lg"
      >
        <div className="flex h-[min(72dvh,640px)] min-h-0 flex-col gap-3">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <button
              type="button"
              disabled={!ready}
              onClick={() => setShowHistory((value) => !value)}
              aria-expanded={showHistory}
              className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 disabled:opacity-50 ${showHistory ? 'bg-green-50 text-green-900' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-5 w-5"
              >
                <path d="M4 6h16M4 12h12M4 18h8" />
              </svg>
              Conversaciones <span className="text-xs text-slate-500">{conversations.length}</span>
            </button>
            <button
              type="button"
              disabled={!ready}
              onClick={() => {
                createConversation()
                setMessage('')
                setShowHistory(false)
              }}
              className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 text-xs font-semibold text-green-800 transition-colors hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              <span aria-hidden="true" className="text-base font-normal">
                +
              </span>{' '}
              Nueva
            </button>
          </div>
          {storageError && (
            <p role="alert" className="text-xs text-amber-800">
              {storageError}
            </p>
          )}
          {showHistory ? (
            <section
              className="min-h-0 flex-1 space-y-2 overflow-y-auto"
              aria-label="Conversaciones anteriores"
            >
              <h3 className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                Tu historial
              </h3>
              {!conversations.length && (
                <p className="px-2 py-6 text-sm text-slate-500">
                  Aquí aparecerán tus conversaciones.
                </p>
              )}
              {[...conversations]
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    aria-pressed={conversation.id === activeId}
                    onClick={() => {
                      setActiveId(conversation.id)
                      setMessage('')
                      setShowHistory(false)
                    }}
                    className={`flex min-h-20 w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 ${conversation.id === activeId ? 'bg-green-50 text-green-950' : 'bg-slate-50 text-slate-800 hover:bg-slate-100'}`}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-green-700"
                    >
                      <EmojiIcon emoji="💬" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {conversation.title}
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-500">
                        {conversation.items.at(-1)?.text || 'Comienza una consulta'}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {new Date(conversation.updatedAt).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        · {conversation.items.length} mensajes
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-slate-400">
                      →
                    </span>
                  </button>
                ))}
            </section>
          ) : (
            <>
              {!!items.length && (
                <p className="shrink-0 truncate px-1 text-xs font-medium text-slate-500">
                  {conversations.find((conversation) => conversation.id === activeId)?.title}
                </p>
              )}
              <div
                role="log"
                aria-label="Mensajes de la conversación"
                aria-live="polite"
                className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain rounded-2xl bg-slate-50/80 p-3 sm:p-4"
              >
                {!items.length && (
                  <div className="flex min-h-full flex-col justify-center py-5">
                    <span
                      aria-hidden="true"
                      className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-2xl text-green-800"
                    >
                      <EmojiIcon emoji="✨" />
                    </span>
                    <h3 className="text-xl font-bold tracking-tight text-slate-900">
                      ¿Cómo va tu granja hoy?
                    </h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                      Revisa tus animales, consulta pendientes o encuentra tu próximo paso.
                    </p>
                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      {SUGERENCIAS.slice(0, 6).map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={isLoading || !ready}
                          onClick={() => sendSuggestion(s)}
                          className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 text-left text-xs font-medium leading-5 text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-green-50 hover:text-green-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 disabled:opacity-50"
                        >
                          {s}
                          <span aria-hidden="true" className="text-green-700">
                            ↗
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {items.map((item, index) => (
                  <div
                    key={`${item.role}-${index}`}
                    className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`w-fit max-w-[92%] break-words rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === 'user' ? 'rounded-tr-md bg-green-700 text-white' : 'rounded-tl-md bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/60'}`}
                    >
                      <span className="sr-only">{item.role === 'user' ? 'Tú' : 'Asistente'}: </span>
                      <div className="whitespace-pre-wrap">
                        <MessageText text={item.text} onNavigate={navigate} />
                      </div>
                      {item.role === 'assistant' &&
                        item.proposal &&
                        activeId &&
                        currentFarm?.id && (
                          <ProposalCard
                            initialProposal={item.proposal}
                            farmId={currentFarm.id}
                            conversationId={activeId}
                            onChange={(proposal) => updateProposal(activeId, proposal)}
                            onNavigate={navigate}
                          />
                        )}
                    </div>
                  </div>
                ))}
                {isLoading && pendingConversationId === activeId && (
                  <div
                    role="status"
                    className="flex items-center gap-2 px-1 text-xs text-slate-500"
                  >
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full bg-green-600 motion-safe:animate-pulse"
                    />
                    Consultando tu granja…
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              <form
                className="flex shrink-0 items-center gap-2 rounded-2xl bg-white p-1.5 ring-1 ring-slate-300 focus-within:ring-2 focus-within:ring-green-700"
                onSubmit={(event) => {
                  event.preventDefault()
                  send()
                }}
              >
                <input
                  aria-label="Mensaje para el asistente"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Pregúntame sobre tu granja…"
                  className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={!canSend}
                  aria-label="Enviar mensaje"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-700 text-white transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M12 19V5m-6 6 6-6 6 6" />
                  </svg>
                </button>
              </form>
            </>
          )}
          {usage && (
            <p className="shrink-0 text-center text-xs text-slate-500">
              {usage.isUnlimited
                ? `${usage.used} consultas hoy`
                : `${usage.remaining} consultas restantes hoy`}
            </p>
          )}
        </div>
      </Modal>
    </>
  )
}
