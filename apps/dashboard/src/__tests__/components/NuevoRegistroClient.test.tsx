import { fireEvent, render, screen } from '@testing-library/react'
import NuevoRegistroClient from '@/app/registro/nuevo/NuevoRegistroClient'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
jest.mock('@/components/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({ notify: jest.fn() }),
}))
const animals = [{ id: 'animal', status: 'activo', animalNumber: '1' }]
jest.mock('@/hooks/useAnimalCRUD', () => ({ useAnimalCRUD: () => ({ animals }) }))
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
