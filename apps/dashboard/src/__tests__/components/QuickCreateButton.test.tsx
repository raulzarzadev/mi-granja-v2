import { fireEvent, render, screen } from '@testing-library/react'
import {
  AnimalSelectionProvider,
  useAnimalSelection,
} from '@/components/Dashboard/AnimalSelectionContext'
import QuickCreateButton from '@/components/Dashboard/QuickCreateButton'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

function SelectAnimals() {
  const { setSelectedAnimalIds } = useAnimalSelection()
  return (
    <button onClick={() => setSelectedAnimalIds(['animal-1', 'animal-2'])}>
      Seleccionar animales
    </button>
  )
}

jest.mock('@/components/AiAssistant', () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) => (open ? <p>Chat del asistente</p> : null),
}))

jest.mock('@/components/ModalAnimalForm', () => ({
  __esModule: true,
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? <button onClick={onClose}>Cerrar alta de animal</button> : null,
}))

describe('QuickCreateButton', () => {
  it('despliega los tres accesos y abre el alta de animal', () => {
    render(<QuickCreateButton />)
    expect(screen.queryByRole('group', { name: 'Crear nuevo' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Crear nuevo' }))
    expect(screen.getByRole('link', { name: 'Nuevo registro' })).toHaveAttribute(
      'href',
      '/registro/nuevo',
    )
    expect(screen.getByRole('link', { name: 'Nuevo empadre' })).toHaveAttribute(
      'href',
      '/empadre/nueva',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo animal' }))
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar alta de animal' }))
    expect(screen.getByRole('button', { name: 'Crear nuevo' })).toHaveFocus()
  })

  it('abre directamente un registro con los animales seleccionados', () => {
    render(
      <AnimalSelectionProvider>
        <SelectAnimals />
        <QuickCreateButton />
      </AnimalSelectionProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar animales' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Crear registro para 2 animales seleccionados' }),
    )
    const href = mockPush.mock.calls.at(-1)[0]
    expect(new URL(href, 'http://localhost').searchParams.get('animalIds')).toBe(
      'animal-1,animal-2',
    )
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('abre el asistente IA desde las acciones flotantes', () => {
    render(<QuickCreateButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Crear nuevo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Asistente IA' }))
    expect(screen.getByText('Chat del asistente')).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('se cierra con Escape y al tocar fuera', () => {
    render(<QuickCreateButton />)
    const trigger = screen.getByRole('button', { name: 'Crear nuevo' })
    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    fireEvent.pointerDown(document.body)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
