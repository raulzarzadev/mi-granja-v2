import { fireEvent, render, screen } from '@testing-library/react'
import ReminderRow from '@/components/ReminderRow'

jest.mock('@/hooks/useAnimalCRUD', () => ({ useAnimalCRUD: () => ({ animals: [] }) }))
jest.mock('@/hooks/useReminders', () => ({
  useReminders: () => ({
    markAsCompleted: jest.fn(),
    markAnimalCompleted: jest.fn(),
    deleteReminder: jest.fn(),
  }),
}))
jest.mock('@/components/ModalReminderForm', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ReminderCard', () => ({
  __esModule: true,
  default: () => <p>Detalle del recordatorio</p>,
}))

const day = (offset: number) => {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}

it('muestra título, animales y vencimiento, y abre el detalle en un modal', () => {
  render(
    <ReminderRow
      reminder={
        {
          id: 'r1',
          title: 'Sanidad',
          type: 'medical',
          priority: 'high',
          dueDate: day(-2),
          completed: false,
          animalNumbers: ['11-R'],
        } as any
      }
    />,
  )
  expect(screen.getByText('Sanidad')).toBeInTheDocument()
  expect(screen.getByText(/11-R/)).toBeInTheDocument()
  expect(screen.getByText('Vencido hace 2d')).toBeInTheDocument()
  expect(screen.getByText('Alta')).toBeInTheDocument()
  expect(screen.queryByText('Detalle del recordatorio')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Sanidad/ }))
  expect(screen.getByText('Detalle del recordatorio')).toBeInTheDocument()
})

it('marca los completados sin etiqueta de vencimiento', () => {
  render(
    <ReminderRow
      reminder={
        { id: 'r2', title: 'Pesaje', type: 'weight', dueDate: day(-9), completed: true } as any
      }
    />,
  )
  expect(screen.getByText('Completado')).toBeInTheDocument()
  expect(screen.queryByText(/Vencido/)).not.toBeInTheDocument()
})
