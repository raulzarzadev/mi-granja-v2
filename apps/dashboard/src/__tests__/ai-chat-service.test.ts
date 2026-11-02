/** @jest-environment node */
import { runOperationalChat } from '@/lib/ai/chat-service'
import { buildAiKnowledge } from '@/lib/ai/knowledge'
import { callAiProvider } from '@/lib/ai/openrouter'
import { AiProposalError, createAiProposal, getAiProposal } from '@/lib/ai/proposals'

jest.mock('@/lib/ai/knowledge', () => ({ buildAiKnowledge: jest.fn() }))
jest.mock('@/lib/ai/openrouter', () => ({ callAiProvider: jest.fn() }))
jest.mock('@/lib/ai/proposals', () => ({
  AiProposalError: class extends Error {
    constructor(
      message: string,
      public status = 400,
    ) {
      super(message)
    }
  },
  availableOperationCatalog: () => [],
  createAiProposal: jest.fn(),
  getAiProposal: jest.fn(),
}))
const params = {
  farmId: 'farm',
  farmName: 'Granja',
  userId: 'user',
  conversationId: 'chat',
  permissions: [],
  timeZone: 'America/Mazatlan',
  message: '¿Cuáles siguen?',
  history: [],
  access: { animals: true, breeding: true, reminders: true },
}
const bundle = {
  schemaVersion: 1,
  farmId: 'farm',
  generatedAt: '2026-01-01T12:00:00Z',
  index: {
    farmName: 'Granja',
    timeZone: 'America/Mazatlan',
    permissions: params.access,
    policy: '',
    documents: [],
  },
  documents: {
    'pendientes/destetes.json': {
      path: 'pendientes/destetes.json',
      schemaVersion: 1,
      generatedAt: '2026-01-01T12:00:00Z',
      source: ['animals'],
      available: true,
      loaded: true,
      coverage: { returned: 1, total: 2, hasMore: true, cursor: '1', offset: 0 },
      data: [],
    },
  },
}
beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(buildAiKnowledge).mockResolvedValue(bundle)
})
const result = (parsed: any) => ({
  parsed,
  provider: 'openai' as const,
  model: 'test',
  usage: { total_tokens: 10, cost: 0.01 },
})

it('reads another bounded page before answering and accounts for all model calls', async () => {
  jest
    .mocked(callAiProvider)
    .mockResolvedValueOnce(
      result({
        kind: 'read_document',
        message: 'Revisar',
        documentRequest: { topic: 'weaning', offset: 1, limit: 100 },
      }),
    )
    .mockResolvedValueOnce(result({ kind: 'message', message: 'A7 y A8' }))
  const response = await runOperationalChat(params)
  expect(buildAiKnowledge).toHaveBeenLastCalledWith(
    'farm',
    expect.any(String),
    params.access,
    expect.objectContaining({ page: { topic: 'weaning', offset: 1, limit: 100 } }),
  )
  expect(response.parsed.message).toBe('A7 y A8')
  expect(response.usage.total_tokens).toBe(20)
  expect(createAiProposal).not.toHaveBeenCalled()
})
it('stores a proposed command but never executes it during chat', async () => {
  const action = {
    type: 'register_weaning',
    summary: 'Destetar',
    payload: { animalRefs: ['A7'], date: '2026-01-01', destination: 'engorda' },
  }
  jest
    .mocked(callAiProvider)
    .mockResolvedValue(
      result({ kind: 'proposed_action', message: 'Ya lo registré sin confirmación', action }),
    )
  jest.mocked(createAiProposal).mockResolvedValue({ id: 'proposal' } as any)
  const response = await runOperationalChat(params)
  expect(response.proposal).toEqual({ id: 'proposal' })
  expect(response.parsed.message).toBe('Preparé la propuesta. Revisa los datos antes de confirmar.')
  expect(createAiProposal).toHaveBeenCalledWith(
    expect.objectContaining({ action, conversationId: 'chat', userId: 'user', farmId: 'farm' }),
  )
})
it('returns clarification if domain validation cannot prepare a proposal', async () => {
  jest
    .mocked(callAiProvider)
    .mockResolvedValue(result({ kind: 'proposed_action', message: 'Preparar', action: {} }))
  jest
    .mocked(createAiProposal)
    .mockRejectedValue(new AiProposalError('Hay dos animales con ese número'))
  const response = await runOperationalChat(params)
  expect(response.parsed).toEqual({
    kind: 'needs_clarification',
    message: 'Hay dos animales con ese número',
  })
  expect(response.proposal).toBeUndefined()
})
it('uses only server verified receipts belonging to this conversation', async () => {
  jest.mocked(callAiProvider).mockResolvedValue(result({ kind: 'message', message: 'Consulta' }))
  jest.mocked(getAiProposal).mockResolvedValue({
    conversationId: 'another-chat',
    status: 'succeeded',
    receipt: { message: 'No revelar' },
  } as any)
  await runOperationalChat({
    ...params,
    history: [{ role: 'assistant', text: 'Guardado', proposalId: 'p' }],
  })
  expect(jest.mocked(callAiProvider).mock.calls[0][0].context).toMatchObject({
    accionesDeLaConversacion: [],
  })
})

it('prepara todas las propuestas del lote sin ejecutar y advierte antes de confirmar', async () => {
  const actions = ['A1', 'A2'].map((animalRef) => ({
    type: 'register_weight',
    summary: 'Pesar',
    payload: { animalRef, date: '2026-11-01', weightKg: 20 },
  }))
  jest
    .mocked(callAiProvider)
    .mockResolvedValue(result({ kind: 'proposed_actions', message: 'Guardados', actions }))
  jest
    .mocked(createAiProposal)
    .mockResolvedValueOnce({ id: 'p1' } as any)
    .mockResolvedValueOnce({ id: 'p2' } as any)
  const response = await runOperationalChat(params)
  expect(createAiProposal).toHaveBeenCalledTimes(2)
  expect(response.proposals).toHaveLength(2)
  expect(response.parsed.message).toContain('Revisa con cuidado')
  expect(response.parsed.message).toContain('Todavía no se ha guardado')
})
it('no ofrece un lote incompleto si una acción no se puede preparar', async () => {
  const actions = ['A1', 'A2'].map((animalRef) => ({
    type: 'register_weight',
    summary: 'Pesar',
    payload: { animalRef, date: '2026-11-01', weightKg: 20 },
  }))
  jest
    .mocked(callAiProvider)
    .mockResolvedValue(result({ kind: 'proposed_actions', message: 'Revisar', actions }))
  jest
    .mocked(createAiProposal)
    .mockResolvedValueOnce({ id: 'p1' } as any)
    .mockRejectedValueOnce(new AiProposalError('Animal no disponible'))
  const response = await runOperationalChat(params)
  expect(response.proposals).toBeUndefined()
  expect(response.parsed.kind).toBe('needs_clarification')
  expect(response.parsed.message).toContain('No se ha ejecutado ningún movimiento')
})
