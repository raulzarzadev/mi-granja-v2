import { fireEvent, render, screen } from '@testing-library/react'
import InputSelectAnimals from '@/components/inputs/InputSelectAnimals'

const animals = [
  {
    id: '1',
    animalNumber: '20-A',
    batch: 'Lote B',
    age: 12,
    type: 'oveja',
    gender: 'hembra',
    stage: 'reproductor',
  },
  {
    id: '2',
    animalNumber: '3-A',
    batch: 'Lote C',
    age: 36,
    type: 'oveja',
    gender: 'hembra',
    stage: 'reproductor',
  },
  {
    id: '3',
    animalNumber: '10-A',
    batch: 'Lote A',
    age: 6,
    type: 'oveja',
    gender: 'hembra',
    stage: 'reproductor',
  },
  {
    id: '4',
    animalNumber: '2-A',
    batch: 'Lote Z',
    age: 24,
    type: 'oveja',
    gender: 'hembra',
    stage: 'reproductor',
  },
] as any

const getDropdownNumbers = () =>
  Array.from(document.querySelectorAll('[role="listbox"] [role="option"]')).map(
    (option) => option.textContent,
  )

const getSelectedIds = () =>
  Array.from(document.querySelectorAll('[data-animal-id]')).map((chip) =>
    chip.getAttribute('data-animal-id'),
  )

const renderSelector = () => {
  render(
    <InputSelectAnimals
      animals={animals}
      selectedIds={['1', '2']}
      onAdd={jest.fn()}
      onRemove={jest.fn()}
      renderOption={(animal) => animal.animalNumber}
    />,
  )
  fireEvent.focus(screen.getByPlaceholderText('Buscar por numero, nombre, tipo o raza...'))
}

describe('InputSelectAnimals', () => {
  it('ordena por agregación, arete o edad', () => {
    renderSelector()
    const sort = screen.getByRole('button', { name: 'Ordenar por' })

    expect(getDropdownNumbers()).toEqual(['2-A', '10-A'])
    expect(getSelectedIds()).toEqual(['2', '1'])

    fireEvent.click(sort)
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Agregación' }))
    expect(getDropdownNumbers()).toEqual(['10-A', '2-A'])
    expect(getSelectedIds()).toEqual(['1', '2'])

    fireEvent.click(sort)
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Edad' }))
    expect(getDropdownNumbers()).toEqual(['10-A', '2-A'])
    expect(getSelectedIds()).toEqual(['1', '2'])

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar orden: ascendente' }))
    expect(screen.getByRole('button', { name: 'Cambiar orden: descendente' })).toBeInTheDocument()
    expect(getDropdownNumbers()).toEqual(['2-A', '10-A'])
    expect(getSelectedIds()).toEqual(['2', '1'])

    fireEvent.click(sort)
    expect(screen.getByRole('menuitemradio', { name: 'Agregación' })).toBeInTheDocument()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menuitemradio', { name: 'Agregación' })).not.toBeInTheDocument()
  })

  it('oculta el orden cuando solo hay un animal seleccionado', () => {
    render(
      <InputSelectAnimals
        animals={animals}
        selectedIds={['1']}
        onAdd={jest.fn()}
        onRemove={jest.fn()}
        label="Animales a los que aplica"
      />,
    )

    expect(screen.queryByLabelText('Ordenar animales')).not.toBeInTheDocument()
  })

  it('aplica el orden antes de limitar los resultados visibles', () => {
    const manyAnimals = Array.from({ length: 31 }, (_, index) => ({
      ...animals[0],
      id: `animal-${index}`,
      animalNumber: String(100 - index),
    }))

    render(
      <InputSelectAnimals
        animals={manyAnimals as any}
        selectedIds={[]}
        onAdd={jest.fn()}
        onRemove={jest.fn()}
        renderOption={(animal) => animal.animalNumber}
      />,
    )
    fireEvent.focus(screen.getByPlaceholderText('Buscar por numero, nombre, tipo o raza...'))

    expect(getDropdownNumbers()).toEqual(
      Array.from({ length: 30 }, (_, index) => String(index + 70)),
    )
  })
})
