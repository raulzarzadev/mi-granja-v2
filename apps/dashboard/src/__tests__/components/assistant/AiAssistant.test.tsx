import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AiAssistant from '@/components/AiAssistant'
import ModalBreedingDetails from '@/components/ModalBreedingDetails'
import type { AiProposalView } from '@/lib/ai/proposal-types'
import type { Animal } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'

const mockState = {
  farm: { currentFarm: { id: 'farm-1', name: 'San Petter' } },
  auth: { user: { id: 'user-1' } },
  animals: { animals: [] as Animal[] },
  breeding: { breedingRecords: [] as BreedingRecord[] },
}
const mockUpdateBreeding = jest.fn().mockResolvedValue(undefined)
const mockRemoveBreeding = jest.fn().mockResolvedValue(undefined)
const mockBirth = jest.fn().mockResolvedValue(undefined)
jest.mock('@/hooks/useBreedingCRUD', () => ({
  useBreedingCRUD: () => ({
    breedingRecords: mockState.breeding.breedingRecords,
    updateBreedingRecord: mockUpdateBreeding,
    deleteBreedingRecord: jest.fn(),
  }),
}))
jest.mock('@/hooks/useRecordMovements', () => ({
  useRecordMovements: () => ({ birth: mockBirth }),
}))
jest.mock('@/hooks/useFarmPermissions', () => ({ useFarmPermissions: () => ({ has: () => true }) }))
jest.mock('@/components/Dashboard/Animals/hooks/useBreedingHandlers', () => ({
  useBreedingHandlers: () => ({ handleRemoveFromBreeding: mockRemoveBreeding }),
}))
jest.mock('@/components/ModalConfirmPregnancy', () => ({
  __esModule: true,
  default: ({ onSubmit, onClose, breedingRecord }: any) => (
    <div>
      <p>Formulario gestación</p>
      <button
        onClick={async () => {
          await onSubmit({
            ...breedingRecord,
            femaleBreedingInfo: breedingRecord.femaleBreedingInfo.map((info: any) => ({
              ...info,
              pregnancyConfirmedDate: new Date(),
            })),
          })
          onClose()
        }}
      >
        Guardar gestación
      </button>
    </div>
  ),
}))
jest.mock('@/components/ModalBirthForm', () => ({
  __esModule: true,
  default: ({ onSubmit, onClose }: any) => (
    <div>
      <p>Formulario parto</p>
      <button
        onClick={async () => {
          await onSubmit({ animalId: 'female' })
          onClose()
        }}
      >
        Guardar parto
      </button>
    </div>
  ),
}))
jest.mock('@/components/inputs/AnimalSelector', () => ({
  __esModule: true,
  default: ({ animals, selectedIds, onAdd }: any) => (
    <div>
      {animals.map((animal: Animal) => (
        <button key={animal.id} onClick={() => onAdd(animal.id)}>
          {animal.animalNumber}
        </button>
      ))}
      <p>{selectedIds.length} elegidas</p>
    </div>
  ),
}))
jest.mock('@/components/ModalEditBreeding', () => ({
  __esModule: true,
  default: ({ record, onSubmit, onClose }: any) => (
    <div>
      <p>Formulario editar empadre</p>
      <button
        onClick={async () => {
          await onSubmit(record.id, { notes: 'Editado' })
          onClose()
        }}
      >
        Guardar empadre editado
      </button>
    </div>
  ),
}))
jest.mock('react-redux', () => ({
  useSelector: (select: (state: unknown) => unknown) => select(mockState),
}))
jest.mock('@/components/ModalAnimalDetails', () => ({
  __esModule: true,
  default: ({ animal, onClose }: { animal: Animal; onClose: () => void }) => (
    <div role="dialog" aria-label="Detalles del animal">
      <p>Ficha de {animal.animalNumber}</p>
      <button onClick={onClose}>Cerrar ficha</button>
    </div>
  ),
}))
jest.mock('@/lib/firebase', () => ({ auth: { currentUser: { getIdToken: async () => 'token' } } }))

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  mockState.animals.animals = []
  mockState.breeding.breedingRecords = []
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

it('abre la ficha de un animal mencionado y vuelve al chat conservando la conversación', async () => {
  mockState.animals.animals = [
    { id: 'animal-9', farmId: 'farm-1', animalNumber: 'A9', name: 'Luna' } as Animal,
  ]
  jest.mocked(fetch).mockResolvedValue({
    ok: true,
    json: async () => ({ kind: 'message', message: 'Revisa A9. Luna tiene un pendiente.' }),
  } as Response)
  render(<AiAssistant open showTrigger={false} />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Mensaje para el asistente' }), {
    target: { value: 'Revisar animal' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }))
  const mentions = await screen.findAllByRole('button', { name: 'Ver animal A9' })
  expect(mentions).toHaveLength(2)
  fireEvent.click(mentions[0])
  expect(screen.getByRole('dialog', { name: 'Detalles del animal' })).toHaveTextContent(
    'Ficha de A9',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar ficha' }))
  expect(screen.queryByRole('dialog', { name: 'Detalles del animal' })).not.toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Mensaje para el asistente' })).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'Ver animal A9' })).toHaveLength(2)
})

it('abre el empadre mencionado sobre el chat y permite consultar su macho', async () => {
  mockState.animals.animals = [{ id: 'male', farmId: 'farm-1', animalNumber: 'A6' } as Animal]
  mockState.breeding.breedingRecords = [
    {
      id: 'breeding-1',
      farmId: 'farm-1',
      farmerId: 'user-1',
      breedingId: '26440',
      maleId: 'male',
      breedingDate: null,
      femaleBreedingInfo: [],
      status: 'finished',
    },
  ]
  jest.mocked(fetch).mockResolvedValue({
    ok: true,
    json: async () => ({ kind: 'message', message: 'Revisa el empadre 26440.' }),
  } as Response)
  render(<AiAssistant open showTrigger={false} />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Mensaje para el asistente' }), {
    target: { value: 'Revisar montas' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Ver empadre 26440' }))
  expect(screen.getByText('Empadre 26440')).toBeInTheDocument()
  expect(screen.getByText('Terminado')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Ver animal A6' }))
  expect(screen.getByRole('dialog', { name: 'Detalles del animal' })).toHaveTextContent(
    'Ficha de A6',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar ficha' }))
  expect(screen.getByText('Empadre 26440')).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Mensaje para el asistente' })).toBeInTheDocument()
})

it('confirma gestación sin cerrar la ficha y exige confirmación para sacar una hembra', async () => {
  const animals = [{ id: 'female', animalNumber: 'A11' } as Animal]
  const record: BreedingRecord = {
    id: 'b',
    farmerId: 'u',
    breedingId: '26441',
    maleId: 'male',
    breedingDate: null,
    femaleBreedingInfo: [{ femaleId: 'female' }],
    status: 'active',
  }
  const close = jest.fn()
  render(
    <ModalBreedingDetails
      record={record}
      animals={animals}
      onClose={close}
      onOpenAnimal={jest.fn()}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar gestación' }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar gestación' }))
  await waitFor(() =>
    expect(mockUpdateBreeding).toHaveBeenCalledWith(
      'b',
      expect.objectContaining({ status: 'finished' }),
    ),
  )
  expect(close).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Sacar a A11 del empadre' }))
  expect(mockRemoveBreeding).not.toHaveBeenCalled()
  expect(screen.getByText(/Se eliminará este empadre completo/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(mockRemoveBreeding).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Sacar a A11 del empadre' }))
  fireEvent.click(screen.getAllByRole('button', { name: 'Sacar del empadre' }).at(-1)!)
  await waitFor(() => expect(mockRemoveBreeding).toHaveBeenCalledWith(record, 'female'))
})

it('registra el parto con el movimiento compartido conservando la ficha', async () => {
  const animals = [
    {
      id: 'female',
      animalNumber: 'A9',
      gender: 'hembra',
      pregnantAt: new Date(),
      pregnantBreedingRecordId: 'b',
    } as Animal,
  ]
  const record: BreedingRecord = {
    id: 'b',
    farmerId: 'u',
    breedingId: '26441',
    maleId: 'male',
    breedingDate: null,
    femaleBreedingInfo: [{ femaleId: 'female', pregnancyConfirmedDate: new Date() }],
    status: 'finished',
  }
  const close = jest.fn()
  render(
    <ModalBreedingDetails
      record={record}
      animals={animals}
      onClose={close}
      onOpenAnimal={jest.fn()}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Registrar parto' }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar parto' }))
  await waitFor(() =>
    expect(mockBirth).toHaveBeenCalledWith(expect.any(String), { animalId: 'female' }, record),
  )
  expect(close).not.toHaveBeenCalled()
})

it('agrega solo hembras disponibles y conserva los datos existentes del empadre', async () => {
  const existing = { femaleId: 'existing', outcomeNotes: 'Conservar historial' }
  const record: BreedingRecord = {
    id: 'b',
    farmerId: 'u',
    breedingId: '26441',
    maleId: 'male',
    breedingDate: null,
    femaleBreedingInfo: [existing],
    status: 'active',
  }
  mockState.breeding.breedingRecords = [
    record,
    { ...record, id: 'other', femaleBreedingInfo: [{ femaleId: 'busy' }] },
  ]
  const animals = [
    { id: 'male', animalNumber: 'M1', gender: 'macho', type: 'vaca' },
    ...['available', 'busy', 'pregnant', 'sold', 'other-species', 'existing'].map((id) => ({
      id,
      animalNumber: id,
      gender: 'hembra',
      type: id === 'other-species' ? 'oveja' : 'vaca',
      status: id === 'sold' ? 'vendido' : 'activo',
      ...(id === 'pregnant' ? { pregnantAt: new Date() } : {}),
    })),
  ] as Animal[]
  const close = jest.fn()
  render(
    <ModalBreedingDetails
      record={record}
      animals={animals}
      onClose={close}
      onOpenAnimal={jest.fn()}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Agregar hembras al empadre' }))
  expect(screen.queryByRole('button', { name: 'busy' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'pregnant' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'sold' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'other-species' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'available' }))
  fireEvent.click(screen.getByRole('button', { name: 'Agregar hembras' }))
  await waitFor(() =>
    expect(mockUpdateBreeding).toHaveBeenCalledWith('b', {
      femaleBreedingInfo: [existing, { femaleId: 'available' }],
    }),
  )
  expect(close).not.toHaveBeenCalled()
})

it('abre editar junto al estado y conserva la ficha al guardar', async () => {
  const record: BreedingRecord = {
    id: 'b',
    farmerId: 'u',
    breedingId: '26441',
    maleId: 'male',
    breedingDate: null,
    femaleBreedingInfo: [],
    status: 'active',
  }
  const close = jest.fn()
  render(
    <ModalBreedingDetails record={record} animals={[]} onClose={close} onOpenAnimal={jest.fn()} />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Editar empadre' }))
  expect(screen.getByText('Formulario editar empadre')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar empadre editado' }))
  await waitFor(() => expect(mockUpdateBreeding).toHaveBeenCalledWith('b', { notes: 'Editado' }))
  expect(close).not.toHaveBeenCalled()
  expect(screen.getByText('Empadre 26441')).toBeInTheDocument()
})
