import { fireEvent, render, screen, within } from '@testing-library/react'
import RecordsTab from '@/components/RecordsTab'

const mockParams = new URLSearchParams()
let mockRecords: any[] = []
let mockIsLoading = false
const mockSidebar = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => mockParams,
}))
jest.mock('@/hooks/useAnimalCRUD', () => ({
  useAnimalCRUD: () => ({
    animals: [{ id: 'a', animalNumber: '001', records: mockRecords }],
    isLoading: mockIsLoading,
  }),
}))
jest.mock('@/components/ModalRecordDetail', () => () => null)
jest.mock('@/components/Tabs', () => ({
  useSidebarSubItems: (items: unknown) => mockSidebar(items),
}))

function record(title: string, daysAgo: number) {
  const createdAt = new Date()
  createdAt.setDate(createdAt.getDate() - daysAgo)
  return { id: title, title, type: 'note', category: 'general', createdAt, date: createdAt }
}

beforeEach(() => {
  mockParams.delete('type')
  mockIsLoading = false
  mockSidebar.mockClear()
  window.history.replaceState({}, '', '/')
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

it('muestra solo los tipos y categorías con registros y conserva los conteos laterales', () => {
  render(<RecordsTab />)
  expect(screen.queryByRole('button', { name: 'Tipo', expanded: false })).not.toBeInTheDocument()
  expect(mockSidebar.mock.lastCall[0]).toMatchObject({ badges: [2, 2], activeIndex: 0 })
  fireEvent.click(screen.getByTitle('Filtros'))
  fireEvent.click(screen.getByRole('button', { name: 'Tipo', expanded: false }))
  expect(
    within(screen.getByRole('menu', { name: 'Filtrar por tipo' })).getAllByRole('menuitemradio'),
  ).toHaveLength(2)
  expect(screen.queryByRole('menuitemradio', { name: /Parto/ })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('menuitemradio', { name: 'Todos' }))
  fireEvent.click(screen.getByRole('button', { name: 'Categoría' }))
  expect(
    within(screen.getByRole('menu', { name: 'Filtrar por categoría' })).getAllByRole(
      'menuitemradio',
    ),
  ).toHaveLength(2)
  fireEvent.click(screen.getByTitle('Filtros'))
  expect(screen.queryByRole('button', { name: 'Tipo', expanded: false })).not.toBeInTheDocument()
})

it('vuelve a Todos cuando desaparecen los registros del tipo seleccionado', () => {
  mockParams.set('type', 'health')
  mockRecords.push({ ...record('Vacuna', 1), type: 'health', category: 'vaccination' })
  const { rerender } = render(<RecordsTab />)
  expect(screen.getByText('Vacuna')).toBeInTheDocument()
  mockRecords = [record('Reciente', 1)]
  rerender(<RecordsTab />)
  expect(screen.getByText('Reciente')).toBeInTheDocument()
  fireEvent.click(screen.getByTitle('Filtros'))
  fireEvent.click(screen.getByRole('button', { name: 'Tipo', expanded: false }))
  expect(screen.getByRole('menuitemradio', { name: 'Todos' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
})

it('descarta un tipo de la URL sin registros', () => {
  mockParams.set('type', 'birth')
  render(<RecordsTab />)
  expect(screen.getByText('Reciente')).toBeInTheDocument()
  fireEvent.click(screen.getByTitle('Filtros'))
  fireEvent.click(screen.getByRole('button', { name: 'Tipo', expanded: false }))
  expect(screen.getByRole('menuitemradio', { name: 'Todos' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
})

it('muestra solo el estado inicial sin registros y enlaza al formulario existente', () => {
  mockRecords = []
  render(<RecordsTab />)
  expect(screen.getByRole('heading', { name: 'Agrega tu primer registro' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Agregar registro' })).toHaveAttribute(
    'href',
    '/registro/nuevo',
  )
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
})

it('no muestra el estado inicial mientras carga', () => {
  mockRecords = []
  mockIsLoading = true
  render(<RecordsTab />)
  expect(screen.queryByText('Agrega tu primer registro')).not.toBeInTheDocument()
})
