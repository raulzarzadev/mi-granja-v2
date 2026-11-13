import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import FarmMapEditor from '@/components/Dashboard/Animals/FarmMapEditor'

const mockUpdateArea = jest.fn().mockResolvedValue(undefined)
const mockDeleteArea = jest.fn().mockResolvedValue(undefined)
const mockFarm = { id: 'farm-1', name: 'San Jose 2' }
jest.mock('@/hooks/useFarmCRUD', () => ({ useFarmCRUD: () => ({ currentFarm: mockFarm }) }))
jest.mock('@/hooks/useFarmAreasCRUD', () => ({
  useFarmAreasCRUD: () => ({
    createArea: jest.fn(),
    updateArea: mockUpdateArea,
    deleteArea: mockDeleteArea,
  }),
}))
jest.mock('@/components/AnimalTag', () => ({
  __esModule: true,
  default: ({ animal }: any) => <span>{animal.animalNumber}</span>,
}))
jest.mock('@/components/Modal', () => ({
  Modal: ({ isOpen, title, onClose, children }: any) =>
    isOpen
      ? require('react-dom').createPortal(
          <div role="dialog" aria-label={title}>
            <button type="button" onClick={onClose}>
              Cerrar diálogo
            </button>
            {children}
          </div>,
          document.body,
        )
      : null,
}))

const areas = ['1', '2'].map((number) => ({
  id: `area-${number}`,
  farmId: 'farm-1',
  name: `Área ${number}`,
  type: 'pasture',
  isActive: true,
  areaM2: number === '1' ? 125.5 : null,
  layout: {
    kind: 'polygon',
    coordinateSystem: 'normalized',
    color: '#16a34a',
    points: [
      { x: 0.1, y: 0.1 },
      { x: 0.3, y: 0.1 },
      { x: 0.3, y: 0.3 },
    ],
  },
})) as any
const animal = {
  id: 'animal-1',
  animalNumber: '233',
  type: 'oveja',
  currentAreaId: 'area-1',
} as any
function setup(onMoveAnimal = jest.fn().mockResolvedValue(undefined)) {
  render(
    <FarmMapEditor
      areas={areas}
      animalsByArea={
        new Map([
          ['area-1', [animal]],
          ['area-2', []],
        ])
      }
      selectedAnimalId=""
      savingIds={new Set()}
      onSelectAnimal={jest.fn()}
      onMoveAnimal={onMoveAnimal}
    />,
  )
  return onMoveAnimal
}

beforeEach(() => {
  jest.clearAllMocks()
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any
})

it('keeps the farm title outside the canvas and card controls outside SVG', () => {
  setup()
  const canvas = screen.getByRole('region', { name: /Lienzo de áreas/ })
  expect(canvas).not.toContainElement(screen.getByRole('heading', { name: 'Áreas de San Jose 2' }))
  const card = screen.getByRole('button', { name: 'Mostrar detalles de Área 1' })
  expect(card.closest('svg')).toBeNull()
  fireEvent.click(card)
  expect(screen.getByRole('button', { name: /Crear área/ })).toBeInTheDocument()
  expect(mockUpdateArea).not.toHaveBeenCalled()
})

it('offers tap-to-move without waiting for persistence', async () => {
  const move = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar detalles de Área 1' }))
  fireEvent.click(screen.getByRole('button', { name: 'Mover animal 233' }))
  const dialog = screen.getByRole('dialog', { name: 'Mover 233' })
  expect(move).not.toHaveBeenCalled()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Área 2' }))
  await waitFor(() => expect(move).toHaveBeenCalledWith('animal-1', 'area-2', false))
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: 'Mover 233' })).not.toBeInTheDocument(),
  )
  expect(screen.getByText(/Editando Área 2/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Crear área/ })).not.toBeInTheDocument()
})

it('selects the optimistic destination immediately on drop', async () => {
  const move = setup()
  const card = screen.getByRole('button', { name: 'Mostrar detalles de Área 2' })
  fireEvent.drop(card, { dataTransfer: { getData: () => 'animal-1' } })
  await waitFor(() => expect(move).toHaveBeenCalledWith('animal-1', 'area-2', false))
  await waitFor(() => expect(screen.getByText(/Editando Área 2/)).toBeInTheDocument())
})

it('shows an enqueue error without reporting persistence success', async () => {
  setup(jest.fn().mockRejectedValue(new Error('offline')))
  fireEvent.drop(screen.getByRole('button', { name: 'Mostrar detalles de Área 2' }), {
    dataTransfer: { getData: () => 'animal-1' },
  })
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No se pudo mover'))
  expect(screen.queryByText('Guardado')).not.toBeInTheDocument()
})

it('requires confirmation before deleting an empty area', async () => {
  setup()
  fireEvent.keyDown(screen.getByRole('button', { name: 'Editar contorno de Área 2' }), {
    key: 'Enter',
  })
  fireEvent.click(await screen.findByRole('button', { name: 'Más opciones del área' }))
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar área' }))
  expect(mockDeleteArea).not.toHaveBeenCalled()
  const dialog = screen.getByRole('dialog', { name: 'Eliminar área' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar área' }))
  await waitFor(() => expect(mockDeleteArea).toHaveBeenCalledWith('area-2'))
})

it('keeps the edited area identity when an animal moves from the data dialog', async () => {
  const move = setup()
  fireEvent.keyDown(screen.getByRole('button', { name: 'Editar contorno de Área 1' }), {
    key: 'Enter',
  })
  fireEvent.click(await screen.findByRole('button', { name: 'Datos' }))
  const editor = screen.getByRole('dialog', { name: 'Editar Área 1' })
  fireEvent.change(within(editor).getByLabelText('Nombre del área *'), {
    target: { value: 'Área A' },
  })
  fireEvent.click(within(editor).getByRole('button', { name: 'Mover animal 233' }))
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Mover 233' })).getByRole('button', {
      name: 'Área 2',
    }),
  )
  await waitFor(() => expect(move).toHaveBeenCalledWith('animal-1', 'area-2', false))
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: 'Mover 233' })).not.toBeInTheDocument(),
  )
  expect(screen.getByRole('dialog', { name: 'Editar Área 1' })).toBeInTheDocument()
  fireEvent.click(within(editor).getByRole('button', { name: 'Guardar datos' }))
  await waitFor(() =>
    expect(mockUpdateArea).toHaveBeenCalledWith(
      'area-1',
      expect.objectContaining({
        name: 'Área A',
        layout: expect.objectContaining({ points: areas[0].layout.points }),
      }),
    ),
  )
})

it('zooms around the current center while card dimensions remain unchanged', () => {
  setup()
  const viewport = screen.getByRole('region', { name: /Lienzo de áreas/ })
  Object.defineProperties(viewport, {
    clientWidth: { value: 1000 },
    clientHeight: { value: 500 },
    scrollWidth: {
      get: () => Number.parseFloat((viewport.firstElementChild as HTMLElement).style.width) * 10,
    },
    scrollHeight: {
      get: () => Number.parseFloat((viewport.firstElementChild as HTMLElement).style.width) * 6.2,
    },
  })
  viewport.scrollLeft = 500
  viewport.scrollTop = 370
  viewport.scrollTo = jest.fn()
  const card = screen.getByRole('button', { name: 'Mostrar detalles de Área 1' }).parentElement!
    .parentElement!
  const width = card.style.width
  fireEvent.click(screen.getByRole('button', { name: 'Acercar lienzo' }))
  expect(screen.getByRole('button', { name: /Zoom 125 por ciento/ })).toBeInTheDocument()
  expect(viewport.scrollTo).toHaveBeenCalledWith({ left: 750, top: 525, behavior: 'instant' })
  expect(card.style.width).toBe(width)
})

it('shows square metres only when the card is expanded', () => {
  setup()
  expect(screen.queryByText('125,5 m²')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar detalles de Área 1' }))
  expect(screen.getByText('125,5 m²')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Ocultar detalles de Área 1' }))
  expect(screen.queryByText('125,5 m²')).not.toBeInTheDocument()
})

it('keeps labels small until explicitly opened', () => {
  setup()
  const label = screen.getByRole('button', { name: 'Mostrar detalles de Área 1' })
  const card = label.parentElement!.parentElement!
  expect(card.style.transform).toBe('scale(0.85)')
  fireEvent.click(label)
  expect(card.style.transform).toBe('scale(1)')
  fireEvent.click(screen.getByRole('button', { name: 'Ocultar detalles de Área 1' }))
  expect(card.style.transform).toBe('scale(0.85)')
})

it('closes the destination picker while persistence remains pending', () => {
  const move = setup(jest.fn(() => new Promise<void>(() => {})))
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar detalles de Área 1' }))
  fireEvent.click(screen.getByRole('button', { name: 'Mover animal 233' }))
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Mover 233' })).getByRole('button', {
      name: 'Área 2',
    }),
  )
  expect(screen.queryByRole('dialog', { name: 'Mover 233' })).not.toBeInTheDocument()
  expect(move).toHaveBeenCalledWith('animal-1', 'area-2', false)
  expect(screen.getByRole('button', { name: 'Mover animal 233' })).toBeEnabled()
})

it('keeps bulk confirmation mounted if optimistic updates empty its group before acknowledgement', async () => {
  let rejectMove!: (reason: Error) => void
  const move = jest.fn(
    () =>
      new Promise<void>((_resolve, reject) => {
        rejectMove = reject
      }),
  )
  const props = {
    areas,
    selectedAnimalId: '',
    savingIds: new Set<string>(),
    onSelectAnimal: jest.fn(),
    onMoveAnimal: move,
  }
  const { rerender } = render(
    <FarmMapEditor
      {...props}
      animalsByArea={
        new Map([
          ['area-1', [animal]],
          ['area-2', []],
        ])
      }
    />,
  )
  fireEvent.keyDown(screen.getByRole('button', { name: 'Editar contorno de Área 1' }), {
    key: 'Enter',
  })
  fireEvent.click(await screen.findByRole('button', { name: 'Datos' }))
  fireEvent.click(screen.getByRole('button', { name: /^Sacar a todos/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Sí, sacar a todos' }))
  expect(move).toHaveBeenCalledWith('animal-1', '__unassigned__', true, 'area-1')
  rerender(
    <FarmMapEditor
      {...props}
      animalsByArea={
        new Map([
          ['area-1', []],
          ['area-2', []],
          ['__unassigned__', [{ ...animal, currentAreaId: null }]],
        ])
      }
    />,
  )
  expect(screen.getByRole('dialog', { name: 'Confirmación' })).toBeInTheDocument()
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  await act(async () => {
    rejectMove(new Error('offline'))
  })
  expect(screen.getByRole('dialog', { name: 'Confirmación' })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('No se pudo completar')
  consoleError.mockRestore()
})

it('shows every animal and keeps the expanded area above collapsed labels', () => {
  const herd = Array.from({ length: 13 }, (_, index) => ({
    ...animal,
    id: `animal-${index}`,
    animalNumber: `${index + 1}`,
  }))
  render(
    <FarmMapEditor
      areas={areas}
      animalsByArea={
        new Map([
          ['area-1', herd],
          ['area-2', []],
        ])
      }
      selectedAnimalId=""
      savingIds={new Set()}
      onSelectAnimal={jest.fn()}
      onMoveAnimal={jest.fn().mockResolvedValue(undefined)}
    />,
  )
  const open = screen.getByRole('button', { name: 'Mostrar detalles de Área 1' })
  const closed = screen.getByRole('button', { name: 'Mostrar detalles de Área 2' })
  fireEvent.click(open)
  expect(screen.getAllByRole('button', { name: /^Mover animal/ })).toHaveLength(13)
  expect(screen.getByRole('button', { name: 'Mover animal 13' })).toBeInTheDocument()
  expect(screen.queryByText('+1')).not.toBeInTheDocument()
  expect(Number(open.parentElement!.parentElement!.style.zIndex)).toBeGreaterThan(
    Number(closed.parentElement!.parentElement!.style.zIndex),
  )
})
