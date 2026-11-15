import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import FarmMapEditor from '@/components/Dashboard/Animals/FarmMapEditor'

const mockFarm = { id: 'farm-1', name: 'San Jose 2' }
jest.mock('@/hooks/useFarmCRUD', () => ({ useFarmCRUD: () => ({ currentFarm: mockFarm }) }))
const mockCreateArea = jest.fn(async (_farmId: string, data: any) => ({ id: 'area-new', ...data }))
jest.mock('@/hooks/useFarmAreasCRUD', () => ({
  useFarmAreasCRUD: () => ({
    createArea: mockCreateArea,
    updateArea: jest.fn(),
    deleteArea: jest.fn(),
  }),
}))
jest.mock('@/components/AnimalTag', () => ({
  __esModule: true,
  default: ({ animal }: any) => <span>{animal.animalNumber}</span>,
}))
jest.mock('@/components/Modal', () => ({
  Modal: ({ isOpen, title, children }: any) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}))
const areas = ['1', '2'].map((number) => ({
  id: `area-${number}`,
  farmId: 'farm-1',
  name: `Área ${number}`,
  type: 'pasture',
  isActive: true,
  areaM2: 125,
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
  gender: 'hembra',
  stage: 'reproductor',
  currentAreaId: 'area-1',
} as any
function setup(onMoveAnimal: jest.Mock = jest.fn()) {
  render(
    <FarmMapEditor
      defaultView="map"
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
}
beforeEach(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any
})
function switchView(name: 'Mapa' | 'Tabla') {
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Vista de áreas' })).getByRole('button', { name }),
  )
}

it('opens in table view by default with Tabla as the first option', () => {
  render(
    <FarmMapEditor
      areas={areas}
      animalsByArea={new Map([['area-1', [animal]]])}
      selectedAnimalId=""
      savingIds={new Set()}
      onSelectAnimal={jest.fn()}
      onMoveAnimal={jest.fn()}
    />,
  )
  const buttons = within(screen.getByRole('group', { name: 'Vista de áreas' })).getAllByRole(
    'button',
  )
  expect(buttons.map((b) => b.textContent)).toEqual(['Tabla', 'Mapa'])
  expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('table')).toBeInTheDocument()
})

it('places switch, map zoom and the single create action in the same header row', () => {
  setup()
  const controls = screen.getByRole('group', { name: 'Controles de vista de áreas' })
  expect(within(controls).getByRole('group', { name: 'Vista de áreas' })).toBeInTheDocument()
  expect(within(controls).getByRole('group', { name: 'Zoom del lienzo' })).toBeInTheDocument()
  expect(within(controls).getByRole('button', { name: 'Crear área' })).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'Crear área' })).toHaveLength(1)
})

it('hides zoom in table view and keeps create in the same controls row', () => {
  setup()
  switchView('Tabla')
  expect(screen.queryByRole('group', { name: 'Zoom del lienzo' })).not.toBeInTheDocument()
  expect(screen.getByRole('table')).toBeInTheDocument()
  const controls = screen.getByRole('group', { name: 'Controles de vista de áreas' })
  expect(within(controls).getByRole('button', { name: 'Crear área' })).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'Crear área' })).toHaveLength(1)
})

it('preserves expanded table rows and map zoom while alternating views', () => {
  setup()
  screen.getByRole('region', { name: /Lienzo de áreas/ }).scrollTo = jest.fn()
  fireEvent.click(screen.getByRole('button', { name: 'Acercar lienzo' }))
  switchView('Tabla')
  fireEvent.click(screen.getByRole('button', { name: 'Área 1' }))
  expect(screen.getByRole('button', { name: 'Mover animal 233' })).toBeInTheDocument()
  switchView('Mapa')
  expect(screen.getByRole('button', { name: /Zoom 125 por ciento/ })).toBeInTheDocument()
  switchView('Tabla')
  expect(screen.getByRole('button', { name: 'Área 1' })).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('button', { name: 'Mover animal 233' })).toBeInTheDocument()
})

it('opens data for the explicit table area and hides create while editing', async () => {
  setup()
  switchView('Tabla')
  fireEvent.click(screen.getByRole('button', { name: 'Editar datos de Área 2' }))
  const editor = await screen.findByRole('dialog', { name: 'Editar Área 2' })
  expect(within(editor).getByLabelText('Nombre del área *')).toHaveValue('Área 2')
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Crear área' })).not.toBeInTheDocument(),
  )
})

it('keeps create available in table even if a contour was selected in map', async () => {
  setup()
  fireEvent.keyDown(screen.getByRole('button', { name: 'Editar contorno de Área 1' }), {
    key: 'Enter',
  })
  expect(screen.queryByRole('button', { name: /Crear área/ })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Tabla' }))
  expect(screen.getByRole('button', { name: /Crear área/ })).toBeInTheDocument()
})

it('restores create in table after starting to draw an area in map', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: 'Crear área' }))
  expect(screen.queryByRole('button', { name: 'Crear área' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Creando…' })).toBeDisabled()
  switchView('Tabla')
  expect(screen.getByRole('button', { name: 'Crear área' })).toBeInTheDocument()
})

it('in table view opens a data modal and creates a default square on the map', async () => {
  setup()
  switchView('Tabla')
  fireEvent.click(screen.getByRole('button', { name: 'Crear área' }))
  const dialog = await screen.findByRole('dialog', { name: 'Nueva área' })
  fireEvent.change(within(dialog).getByLabelText('Nombre del área *'), {
    target: { value: 'Corral nuevo' },
  })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar área' }))
  await waitFor(() => expect(mockCreateArea).toHaveBeenCalled())
  const [, data] = mockCreateArea.mock.calls[0]
  expect(data.name).toBe('Corral nuevo')
  expect(data.layout.kind).toBe('rect')
  expect(data.layout.points).toHaveLength(4)
  expect(screen.getByRole('table')).toBeInTheDocument()
})

it('cancelling the table create modal does not start drawing', async () => {
  setup()
  switchView('Tabla')
  fireEvent.click(screen.getByRole('button', { name: 'Crear área' }))
  const dialog = await screen.findByRole('dialog', { name: 'Nueva área' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: 'Nueva área' })).not.toBeInTheDocument(),
  )
  expect(screen.getByRole('button', { name: 'Crear área' })).toBeEnabled()
})

it('area editor assigns animals with the shared animal selector', async () => {
  const move = jest.fn().mockResolvedValue(undefined)
  setup(move)
  switchView('Tabla')
  fireEvent.click(screen.getByRole('button', { name: 'Editar datos de Área 2' }))
  const editor = await screen.findByRole('dialog', { name: 'Editar Área 2' })
  const input = within(editor).getByRole('combobox', { name: /Animales en el área/ })
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: '233' } })
  const option = (await screen.findAllByRole('option')).find((el) =>
    el.textContent?.includes('233'),
  ) as HTMLElement
  fireEvent.mouseDown(option)
  await waitFor(() => expect(move).toHaveBeenCalledWith('animal-1', 'area-2', false))
})

it('area editor shows area animals as selector chips and removes to pending', async () => {
  const move = jest.fn().mockResolvedValue(undefined)
  setup(move)
  switchView('Tabla')
  fireEvent.click(screen.getByRole('button', { name: 'Editar datos de Área 1' }))
  const editor = await screen.findByRole('dialog', { name: 'Editar Área 1' })
  const chip = editor.querySelector('[data-animal-id="animal-1"]') as HTMLElement
  expect(chip).toBeInTheDocument()
  fireEvent.click(within(chip).getByTitle('Quitar'))
  await waitFor(() => expect(move).toHaveBeenCalledWith('animal-1', '__unassigned__', false))
})
