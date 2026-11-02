'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AiProposalView } from '@/lib/ai/proposal-types'
import { parseProposalView } from '@/lib/ai/proposal-view'

export type ChatItem = {
  role: 'user' | 'assistant'
  text: string
  proposal?: AiProposalView
  proposals?: AiProposalView[]
}
export type AiConversation = { id: string; title: string; updatedAt: number; items: ChatItem[] }
const validItems = (value: unknown, farmId?: string, conversationId?: string): ChatItem[] =>
  Array.isArray(value)
    ? value
        .filter(
          (item): item is ChatItem =>
            !!item &&
            (item.role === 'user' || item.role === 'assistant') &&
            typeof item.text === 'string',
        )
        .map((item) => {
          const proposal = item.role === 'assistant' ? parseProposalView(item.proposal) : undefined
          const proposals =
            item.role === 'assistant' && Array.isArray(item.proposals)
              ? item.proposals
                  .slice(0, 10)
                  .map(parseProposalView)
                  .filter(
                    (value): value is AiProposalView =>
                      !!value && value.farmId === farmId && value.conversationId === conversationId,
                  )
              : []
          return {
            role: item.role,
            text: item.text,
            ...(proposals.length ? { proposals } : {}),
            ...(proposal && proposal.farmId === farmId && proposal.conversationId === conversationId
              ? { proposal }
              : {}),
          }
        })
    : []

export function useAiConversations(userId?: string, farmId?: string) {
  const key = userId && farmId ? `ai-conversations-${userId}-${farmId}` : null
  const [conversations, setConversations] = useState<AiConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState('')
  const legacyKey = farmId ? `ai-chat-${farmId}` : null
  const migrated = useRef(false)

  useEffect(() => {
    if (!key) return
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        const list: AiConversation[] = Array.isArray(parsed.conversations)
          ? parsed.conversations
              .filter(
                (c: AiConversation) =>
                  c &&
                  typeof c.id === 'string' &&
                  typeof c.title === 'string' &&
                  typeof c.updatedAt === 'number',
              )
              .map((c: AiConversation) => ({ ...c, items: validItems(c.items, farmId, c.id) }))
          : []
        setConversations(list)
        setActiveId(
          list.some((c) => c.id === parsed.activeId) ? parsed.activeId : (list[0]?.id ?? null),
        )
      } else if (legacyKey) {
        const items = validItems(JSON.parse(localStorage.getItem(legacyKey) || '[]'))
        if (items.length) {
          const conversation = {
            id: crypto.randomUUID(),
            title:
              items.find((item) => item.role === 'user')?.text.slice(0, 70) ||
              'Conversación anterior',
            updatedAt: Date.now(),
            items,
          }
          setConversations([conversation])
          setActiveId(conversation.id)
          migrated.current = true
        }
      }
    } catch {
      setStorageError('No se pudo recuperar el historial de este navegador.')
    }
    setReady(true)
  }, [key, legacyKey, farmId])

  useEffect(() => {
    if (!ready || !key) return
    try {
      const serialized = JSON.stringify({ conversations, activeId })
      if (localStorage.getItem(key) !== serialized) {
        localStorage.setItem(key, serialized)
        window.dispatchEvent(new CustomEvent('ai-conversations:updated', { detail: key }))
      }
      if (migrated.current && legacyKey) {
        localStorage.removeItem(legacyKey)
        migrated.current = false
      }
      setStorageError('')
    } catch {
      setStorageError(
        'No se pudo guardar el historial en este navegador. Tus mensajes siguen disponibles mientras esta ventana esté abierta.',
      )
    }
  }, [ready, key, legacyKey, conversations, activeId])

  useEffect(() => {
    if (!key || !ready) return
    const sync = (event: Event) => {
      if (event instanceof StorageEvent ? event.key !== key : (event as CustomEvent).detail !== key)
        return
      try {
        const saved = JSON.parse(localStorage.getItem(key) || '{}')
        if (!Array.isArray(saved.conversations)) return
        const list = saved.conversations
          .filter(
            (conversation: AiConversation) =>
              conversation &&
              typeof conversation.id === 'string' &&
              typeof conversation.title === 'string' &&
              typeof conversation.updatedAt === 'number',
          )
          .map((conversation: AiConversation) => ({
            ...conversation,
            items: validItems(conversation.items, farmId, conversation.id),
          }))
        setConversations(list)
        setActiveId(
          list.some((conversation: AiConversation) => conversation.id === saved.activeId)
            ? saved.activeId
            : (list[0]?.id ?? null),
        )
      } catch {
        /* Keep the current conversation if storage is unavailable. */
      }
    }
    window.addEventListener('storage', sync)
    window.addEventListener('ai-conversations:updated', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('ai-conversations:updated', sync)
    }
  }, [key, ready, farmId])

  const createConversation = () => {
    const empty = conversations.find((c) => !c.items.length)
    if (empty) {
      setActiveId(empty.id)
      return empty.id
    }
    const id = crypto.randomUUID()
    setConversations((previous) => [
      { id, title: 'Nueva conversación', updatedAt: Date.now(), items: [] },
      ...previous,
    ])
    setActiveId(id)
    return id
  }
  const append = (id: string, item: ChatItem) => {
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === id
          ? {
              ...conversation,
              title:
                !conversation.items.length && item.role === 'user'
                  ? item.text.slice(0, 70)
                  : conversation.title,
              updatedAt: Date.now(),
              items: [...conversation.items, item].slice(-60),
            }
          : conversation,
      ),
    )
  }
  const updateProposal = useCallback(
    (conversationId: string, proposal: AiProposalView) => {
      if (proposal.farmId !== farmId || proposal.conversationId !== conversationId) return
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                items: conversation.items.map((item) =>
                  item.proposal?.id === proposal.id
                    ? { ...item, proposal }
                    : item.proposals?.some((value) => value.id === proposal.id)
                      ? {
                          ...item,
                          proposals: item.proposals.map((value) =>
                            value.id === proposal.id ? proposal : value,
                          ),
                        }
                      : item,
                ),
              }
            : conversation,
        ),
      )
    },
    [farmId],
  )
  return {
    conversations,
    activeId,
    setActiveId,
    createConversation,
    append,
    updateProposal,
    ready,
    storageError,
  }
}
