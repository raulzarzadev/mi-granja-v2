import { act, renderHook, waitFor } from '@testing-library/react'
import { useAiConversations } from '@/hooks/useAiConversations'

beforeEach(() => localStorage.clear())

it('conserva el historial anterior como conversación y lo migra una sola vez', async () => {
  localStorage.setItem('ai-chat-farm', JSON.stringify([{ role: 'user', text: 'Mis animales' }]))
  const first = renderHook(() => useAiConversations('user', 'farm'))
  await waitFor(() => expect(first.result.current.ready).toBe(true))
  expect(first.result.current.conversations[0].title).toBe('Mis animales')
  expect(localStorage.getItem('ai-chat-farm')).toBeNull()
  const id = first.result.current.activeId
  first.unmount()
  const second = renderHook(() => useAiConversations('user', 'farm'))
  expect(second.result.current.activeId).toBe(id)
  expect(second.result.current.conversations).toHaveLength(1)
})

it('crea y retoma conversaciones sin mezclar sus mensajes ni las respuestas pendientes', () => {
  const { result } = renderHook(() => useAiConversations('user', 'farm'))
  let first = ''
  let second = ''
  act(() => {
    first = result.current.createConversation()
    result.current.append(first, { role: 'user', text: 'Leche' })
  })
  act(() => {
    second = result.current.createConversation()
    result.current.append(second, { role: 'user', text: 'Partos' })
  })
  act(() => result.current.append(first, { role: 'assistant', text: 'Respuesta de leche' }))
  expect(result.current.activeId).toBe(second)
  expect(result.current.conversations.find((c) => c.id === second)?.items).toEqual([
    { role: 'user', text: 'Partos' },
  ])
  act(() => result.current.setActiveId(first))
  expect(result.current.conversations.find((c) => c.id === first)?.items).toHaveLength(2)
})

it('separa el historial por usuario y granja', () => {
  const first = renderHook(() => useAiConversations('user', 'farm'))
  act(() => {
    const id = first.result.current.createConversation()
    first.result.current.append(id, { role: 'user', text: 'Privado' })
  })
  first.unmount()
  const otherUser = renderHook(() => useAiConversations('other', 'farm'))
  expect(otherUser.result.current.conversations).toEqual([])
  const otherFarm = renderHook(() => useAiConversations('user', 'another-farm'))
  expect(otherFarm.result.current.conversations).toEqual([])
})

it('sincroniza el historial entre los accesos móvil y escritorio', () => {
  const desktop = renderHook(() => useAiConversations('user', 'farm'))
  const mobile = renderHook(() => useAiConversations('user', 'farm'))
  act(() => {
    const id = desktop.result.current.createConversation()
    desktop.result.current.append(id, { role: 'user', text: 'Hola' })
  })
  expect(mobile.result.current.conversations[0].items[0].text).toBe('Hola')
  act(() =>
    mobile.result.current.append(mobile.result.current.activeId!, {
      role: 'assistant',
      text: 'Respuesta',
    }),
  )
  expect(desktop.result.current.conversations[0].items).toHaveLength(2)
})

it('conserva las tarjetas de acciones y actualiza su comprobante sin duplicar mensajes', () => {
  const first = renderHook(() => useAiConversations('user', 'farm'))
  let conversationId = ''
  act(() => {
    conversationId = first.result.current.createConversation()
  })
  const proposal = {
    id: 'proposal',
    farmId: 'farm',
    conversationId,
    revision: 1,
    status: 'ready' as const,
    action: {
      type: 'register_weight' as const,
      summary: 'Peso',
      payload: { animalRef: 'A1', date: '2026-11-01', weightKg: 20 },
    },
    title: 'Registrar peso',
    summary: '20 kg para A1',
    effects: ['Registro de peso'],
    expiresAt: '2099-01-01T00:00:00Z',
  }
  act(() =>
    first.result.current.append(conversationId, {
      role: 'assistant',
      text: 'Revisa el registro.',
      proposal,
    }),
  )
  first.unmount()
  const second = renderHook(() => useAiConversations('user', 'farm'))
  expect(second.result.current.conversations[0].items[0].proposal?.id).toBe('proposal')
  act(() =>
    second.result.current.updateProposal(conversationId, {
      ...proposal,
      status: 'succeeded',
      receipt: {
        commandId: 'proposal',
        recordId: 'record',
        message: 'Peso registrado',
        href: '/?dashboard-main=registros',
        completedAt: '2026-11-01T12:00:00Z',
      },
    }),
  )
  expect(second.result.current.conversations[0].items).toHaveLength(1)
  expect(second.result.current.conversations[0].items[0].proposal?.receipt?.recordId).toBe('record')
})

it('descarta tarjetas de acciones atribuidas a mensajes del usuario', () => {
  localStorage.setItem(
    'ai-conversations-user-farm',
    JSON.stringify({
      activeId: 'conversation',
      conversations: [
        {
          id: 'conversation',
          title: 'Consulta',
          updatedAt: 1,
          items: [{ role: 'user', text: 'Hola', proposal: { id: 'fake' } }],
        },
      ],
    }),
  )
  const { result } = renderHook(() => useAiConversations('user', 'farm'))
  expect(result.current.conversations[0].items[0].proposal).toBeUndefined()
})

it('conserva los lotes y actualiza un comprobante individual sin perder los demás', () => {
  const hook = renderHook(() => useAiConversations('user', 'farm'))
  let chat = ''
  act(() => {
    chat = hook.result.current.createConversation()
  })
  const make = (id: string): import('@/lib/ai/proposal-types').AiProposalView => ({
    id,
    farmId: 'farm',
    conversationId: chat,
    revision: 1,
    status: 'ready',
    title: 'Pesar',
    summary: id,
    effects: [],
    expiresAt: '2099-01-01T00:00:00Z',
    action: {
      type: 'register_weight',
      summary: id,
      payload: { animalRef: id, date: '2026-11-01', weightKg: 20 },
    },
  })
  const first = make('A1'),
    second = make('A2')
  act(() =>
    hook.result.current.append(chat, {
      role: 'assistant',
      text: 'Revisar lote',
      proposals: [first, second],
    }),
  )
  const saved = {
    ...first,
    status: 'succeeded' as const,
    receipt: {
      commandId: first.id,
      recordId: first.id,
      message: 'Guardado',
      href: '/',
      completedAt: '2026-11-01T00:00:00Z',
    },
  }
  act(() => hook.result.current.updateProposal(chat, saved))
  hook.unmount()
  const reopened = renderHook(() => useAiConversations('user', 'farm'))
  expect(reopened.result.current.conversations[0].items[0].proposals).toEqual([saved, second])
})
