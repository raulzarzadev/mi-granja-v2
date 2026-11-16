import { act, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
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

const getAnimalOptions = () =>
  Array.from(document.querySelectorAll('[role="listbox"] [role="option"]')) as HTMLElement[]
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
  it('ancla el selector sobre el campo usando su altura real', () => {
    render(
      <InputSelectAnimals
        animals={animals.slice(0, 1)}
        selectedIds={[]}
        onAdd={jest.fn()}
        onRemove={jest.fn()}
      />,
    )
    const input = screen.getByPlaceholderText('Buscar por numero, nombre, tipo o raza...')
    jest.spyOn(input, 'getBoundingClientRect').mockReturnValue({
      top: window.innerHeight - 80,
      bottom: window.innerHeight - 40,
      left: 20,
      right: 300,
      width: 280,
      height: 40,
      x: 20,
      y: window.innerHeight - 80,
      toJSON: () => ({}),
    })
    fireEvent.focus(input)
    expect(screen.getByRole('listbox')).toHaveStyle({
      top: `${window.innerHeight - 84}px`,
      transform: 'translateY(-100%)',
    })
  })

  it('ordena por agregación, arete o edad', () => {
    renderSelector()
    const sort = screen.getByRole('button', { name: 'Ordenar por: Número' })

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

    const options = getAnimalOptions()
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

  it('ordena todo el catálogo y carga más filas al desplazarse', () => {
    const manyAnimals = Array.from({ length: 120 }, (_, index) => ({
      ...animals[0],
      id: `animal-${index}`,
      animalNumber: String(1000 - index),
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

    // El orden se aplica sobre todos antes de pintar la primera tanda.
    expect(getDropdownNumbers()).toEqual(Array.from({ length: 50 }, (_, i) => String(881 + i)))
    const listbox = screen.getByRole('listbox')
    Object.defineProperties(listbox, {
      scrollHeight: { configurable: true, value: 2000 },
      clientHeight: { configurable: true, value: 400 },
      scrollTop: { configurable: true, value: 1500 },
    })
    fireEvent.scroll(listbox)
    expect(getDropdownNumbers()).toHaveLength(100)
    fireEvent.mouseDown(screen.getByRole('button', { name: /Mostrando 100 de 120/ }))
    expect(getDropdownNumbers()).toHaveLength(120)
    expect(screen.queryByRole('button', { name: /Mostrando/ })).not.toBeInTheDocument()
  })

  describe('selección por áreas', () => {
    const areas = [
      { id: 'a1', farmId: 'f', name: 'Corral 1', type: 'barn', isActive: true },
      { id: 'a2', farmId: 'f', name: 'Potrero', type: 'pasture', isActive: true },
      { id: 'a3', farmId: 'f', name: 'Inactiva', type: 'other', isActive: false },
    ] as any
    const areaAnimals = [
      { ...animals[0], id: 'x1', animalNumber: '1', currentAreaId: 'a1' },
      { ...animals[0], id: 'x2', animalNumber: '2', currentAreaId: 'a1' },
      { ...animals[0], id: 'x3', animalNumber: '3', currentAreaId: 'a2' },
    ] as any

    const openAreas = () => {
      fireEvent.focus(screen.getByPlaceholderText('Buscar por numero, nombre, tipo o raza...'))
      fireEvent.click(screen.getByRole('radio', { name: 'Áreas' }))
    }

    it('no muestra el switch si no se pasan áreas', () => {
      render(
        <InputSelectAnimals
          animals={areaAnimals}
          selectedIds={[]}
          onAdd={jest.fn()}
          onRemove={jest.fn()}
        />,
      )
      fireEvent.focus(screen.getByPlaceholderText('Buscar por numero, nombre, tipo o raza...'))
      expect(screen.queryByTestId('areas-switch')).not.toBeInTheDocument()
    })

    it('muestra aviso cuando la granja no tiene áreas activas', () => {
      render(
        <InputSelectAnimals
          animals={areaAnimals}
          selectedIds={[]}
          onAdd={jest.fn()}
          onRemove={jest.fn()}
          areas={[areas[2]]}
        />,
      )
      openAreas()
      expect(screen.getByText(/No hay áreas activas/)).toBeInTheDocument()
    })

    it('agrega todos los animales pendientes del área con onAddMany', () => {
      const onAddMany = jest.fn()
      render(
        <InputSelectAnimals
          animals={areaAnimals}
          selectedIds={['x2']}
          onAdd={jest.fn()}
          onAddMany={onAddMany}
          onRemove={jest.fn()}
          areas={areas}
        />,
      )
      openAreas()

      expect(screen.queryByText('Inactiva')).not.toBeInTheDocument()
      const corral = screen.getByText('Corral 1').closest('[role="option"]') as HTMLElement
      expect(corral).toHaveTextContent('+1 animal')
      fireEvent.mouseDown(corral)
      expect(onAddMany).toHaveBeenCalledWith(['x1'])
    })

    it('ofrece Sin asignar con animales sin área activa', () => {
      const onAddMany = jest.fn()
      render(
        <InputSelectAnimals
          animals={[
            ...areaAnimals,
            { ...animals[0], id: 'x4', animalNumber: '4' },
            { ...animals[0], id: 'x5', animalNumber: '5', currentAreaId: 'a3' },
          ]}
          selectedIds={[]}
          onAdd={jest.fn()}
          onAddMany={onAddMany}
          onRemove={jest.fn()}
          areas={areas}
        />,
      )
      openAreas()
      const unassigned = screen.getByText('Sin asignar').closest('[role="option"]') as HTMLElement
      expect(unassigned).toHaveTextContent('+2 animales')
      fireEvent.mouseDown(unassigned)
      expect(onAddMany).toHaveBeenCalledWith(['x4', 'x5'])
    })

    it('respeta filterFn y usa onAdd por id si no hay onAddMany', () => {
      const onAdd = jest.fn()
      render(
        <InputSelectAnimals
          animals={areaAnimals}
          selectedIds={[]}
          onAdd={onAdd}
          onRemove={jest.fn()}
          areas={areas}
          filterFn={(a) => a.id !== 'x1'}
        />,
      )
      openAreas()
      fireEvent.mouseDown(screen.getByText('Corral 1').closest('[role="option"]') as HTMLElement)
      expect(onAdd.mock.calls).toEqual([['x2']])
    })

    it('Enter agrega la primera área con animales pendientes', () => {
      const onAddMany = jest.fn()
      render(
        <InputSelectAnimals
          animals={areaAnimals}
          selectedIds={['x1', 'x2']}
          onAdd={jest.fn()}
          onAddMany={onAddMany}
          onRemove={jest.fn()}
          areas={areas}
        />,
      )
      openAreas()
      expect(screen.getByText('Ya agregados')).toBeInTheDocument()
      fireEvent.keyDown(screen.getByPlaceholderText('Buscar área...'), { key: 'Enter' })
      expect(onAddMany).toHaveBeenCalledWith(['x3'])
    })
  })
})

describe('Escape dentro de un modal', () => {
  it('primero cierra el selector y luego el modal', () => {
    const { Modal } = jest.requireActual('@/components/Modal')
    const onClose = jest.fn()
    render(
      <Modal isOpen onClose={onClose} title="Editar">
        <InputSelectAnimals
          animals={animals as any}
          selectedIds={[]}
          onAdd={jest.fn()}
          onRemove={jest.fn()}
        />
      </Modal>,
    )
    const input = screen.getByPlaceholderText('Buscar por numero, nombre, tipo o raza...')
    fireEvent.focus(input)
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('Espacio', () => {
  const renderSelector = (onAdd = jest.fn()) => {
    render(
      <InputSelectAnimals
        animals={animals as any}
        selectedIds={[]}
        onAdd={onAdd}
        onRemove={jest.fn()}
        renderOption={(animal) => animal.animalNumber}
      />,
    )
    const input = screen.getByPlaceholderText('Buscar por numero, nombre, tipo o raza...')
    fireEvent.focus(input)
    return { input, onAdd }
  }

  it('selecciona el animal resaltado con flechas', () => {
    const { input, onAdd } = renderSelector()
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const highlighted = getAnimalOptions().find(
      (o) => o.getAttribute('aria-selected') === 'true',
    ) as HTMLElement
    fireEvent.keyDown(input, { key: ' ' })
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(highlighted).toHaveTextContent(
      (animals as any[]).find((a) => a.id === onAdd.mock.calls[0][0]).animalNumber,
    )
  })

  it('no selecciona al escribir ni con resaltado del mouse', () => {
    const { input, onAdd } = renderSelector()
    fireEvent.keyDown(input, { key: ' ' })
    fireEvent.mouseEnter(getAnimalOptions()[0])
    fireEvent.keyDown(input, { key: ' ' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.change(input, { target: { value: 'lote' } })
    fireEvent.keyDown(input, { key: ' ' })
    expect(onAdd).not.toHaveBeenCalled()
  })
})

describe('Navegación con teclado tras seleccionar', () => {
  const Wrapper = ({ onAdd }: { onAdd: (id: string) => void }) => {
    const [ids, setIds] = React.useState<string[]>([])
    return (
      <InputSelectAnimals
        animals={animals}
        selectedIds={ids}
        onAdd={(id) => {
          onAdd(id)
          setIds((prev) => [...prev, id])
        }}
        onRemove={jest.fn()}
        renderOption={(animal) => animal.animalNumber}
      />
    )
  }

  it.each([' ', 'Enter'])('con "%s", la flecha abajo resalta la fila siguiente', (key) => {
    const onAdd = jest.fn()
    render(<Wrapper onAdd={onAdd} />)
    const input = screen.getByPlaceholderText('Buscar por numero, nombre, tipo o raza...')
    fireEvent.focus(input)
    // Orden por número: 2-A, 3-A, 10-A, 20-A
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key })
    expect(onAdd).toHaveBeenLastCalledWith('3') // 10-A
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const highlighted = getAnimalOptions().find((o) => o.getAttribute('aria-selected') === 'true')
    expect(highlighted).toHaveTextContent('20-A')
    fireEvent.keyDown(input, { key: ' ' })
    expect(onAdd).toHaveBeenLastCalledWith('1') // 20-A
  })
})

describe('Orden en el desplegable', () => {
  const herd = [
    {
      id: 'h1',
      animalNumber: '1',
      type: 'oveja',
      gender: 'macho',
      stage: 'reproductor',
      breed: 'Pelibuey',
    },
    {
      id: 'h2',
      animalNumber: '2',
      type: 'oveja',
      gender: 'hembra',
      stage: 'engorda',
      breed: 'Dorper',
    },
    { id: 'h3', animalNumber: '3', type: 'oveja', gender: 'hembra', stage: 'reproductor' },
  ] as any

  const open = () => {
    render(
      <InputSelectAnimals
        animals={herd}
        selectedIds={[]}
        onAdd={jest.fn()}
        onRemove={jest.fn()}
        renderOption={(animal) => animal.animalNumber}
      />,
    )
    fireEvent.focus(screen.getByPlaceholderText('Buscar por numero, nombre, tipo o raza...'))
  }

  it('ordena por raza con vacíos al final e invierte al repetir clic', () => {
    open()
    expect(getDropdownNumbers()).toEqual(['1', '2', '3'])
    fireEvent.click(screen.getByRole('button', { name: 'Ordenar por Raza' }))
    expect(getDropdownNumbers()).toEqual(['2', '1', '3'])
    const active = screen.getByRole('button', { name: 'Ordenar por Raza, ascendente' })
    expect(active).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(active)
    expect(getDropdownNumbers()).toEqual(['1', '2', '3'])
  })

  it('ordena por género', () => {
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Ordenar por Género' }))
    expect(getDropdownNumbers()).toEqual(['2', '3', '1'])
  })
})

describe('selección múltiple con clic', () => {
  it('mantiene abierto el selector al elegir varios animales', () => {
    const Wrapper = () => {
      const [ids, setIds] = React.useState<string[]>([])
      return (
        <InputSelectAnimals
          animals={animals as any}
          selectedIds={ids}
          onAdd={(id) => setIds((prev) => [...prev, id])}
          onRemove={jest.fn()}
          renderOption={(animal) => animal.animalNumber}
        />
      )
    }
    render(<Wrapper />)
    fireEvent.focus(screen.getByPlaceholderText('Buscar por numero, nombre, tipo o raza...'))

    fireEvent.mouseDown(getAnimalOptions()[0])
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.mouseDown(getAnimalOptions()[0])
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(getAnimalOptions()).toHaveLength(animals.length - 2)
  })
})

describe('animación al agregar', () => {
  it('deja la fila agregada como fantasma que desaparece tras la animación', () => {
    jest.useFakeTimers()
    const Wrapper = () => {
      const [ids, setIds] = React.useState<string[]>([])
      return (
        <InputSelectAnimals
          animals={animals as any}
          selectedIds={ids}
          onAdd={(id) => setIds((prev) => [...prev, id])}
          onRemove={jest.fn()}
          renderOption={(animal) => animal.animalNumber}
        />
      )
    }
    render(<Wrapper />)
    fireEvent.focus(screen.getByPlaceholderText('Buscar por numero, nombre, tipo o raza...'))
    const first = getAnimalOptions()[0]
    const number = first.textContent
    fireEvent.mouseDown(first)

    const ghost = document.querySelector('[data-leaving="true"]')
    expect(ghost).toHaveTextContent(number as string)
    expect(ghost).toHaveAttribute('aria-hidden', 'true')
    expect(getDropdownNumbers()).not.toContain(number)

    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(document.querySelector('[data-leaving="true"]')).toBeNull()
    jest.useRealTimers()
  })
})
