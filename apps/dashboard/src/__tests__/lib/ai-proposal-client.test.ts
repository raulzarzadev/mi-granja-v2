import { requestProposal } from '@/lib/ai/proposal-client'
import type { AiProposalView } from '@/lib/ai/proposal-types'
import { parseProposalView } from '@/lib/ai/proposal-view'

jest.mock('@/lib/firebase', () => ({ auth: { currentUser: { getIdToken: async () => 'token' } } }))
const proposal: AiProposalView = {
  id: 'p',
  farmId: 'farm',
  conversationId: 'chat',
  revision: 1,
  status: 'ready',
  action: {
    type: 'register_weight',
    summary: 'Peso',
    payload: { animalRef: 'A1', date: '2026-11-01', weightKg: 20 },
  },
  title: 'Peso',
  summary: '20 kg',
  effects: ['Peso registrado'],
  expiresAt: '2099-01-01T00:00:00Z',
}

beforeEach(() => jest.clearAllMocks())

it('envía solo ID y revisión para confirmar; nunca una acción arbitraria', async () => {
  jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ proposal }) } as Response)
  await requestProposal({
    farmId: 'farm',
    proposalId: 'p',
    revision: 1,
    operation: 'confirm',
    action: proposal.action,
  })
  const body = JSON.parse(String(jest.mocked(fetch).mock.calls[0][1]?.body))
  expect(body).toEqual({
    farmId: 'farm',
    proposalId: 'p',
    revision: 1,
    operation: 'confirm',
    timeZone: expect.any(String),
  })
  expect(body.action).toBeUndefined()
})

it('rechaza respuestas de otra granja aunque incluyan una propuesta válida', async () => {
  jest.mocked(fetch).mockResolvedValue({
    ok: true,
    json: async () => ({ proposal: { ...proposal, farmId: 'other' } }),
  } as Response)
  await expect(
    requestProposal({ farmId: 'farm', proposalId: 'p', operation: 'get' }),
  ).rejects.toThrow('No se pudo comprobar')
})

it('no acepta un éxito sin comprobante persistido ni acciones desconocidas', () => {
  expect(parseProposalView({ ...proposal, status: 'succeeded' })).toBeUndefined()
  expect(
    parseProposalView({ ...proposal, action: { type: 'execute_code', payload: {} } }),
  ).toBeUndefined()
})
