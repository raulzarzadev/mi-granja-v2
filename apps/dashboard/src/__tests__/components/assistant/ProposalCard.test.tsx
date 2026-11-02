import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import ProposalCard from '@/components/assistant/ProposalCard'
import { ProposalRequestError, requestProposal } from '@/lib/ai/proposal-client'
import type { AiProposalView } from '@/lib/ai/proposal-types'

jest.mock('react-redux', () => ({
  useSelector: (select: (state: unknown) => unknown) => select({ animals: { animals: [] } }),
}))
jest.mock('@/lib/ai/proposal-client', () => ({
  requestProposal: jest.fn(),
  ProposalRequestError: class extends Error {
    constructor(
      message: string,
      public proposal?: AiProposalView,
      public status?: number,
    ) {
      super(message)
    }
  },
}))
jest.mock('@/components/assistant/OperationFields', () => ({
  __esModule: true,
  default: ({
    draft,
    onChange,
  }: {
    draft: { payload: Record<string, unknown> }
    onChange: (value: unknown) => void
  }) => (
    <input
      aria-label="Peso en kg"
      value={String(draft.payload.weightKg)}
      onChange={(event) =>
        onChange({ ...draft, payload: { ...draft.payload, weightKg: Number(event.target.value) } })
      }
    />
  ),
}))

const proposal: AiProposalView = {
  id: 'proposal-1',
  farmId: 'farm-1',
  conversationId: 'conversation-1',
  revision: 1,
  status: 'ready',
  action: {
    type: 'register_weight',
    summary: 'Registrar peso',
    payload: { animalRef: 'A7', date: '2026-11-01', weightKg: 18 },
  },
  title: 'Registrar peso',
  summary: 'Registrar 18 kg para A7',
  effects: ['Se creará un registro de peso para A7.'],
  expiresAt: '2099-11-01T00:00:00Z',
}
const receipt = {
  commandId: 'proposal-1',
  recordId: 'record-1',
  message: 'Peso registrado',
  href: '/?dashboard-main=registros',
  completedAt: '2026-11-01T15:00:00Z',
}
const mockedRequest = jest.mocked(requestProposal)
const setup = (initialProposal = proposal) => {
  const onChange = jest.fn()
  const onNavigate = jest.fn()
  render(
    <ProposalCard
      initialProposal={initialProposal}
      farmId="farm-1"
      conversationId="conversation-1"
      onChange={onChange}
      onNavigate={onNavigate}
    />,
  )
  return { onChange, onNavigate }
}
beforeEach(() => jest.clearAllMocks())

it('comprueba el estado al abrir y registra solo tras confirmación explícita, una vez', async () => {
  let finish: (value: AiProposalView) => void = () => {}
  mockedRequest.mockImplementation(async (input) =>
    input.operation === 'confirm'
      ? new Promise((resolve) => {
          finish = resolve
        })
      : proposal,
  )
  const { onChange, onNavigate } = setup()
  fireEvent.click(await screen.findByRole('button', { name: 'Por revisar' }))
  const dialog = screen.getByRole('dialog', { name: 'Confirmar acción' })
  expect(within(dialog).getByRole('heading', { name: 'Registrar peso' })).toBeInTheDocument()
  expect(
    within(dialog).getByText('Guardarás un nuevo pesaje y se actualizará el peso del animal.'),
  ).toBeInTheDocument()
  expect(within(dialog).getByText('A7')).toBeInTheDocument()
  expect(mockedRequest.mock.calls.every(([input]) => input.operation === 'get')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar y registrar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Registrando…' }))
  expect(mockedRequest.mock.calls.filter(([input]) => input.operation === 'confirm')).toHaveLength(
    1,
  )
  expect(mockedRequest).toHaveBeenLastCalledWith({
    farmId: 'farm-1',
    proposalId: 'proposal-1',
    revision: 1,
    operation: 'confirm',
  })
  await act(async () => finish({ ...proposal, status: 'succeeded', receipt }))
  expect(onChange).toHaveBeenLastCalledWith(
    expect.objectContaining({ status: 'succeeded', receipt }),
  )
  expect(screen.getByText('Peso registrado')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Ver registro' }))
  expect(onNavigate).toHaveBeenCalledWith('/?dashboard-main=registros')
})

it('una edición se valida y se revisa antes de confirmar su nueva revisión', async () => {
  const revised: AiProposalView = {
    ...proposal,
    revision: 2,
    action: { ...proposal.action, payload: { animalRef: 'A7', date: '2026-11-01', weightKg: 20 } },
    summary: 'Registrar 20 kg para A7',
  }
  mockedRequest.mockImplementation(async (input) =>
    input.operation === 'revise' ? revised : proposal,
  )
  setup()
  fireEvent.click(await screen.findByRole('button', { name: 'Por revisar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Editar datos' }))
  fireEvent.change(screen.getByLabelText('Peso en kg'), { target: { value: '20' } })
  fireEvent.click(screen.getByRole('button', { name: 'Revisar cambios' }))
  await screen.findByRole('button', { name: 'Confirmar y registrar' })
  expect(mockedRequest.mock.calls.some(([input]) => input.operation === 'confirm')).toBe(false)
  expect(
    mockedRequest.mock.calls.find(([input]) => input.operation === 'revise')?.[0].action?.payload,
  ).toEqual({ animalRef: 'A7', date: '2026-11-01', weightKg: 20 })
  expect(screen.getByText('20')).toBeInTheDocument()
})

it('no confía en un éxito guardado localmente cuando no puede verificarlo', async () => {
  mockedRequest.mockRejectedValue(new Error('sin conexión'))
  setup({ ...proposal, status: 'succeeded', receipt })
  await screen.findByRole('alert')
  expect(screen.getByText('Por comprobar')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Ver registro' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Por revisar' })).not.toBeInTheDocument()
  expect(mockedRequest.mock.calls.some(([input]) => input.operation === 'confirm')).toBe(false)
})

it('un error de red durante la confirmación se reconcilia leyendo el comprobante', async () => {
  let reads = 0
  mockedRequest.mockImplementation(async (input) => {
    if (input.operation === 'confirm') throw new Error('Network error')
    reads++
    return reads > 1 ? { ...proposal, status: 'succeeded', receipt } : proposal
  })
  setup()
  fireEvent.click(await screen.findByRole('button', { name: 'Por revisar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar y registrar' }))
  await screen.findByText('Peso registrado')
  expect(mockedRequest.mock.calls.filter(([input]) => input.operation === 'confirm')).toHaveLength(
    1,
  )
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('bloquea una confirmación en conflicto hasta revisar una nueva propuesta', async () => {
  mockedRequest.mockImplementation(async (input) => {
    if (input.operation === 'confirm')
      throw new ProposalRequestError('Datos cambiaron', undefined, 409)
    return proposal
  })
  setup()
  fireEvent.click(await screen.findByRole('button', { name: 'Por revisar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar y registrar' }))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Confirmar y registrar' })).toBeDisabled(),
  )
  expect(screen.getByRole('button', { name: 'Editar datos' })).toBeEnabled()
  expect(screen.queryByText('Peso registrado')).not.toBeInTheDocument()
})

it('no ofrece ejecutar una propuesta vencida', async () => {
  mockedRequest.mockResolvedValue({
    ...proposal,
    status: 'expired',
    expiresAt: '2020-01-01T00:00:00Z',
  })
  setup()
  await screen.findByText('Vencida')
  expect(screen.queryByRole('button', { name: 'Por revisar' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Confirmar y registrar' })).not.toBeInTheDocument()
  expect(mockedRequest.mock.calls.every(([input]) => input.operation === 'get')).toBe(true)
})

it('cancelar una propuesta no registra el movimiento y conserva su estado en el chat', async () => {
  mockedRequest.mockImplementation(async (input) =>
    input.operation === 'cancel' ? { ...proposal, status: 'cancelled' } : proposal,
  )
  const { onChange } = setup()
  fireEvent.click(await screen.findByRole('button', { name: 'Por revisar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar propuesta' }))
  await screen.findByText('Cancelada')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(mockedRequest.mock.calls.some(([input]) => input.operation === 'confirm')).toBe(false)
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'cancelled' }))
})

it('cerrar la edición conserva la revisión abierta y no guarda cambios', async () => {
  mockedRequest.mockResolvedValue(proposal)
  setup()
  fireEvent.click(await screen.findByRole('button', { name: 'Por revisar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Editar datos' }))
  fireEvent.click(screen.getByRole('button', { name: 'close icon' }))
  expect(screen.getByRole('dialog', { name: 'Confirmar acción' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Editar datos' })).toBeInTheDocument()
  expect(mockedRequest.mock.calls.every(([input]) => input.operation === 'get')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'close icon' }))
  expect(screen.queryByRole('dialog', { name: 'Confirmar acción' })).not.toBeInTheDocument()
})
