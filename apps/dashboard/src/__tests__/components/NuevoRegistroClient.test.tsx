import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import NuevoRegistroClient from '@/app/registro/nuevo/NuevoRegistroClient'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
jest.mock('@/components/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({ notify: jest.fn() }),
}))
const animals = [{ id: 'animal', status: 'activo', animalNumber: '1' }]
const mockAddRecord = jest.fn(async () => undefined)
jest.mock('@/hooks/useAnimalCRUD', () => ({
  useAnimalCRUD: () => ({ animals, addRecord: mockAddRecord }),
}))
jest.mock('@/hooks/useCurrentFarmAreas', () => ({ useCurrentFarmAreas: () => [] }))
jest.mock('@/hooks/useReminders', () => ({ useReminders: () => ({ createReminder: jest.fn() }) }))
jest.mock('@/components/PageShell', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}))
jest.mock('@/components/buttons/date-picker-buttons', () => ({
  DatePickerButtons: ({ value, onChange }: any) => (
    <input aria-label="Fecha" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))
jest.mock('@/components/inputs/InputSelectAnimals', () => ({
  __esModule: true,
  default: ({ onAdd, selectedIds }: any) => (
    <button type="button" onClick={() => onAdd('animal')}>
      Seleccionar animal {selectedIds.length}
    </button>
  ),
}))
jest.mock('@/components/ModalChangeStage', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ModalSaleForm', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/Icon/emoji-icons', () => ({ EmojiIcon: () => null }))
it('starts with type/date, requires animals next and preserves earlier input when returning', () => {
  render(<NuevoRegistroClient />)
  expect(screen.getByText('Tipo de registro')).toBeInTheDocument()
  expect(screen.queryByText('Seleccionar animal 0')).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-11-10' } })
  fireEvent.click(screen.getByRole('button', { name: 'Nota' }))
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar animal 0' }))
  expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'Atras' }))
  expect(screen.getByLabelText('Fecha')).toHaveValue('2026-11-10')
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  expect(screen.getByRole('button', { name: 'Seleccionar animal 1' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  expect(screen.getByText('Titulo *')).toBeInTheDocument()
})

it('lets the user pick several categories and saves them all', async () => {
  render(<NuevoRegistroClient />)
  fireEvent.click(screen.getByRole('button', { name: 'Salud' }))
  const vaccine = screen.getByRole('button', { name: 'Vacuna' })
  const deworming = screen.getByRole('button', { name: 'Desparasitación' })
  fireEvent.click(vaccine)
  fireEvent.click(deworming)
  expect(vaccine).toHaveAttribute('aria-pressed', 'true')
  expect(deworming).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar animal 0' }))
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  fireEvent.change(screen.getByPlaceholderText('Titulo del registro...'), {
    target: { value: 'Visita' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' }))
  await waitFor(() => expect(mockAddRecord).toHaveBeenCalled())
  const [, payload] = mockAddRecord.mock.calls[0] as unknown as [string, any]
  // El primer toque reemplaza la preselección automática.
  expect(payload.categories).toEqual(['vaccine', 'deworming'])
  expect(payload.category).toBe('vaccine')
})

it('keeps at least one category selected', () => {
  render(<NuevoRegistroClient />)
  fireEvent.click(screen.getByRole('button', { name: 'Salud' }))
  const pressed = screen
    .getAllByRole('button', { pressed: true })
    .filter((button) => button.closest('fieldset'))
  expect(pressed).toHaveLength(1)
  fireEvent.click(pressed[0]) // primer toque: confirma la preselección
  fireEvent.click(pressed[0]) // ya es la única: no se puede quitar
  expect(pressed[0]).toHaveAttribute('aria-pressed', 'true')
})

it('adds medications with batch and drops empty rows on save', async () => {
  mockAddRecord.mockClear()
  render(<NuevoRegistroClient />)
  fireEvent.click(screen.getByRole('button', { name: 'Salud' }))
  fireEvent.click(screen.getByRole('button', { name: 'Agregar medicamento' }))
  fireEvent.click(screen.getByRole('button', { name: 'Agregar medicamento' }))
  fireEvent.change(screen.getByLabelText('Nombre del medicamento 1'), {
    target: { value: 'Ivermectina' },
  })
  fireEvent.change(screen.getByLabelText('Lote del medicamento 1'), { target: { value: 'L-7' } })
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar animal 0' }))
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  fireEvent.change(screen.getByPlaceholderText('Titulo del registro...'), {
    target: { value: 'Desparasitación' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' }))
  await waitFor(() => expect(mockAddRecord).toHaveBeenCalled())
  const [, payload] = mockAddRecord.mock.calls[0] as unknown as [string, any]
  expect(payload.medications).toEqual([{ name: 'Ivermectina', batch: 'L-7' }])
})

it('removes a medication row', () => {
  render(<NuevoRegistroClient />)
  fireEvent.click(screen.getByRole('button', { name: 'Salud' }))
  fireEvent.click(screen.getByRole('button', { name: 'Agregar medicamento' }))
  fireEvent.click(screen.getByRole('button', { name: 'Quitar medicamento 1' }))
  expect(screen.queryByLabelText('Nombre del medicamento 1')).not.toBeInTheDocument()
})
