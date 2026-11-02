import { fireEvent, render, screen } from '@testing-library/react'
import AiAssistant from '@/components/AiAssistant'
import type { AiProposalView } from '@/lib/ai/proposal-types'

const mockState = {
  farm: { currentFarm: { id: 'farm-1', name: 'San Petter' } },
  auth: { user: { id: 'user-1' } },
  animals: { animals: [] },
  breeding: { breedingRecords: [] },
}
jest.mock('react-redux', () => ({
  useSelector: (select: (state: unknown) => unknown) => select(mockState),
}))
jest.mock('@/lib/firebase', () => ({ auth: { currentUser: { getIdToken: async () => 'token' } } }))

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  HTMLElement.prototype.scrollIntoView = jest.fn()
})

it('conecta consulta, propuesta, revisión y comprobante sin reejecutar al reabrir', async () => {
  let proposal: AiProposalView
  let confirmations = 0
  jest.mocked(fetch).mockImplementation(async (url, options) => {
    const body = JSON.parse(String(options?.body))
    if (url === '/api/ai/chat') {
      proposal = {
        id: 'proposal-1',
        farmId: 'farm-1',
        conversationId: body.conversationId,
        revision: 1,
        status: 'ready',
        action: {
          type: 'register_weight',
          summary: 'Registrar peso',
          payload: { animalRef: 'A7', date: '2026-11-01', weightKg: 20 },
        },
        title: 'Registrar peso',
        summary: '20 kg para A7',
        effects: ['Se creará un registro de peso.'],
        expiresAt: '2099-01-01T00:00:00Z',
      }
      return {
        ok: true,
        json: async () => ({
          kind: 'proposed_action',
          message: 'Revisa este registro de peso.',
          proposal,
          usage: { used: 1, remaining: 2 },
        }),
      } as Response
    }
    if (body.operation === 'confirm') {
      confirmations++
      proposal = {
        ...proposal!,
        status: 'succeeded',
        receipt: {
          commandId: 'proposal-1',
          recordId: 'record-1',
          message: 'Peso registrado',
          href: '/?dashboard-main=registros',
          completedAt: '2026-11-01T14:00:00Z',
        },
      }
    }
    return { ok: true, json: async () => ({ proposal: proposal! }) } as Response
  })
  const first = render(<AiAssistant open showTrigger={false} />)
  const input = screen.getByLabelText('Mensaje para el asistente')
  fireEvent.change(input, { target: { value: 'Registra 20 kg para A7 hoy' } })
  fireEvent.submit(input.closest('form')!)
  fireEvent.click(await screen.findByRole('button', { name: 'Revisar acción' }))
  expect(confirmations).toBe(0)
  const chatCall = jest.mocked(fetch).mock.calls.find(([url]) => url === '/api/ai/chat')
  expect(JSON.parse(String(chatCall?.[1]?.body))).toEqual(
    expect.objectContaining({
      farmId: 'farm-1',
      conversationId: expect.any(String),
      timeZone: expect.any(String),
    }),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar y registrar' }))
  await screen.findByText('Peso registrado')
  expect(confirmations).toBe(1)
  first.unmount()
  render(<AiAssistant open showTrigger={false} />)
  await screen.findByRole('button', { name: 'Ver registro' })
  expect(confirmations).toBe(1)
  fireEvent.click(screen.getByRole('button', { name: /Nueva/ }))
  expect(screen.queryByText('Peso registrado')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Conversaciones/ }))
  fireEvent.click(screen.getByRole('button', { name: /Registra 20 kg para A7 hoy/ }))
  await screen.findByRole('button', { name: 'Ver registro' })
  expect(confirmations).toBe(1)
})

it('solo convierte enlaces válidos de la app o HTTP(S) y deja esquemas maliciosos como texto', async () => {
  jest.mocked(fetch).mockResolvedValue({
    ok: true,
    json: async () => ({
      kind: 'message',
      message: [
        '[Animales](/?dashboard-main=animales)',
        '[Ayuda](https://example.com/guide)',
        '[Servidor ajeno](//evil.test)',
        String.raw`[Desvío](/\evil.test)`,
        '[Ejecutar](javascript:alert)',
        '[Documento](data:text/html)',
        '[Inválido](https://)',
      ].join('\n'),
    }),
  } as Response)
  render(<AiAssistant open showTrigger={false} />)
  const input = screen.getByLabelText('Mensaje para el asistente')
  fireEvent.change(input, { target: { value: 'Muéstrame ayuda' } })
  fireEvent.submit(input.closest('form')!)
  expect(await screen.findByRole('button', { name: 'Animales →' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Ayuda' })).toHaveAttribute(
    'href',
    'https://example.com/guide',
  )
  for (const label of ['Servidor ajeno', 'Desvío', 'Ejecutar', 'Documento', 'Inválido']) {
    expect(screen.getByText(label).tagName).toBe('SPAN')
  }
})

it('impide navegar fuera del origen incluso si un comprobante devuelve una ruta con barras invertidas', async () => {
  const proposal: AiProposalView = {
    id: 'p',
    farmId: 'farm-1',
    conversationId: 'chat',
    revision: 1,
    status: 'succeeded',
    action: {
      type: 'register_weight',
      summary: 'Peso',
      payload: { animalRef: 'A7', date: '2026-11-01', weightKg: 20 },
    },
    title: 'Peso',
    summary: '20 kg',
    effects: [],
    expiresAt: '2099-01-01T00:00:00Z',
    receipt: {
      commandId: 'p',
      recordId: 'record',
      message: 'Peso registrado',
      href: String.raw`/\evil.test`,
      completedAt: '2026-11-01T12:00:00Z',
    },
  }
  localStorage.setItem(
    'ai-conversations-user-1-farm-1',
    JSON.stringify({
      activeId: 'chat',
      conversations: [
        {
          id: 'chat',
          title: 'Peso',
          updatedAt: 1,
          items: [{ role: 'assistant', text: 'Registro', proposal }],
        },
      ],
    }),
  )
  jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ proposal }) } as Response)
  const navigate = jest.spyOn(window.history, 'pushState')
  const onOpenChange = jest.fn()
  render(<AiAssistant open showTrigger={false} onOpenChange={onOpenChange} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Ver registro' }))
  expect(navigate).not.toHaveBeenCalled()
  expect(onOpenChange).not.toHaveBeenCalled()
  navigate.mockRestore()
})
