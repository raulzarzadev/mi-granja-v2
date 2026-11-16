import { fireEvent, render, screen } from '@testing-library/react'
import NotificationsBell from '@/components/NotificationsBell'

let mockOverdue: any[] = []
let mockTasks: any[] = []
jest.mock('@/hooks/useReminders', () => ({
  useReminders: () => ({
    reminders: mockOverdue,
    getOverdueReminders: () => mockOverdue,
    getTodayReminders: () => [],
    getBadgeCount: () => mockOverdue.length,
  }),
}))
jest.mock('@/hooks/useFarmPendingTasks', () => ({ useFarmPendingTasks: () => mockTasks }))
jest.mock('@/components/ReminderRow', () => ({
  REMINDER_TYPE_ICONS: { other: '📝' },
  ReminderDetailModal: ({ reminder }: any) => <div>Detalle {reminder.title}</div>,
}))
jest.mock('@/components/FarmTaskRow', () => ({
  FarmTaskModal: ({ task }: any) => <div>Detalle tarea {task.id}</div>,
}))
jest.mock('@/components/FarmTaskRegister', () => ({ __esModule: true, default: () => null }))

beforeEach(() => {
  mockOverdue = []
  mockTasks = []
})

it('mantiene el panel dentro de una pantalla angosta y lo reajusta al cambiar el ancho', () => {
  const originalWidth = window.innerWidth
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 280 })
  const bounds = jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockReturnValue({ right: 244, bottom: 76 } as DOMRect)
  const { unmount } = render(<NotificationsBell />)
  fireEvent.click(screen.getByRole('button', { name: 'Notificaciones y recordatorios' }))
  expect(screen.getByRole('menu')).toHaveStyle({ left: '12px', width: '256px', top: '84px' })
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
  fireEvent(window, new Event('resize'))
  expect(screen.getByRole('menu')).toHaveStyle({ left: '12px', width: '320px' })
  unmount()
  bounds.mockRestore()
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth })
})

it('se titula "Notificaciones y recordatorios" y "Ver todos" lleva a la vista completa', () => {
  render(<NotificationsBell />)
  fireEvent.click(screen.getByRole('button', { name: 'Notificaciones y recordatorios' }))
  expect(
    screen.getByRole('heading', { name: 'Notificaciones y recordatorios' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Ver todos' })).toHaveAttribute('href', '/recordatorios')
})

it('cuenta partos y destetes solo si están vencidos y abre cada aviso en un modal', () => {
  const yesterday = new Date(Date.now() - 86400000)
  mockOverdue = [{ id: 'r1', title: 'Vacunar', type: 'other', dueDate: yesterday }]
  mockTasks = [
    {
      id: 'parto-a',
      kind: 'parto',
      animal: { animalNumber: 'A1' },
      dueDate: yesterday,
      daysUntil: -1,
    },
    {
      id: 'destete-b',
      kind: 'destete',
      animal: { animalNumber: 'B1' },
      dueDate: new Date(),
      daysUntil: 3,
    },
  ]
  render(<NotificationsBell />)
  const bell = screen.getByRole('button', { name: 'Notificaciones y recordatorios: 2 pendientes' })
  fireEvent.click(bell)
  expect(screen.queryByText(/Destete · B1/)).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Parto · A1/ }))
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  expect(screen.getByText('Detalle tarea parto-a')).toBeInTheDocument()
  fireEvent.click(bell)
  fireEvent.click(screen.getByRole('button', { name: /Vacunar/ }))
  expect(screen.getByText('Detalle Vacunar')).toBeInTheDocument()
})
