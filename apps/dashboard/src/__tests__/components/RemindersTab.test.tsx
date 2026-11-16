import { fireEvent, render, screen } from '@testing-library/react'
import RemindersTab from '@/components/RemindersTab'

const day = (offset: number) => {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}

const reminders = [
  { id: 'r1', title: 'Pesaje lote', dueDate: day(-2), completed: false },
  { id: 'r2', title: 'Vacuna triple', dueDate: day(0), completed: false },
  { id: 'r3', title: 'Revisión', dueDate: day(20), completed: false },
  { id: 'r4', title: 'Desparasitar', dueDate: day(-5), completed: true },
]

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/hooks/useReminders', () => ({
  useReminders: () => ({
    reminders,
    isLoading: false,
    markAsCompleted: jest.fn(),
    markAnimalCompleted: jest.fn(),
    deleteReminder: jest.fn(),
  }),
}))
jest.mock('@/hooks/useAnimalCRUD', () => ({ useAnimalCRUD: () => ({ animals: [] }) }))
jest.mock('@/components/RegisterBirthFromStage', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/WeanedAnimal', () => ({ ModalWeanAnimal: () => null }))
const farmTasks: any[] = []
jest.mock('@/hooks/useFarmPendingTasks', () => ({ useFarmPendingTasks: () => farmTasks }))
jest.mock('@/components/FarmTaskRow', () => ({
  __esModule: true,
  default: ({ task }: { task: { kind: string; animal: { animalNumber: string } } }) => (
    <p>{`${task.kind} ${task.animal.animalNumber}`}</p>
  ),
}))
jest.mock('@/components/HealthRemindersCard', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ReminderRow', () => ({
  __esModule: true,
  default: ({ reminder }: { reminder: { title: string } }) => <p>{reminder.title}</p>,
}))

const groupOf = (title: string) =>
  screen.getByText(title, { selector: 'summary span' }).closest('details') as HTMLDetailsElement

it('agrupa en colapsables: partos, destetes y recordatorios; completados aparte', () => {
  render(<RemindersTab />)
  const recordatorios = groupOf('Recordatorios')
  expect(recordatorios.open).toBe(false)
  expect(recordatorios).toHaveTextContent('Pesaje lote')
  expect(recordatorios).toHaveTextContent('Vacuna triple')
  expect(recordatorios).toHaveTextContent('Revisión')
  expect(recordatorios).toHaveTextContent('1 vencido')
  // Grupos cerrados por defecto
  expect(groupOf('Partos').open).toBe(false)
  expect(groupOf('Destetes')).toHaveTextContent('Nada pendiente.')
  expect(screen.queryByText('Desparasitar')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Completados \(1\)/ }))
  expect(screen.getByText('Desparasitar')).toBeInTheDocument()
})

it('filtra con el buscador', () => {
  render(<RemindersTab />)
  fireEvent.change(screen.getByPlaceholderText(/Buscar/), { target: { value: 'vacuna' } })
  expect(screen.getByText('Vacuna triple')).toBeInTheDocument()
  expect(screen.queryByText('Revisión')).not.toBeInTheDocument()
})

it('pone partos y destetes pendientes en su propio grupo', () => {
  farmTasks.push(
    { id: 'p1', kind: 'parto', animal: { animalNumber: '02-R' }, daysUntil: -3 },
    { id: 'd1', kind: 'destete', animal: { animalNumber: '05-C' }, daysUntil: 4 },
  )
  render(<RemindersTab />)
  expect(groupOf('Partos')).toHaveTextContent('parto 02-R')
  expect(groupOf('Partos')).toHaveTextContent('1 vencido')
  expect(groupOf('Destetes')).toHaveTextContent('destete 05-C')
  farmTasks.length = 0
})
