import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ModalNewRecord from '@/components/ModalNewRecord'

const mockAnimals = [
  {
    id: 'h',
    farmId: 'f',
    animalNumber: 'H1',
    gender: 'hembra',
    type: 'oveja',
    stage: 'reproductor',
    computedStage: 'reproductor',
    status: 'activo',
  },
  {
    id: 'c',
    farmId: 'f',
    animalNumber: 'C1',
    gender: 'hembra',
    type: 'oveja',
    stage: 'cria',
    computedStage: 'cria',
    status: 'activo',
  },
]
const mockDeath = jest.fn()
const mockUndo = jest.fn()
jest.mock('@/hooks/useAnimalCRUD', () => ({ useAnimalCRUD: () => ({ animals: mockAnimals }) }))
jest.mock('@/hooks/useBreedingCRUD', () => ({ useBreedingCRUD: () => ({ breedingRecords: [] }) }))
jest.mock('@/hooks/useRecordMovements', () => ({
  useRecordMovements: () => ({
    context: { userId: 'u', farmId: 'f' },
    death: mockDeath,
    undo: mockUndo,
  }),
}))
jest.mock('@/components/Modal', () => ({
  Modal: ({ isOpen, onClose, children }: any) =>
    isOpen ? (
      <div>
        <button onClick={onClose}>X modal</button>
        {children}
      </div>
    ) : null,
}))
jest.mock('@/components/buttons/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, disabled, type = 'button' }: any) => (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))
jest.mock('@/components/inputs/InputSelectAnimals', () => ({
  __esModule: true,
  default: ({ animals, onAdd, selectedIds }: any) => (
    <div>
      {animals
        .filter((a: any) => !selectedIds.includes(a.id))
        .map((a: any) => (
          <button key={a.id} onClick={() => onAdd(a.id)}>
            Elegir {a.animalNumber}
          </button>
        ))}
    </div>
  ),
}))
jest.mock('@/components/BreedingForm', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ModalSaleForm', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ModalBirthForm', () => ({ __esModule: true, default: () => null }))
const storageKey = 'mi-granja:new-record-draft:v1:u:f'
beforeEach(() => {
  localStorage.clear()
  jest.clearAllMocks()
})
const openDeath = () => {
  fireEvent.click(screen.getByRole('button', { name: /Nuevo Registro/ }))
  fireEvent.click(screen.getByRole('button', { name: /Muerte/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Elegir H1' }))
  fireEvent.change(screen.getByLabelText('Causa de muerte'), { target: { value: 'disease' } })
}
it('muerte: revisar, confirmar, éxito y deshacer; no reaparece el borrador al cerrar', async () => {
  mockDeath.mockResolvedValue({
    id: 'movement',
    title: 'Muerte registrada',
    details: { Motivo: 'Enfermedad' },
    appliedToAnimals: ['h'],
  })
  mockUndo.mockResolvedValue(undefined)
  render(<ModalNewRecord />)
  openDeath()
  fireEvent.change(screen.getByLabelText('Descripción (opcional)'), {
    target: { value: 'Nota capturada' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Registrar muerte' }))
  expect(mockDeath).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar muerte' }))
  await screen.findByText('✓ Muerte registrada')
  expect(mockDeath).toHaveBeenCalledWith(
    expect.any(String),
    ['h'],
    expect.any(Date),
    'disease',
    'Nota capturada',
  )
  expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual([])
  fireEvent.click(screen.getByRole('button', { name: /Deshacer/ }))
  await screen.findByText('✓ Movimiento deshecho')
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
  expect(screen.getByRole('button', { name: 'Nuevo Registro' })).toBeTruthy()
})
it('conserva motivo y notas al cerrar y recuperar el borrador', async () => {
  render(<ModalNewRecord />)
  openDeath()
  fireEvent.change(screen.getByLabelText('Descripción (opcional)'), {
    target: { value: 'Borrador' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'X modal' }))
  fireEvent.click(screen.getByRole('button', { name: /Nuevo Registro/ }))
  fireEvent.click(screen.getByRole('button', { name: /Ver borradores/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Muerte' }))
  expect(screen.getByLabelText('Causa de muerte')).toHaveValue('disease')
  expect(screen.getByLabelText('Descripción (opcional)')).toHaveValue('Borrador')
})
it('impide cerrar o confirmar dos veces mientras guarda; conserva datos cuando falla', async () => {
  let reject!: (error: Error) => void
  mockDeath.mockImplementation(
    () =>
      new Promise((_, fail) => {
        reject = fail
      }),
  )
  render(<ModalNewRecord />)
  openDeath()
  fireEvent.click(screen.getByRole('button', { name: 'Registrar muerte' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar muerte' }))
  fireEvent.click(screen.getByRole('button', { name: 'X modal' }))
  expect(screen.getByText('Registrando...')).toBeTruthy()
  await act(async () => reject(new Error('Falló la conexión')))
  await screen.findByRole('alert')
  expect(screen.getByRole('button', { name: 'Confirmar muerte' })).toBeEnabled()
  expect(mockDeath).toHaveBeenCalledTimes(1)
  await waitFor(() => expect(JSON.parse(localStorage.getItem(storageKey)!)).toHaveLength(1))
})
it('destete solo ofrece crías activas', () => {
  render(<ModalNewRecord />)
  fireEvent.click(screen.getByRole('button', { name: /Nuevo Registro/ }))
  fireEvent.click(screen.getByRole('button', { name: /Destete/ }))
  expect(screen.queryByRole('button', { name: 'Elegir H1' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Elegir C1' })).toBeTruthy()
})
