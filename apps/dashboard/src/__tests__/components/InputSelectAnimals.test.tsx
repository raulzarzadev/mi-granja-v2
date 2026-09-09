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
    const sort = screen.getByRole('button', { name: 'Ordenar por: Arete' })

    expect(getDropdownNumbers()).toEqual(['2-A', '10-A'])
    expect(getSelectedIds()).toEqual(['2', '1'])

    fireEvent.click(sort)
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Agregación' }))
    expect(screen.getByRole('button', { name: 'Ordenar por: Agregación' })).toBeInTheDocument()
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

  it('encuentra aretes aunque se omitan separadores', () => {
    render(
      <InputSelectAnimals
        animals={[
          {
            id: 'search-55-h',
            animalNumber: '55-H',
            type: 'oveja',
            gender: 'hembra',
            stage: 'reproductor',
          } as (typeof animals)[number],
        ]}
        selectedIds={[]}
        onAdd={jest.fn()}
        onRemove={jest.fn()}
        renderOption={(animal) => animal.animalNumber}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText(/Buscar por numero/i), {
      target: { value: '55h' },
    })

    expect(getDropdownNumbers()).toEqual(['55-H'])
  })

  it('encuentra aretes con o sin ceros iniciales', () => {
    render(
      <InputSelectAnimals
        animals={[
          {
            id: 'search-05-d',
            animalNumber: '05-D',
            type: 'oveja',
            gender: 'hembra',
            stage: 'reproductor',
          } as (typeof animals)[number],
        ]}
        selectedIds={[]}
        onAdd={jest.fn()}
        onRemove={jest.fn()}
        renderOption={(animal) => animal.animalNumber}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText(/Buscar por numero/i), {
      target: { value: '5d' },
    })

    expect(getDropdownNumbers()).toEqual(['05-D'])
  })

  it('avanza a la siguiente coincidencia con la flecha abajo', () => {
    render(
      <InputSelectAnimals
        animals={animals}
        selectedIds={[]}
        onAdd={jest.fn()}
        onRemove={jest.fn()}
        renderOption={(animal) => animal.animalNumber}
      />,
    )
    const input = screen.getByPlaceholderText(/Buscar por numero/i)
    fireEvent.change(input, { target: { value: '2' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })

    const options = screen.getAllByRole('option')
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
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
