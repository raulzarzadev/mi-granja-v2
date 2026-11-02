import { render, screen } from '@testing-library/react'
import BatchProposalCard from '@/components/assistant/BatchProposalCard'
import type { AiProposalView } from '@/lib/ai/proposal-types'

jest.mock('@/components/assistant/ProposalCard', () => ({
  __esModule: true,
  default: ({
    initialProposal,
    compact,
  }: {
    initialProposal: AiProposalView
    compact: boolean
  }) => (
    <article>
      <p>{initialProposal.summary}</p>
      <button>{compact ? 'Revisar acción' : 'Revisar grande'}</button>
    </article>
  ),
}))
const create = (
  id: string,
  animalNumber: string,
  expiresAt = '2099-01-01T00:00:00Z',
): AiProposalView => ({
  id,
  farmId: 'farm',
  conversationId: 'chat',
  revision: 1,
  status: 'ready',
  title: 'Alta de animal',
  summary: `Animal ${animalNumber}`,
  effects: [],
  expiresAt,
  action: {
    type: 'create_animal',
    summary: 'Alta',
    payload: {
      animalNumber,
      type: 'oveja',
      gender: 'hembra',
      stage: 'reproductor',
      birthDate: '2023-11-01',
    },
  },
})
it('deja visible la revisión individual compacta y elimina la revisión conjunta', () => {
  render(
    <BatchProposalCard
      proposals={[create('p1', 'A5'), create('p2', 'A6')]}
      farmId="farm"
      conversationId="chat"
      onChange={jest.fn()}
      onNavigate={jest.fn()}
    />,
  )
  expect(screen.getAllByRole('button', { name: 'Revisar acción' })).toHaveLength(2)
  expect(screen.queryByRole('button', { name: 'Revisar lote completo' })).not.toBeInTheDocument()
  expect(screen.getByText(/Confirma cada acción por separado/)).toBeInTheDocument()
})
it('presenta solo el borrador más reciente para un mismo ID de alta', () => {
  render(
    <BatchProposalCard
      proposals={[create('old', 'A5'), create('new', 'A5', '2099-01-01T00:01:00Z')]}
      farmId="farm"
      conversationId="chat"
      onChange={jest.fn()}
      onNavigate={jest.fn()}
    />,
  )
  expect(screen.getAllByRole('button', { name: 'Revisar acción' })).toHaveLength(1)
})
