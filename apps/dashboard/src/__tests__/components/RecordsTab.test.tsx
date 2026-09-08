import { fireEvent, render, screen } from '@testing-library/react'
import RecordsTab from '@/components/RecordsTab'

const mockParams = new URLSearchParams()
let mockRecords: any[] = []
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => mockParams,
}))
jest.mock('@/hooks/useAnimalCRUD', () => ({
  useAnimalCRUD: () => ({ animals: [{ id: 'a', animalNumber: '001', records: mockRecords }] }),
}))
jest.mock('@/components/ModalRecordDetail', () => () => null)

function record(title: string, daysAgo: number) {
  const createdAt = new Date()
  createdAt.setDate(createdAt.getDate() - daysAgo)
  return { id: title, title, type: 'note', category: 'general', createdAt, date: createdAt }
}

beforeEach(() => {
  mockRecords = [record('Reciente', 1), record('Anterior', 30)]
})

it('muestra la última semana y permite cargar un período anterior aunque haya semanas vacías', () => {
  render(<RecordsTab />)
  expect(screen.getByText('Reciente')).toBeInTheDocument()
  expect(screen.queryByText('Anterior')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Cargar más · registros anteriores/ }))
  expect(screen.getByText('Anterior')).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /Cargar más · registros anteriores/ }),
  ).not.toBeInTheDocument()
})

it('permite cargar anteriores cuando no hay registros recientes', () => {
  mockRecords = [record('Anterior', 30)]
  render(<RecordsTab />)
  expect(screen.queryByText('Anterior')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Cargar más · registros anteriores/ }))
  expect(screen.getByText('Anterior')).toBeInTheDocument()
})
