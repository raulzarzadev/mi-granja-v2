import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import {
  AnimalsFilters,
  initialAnimalFilters,
} from '@/components/Dashboard/Animals/animals-filters'
import type { Animal } from '@/types/animals'

jest.mock('@/components/ModalAnimalForm', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ModalNewRecord', () => ({ __esModule: true, default: () => null }))
jest.mock('@/hooks/useAnimalCRUD', () => ({ useAnimalCRUD: jest.fn() }))

it('muestra especies con cuentas y permite seleccionar y volver a Todos', () => {
  function Example() {
    const [filters, setFilters] = useState(initialAnimalFilters)
    return (
      <AnimalsFilters
        filters={filters}
        setFilters={setFilters}
        speciesAnimals={[{ type: 'oveja' }, { type: 'oveja' }, { type: 'cabra' }] as Animal[]}
        filteredCount={3}
        activeFilterCount={0}
        availableTypes={['oveja', 'cabra']}
        availableBreeds={[]}
        availableStages={[]}
        availableGenders={[]}
        crossTabDuplicatesCount={0}
        onShowDuplicates={() => {}}
        formatStatLabel={(key) => key}
        tabsTotal={3}
      />
    )
  }
  render(<Example />)
  const trigger = screen.getByRole('button', { name: 'Todos (3) Todos los animales visibles' })
  expect(
    trigger.compareDocumentPosition(screen.getByRole('button', { name: 'Género' })) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy()
  fireEvent.click(trigger)
  expect(screen.getByRole('menuitemradio', { name: /Todos \(3\)/ })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  fireEvent.click(screen.getByRole('menuitemradio', { name: /oveja.*\(2\)/i }))
  fireEvent.click(screen.getByRole('button', { name: 'oveja (2)' }))
  expect(screen.getByRole('menuitemradio', { name: /cabra.*\(1\)/i })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('menuitemradio', { name: /Todos \(3\)/ }))
  expect(
    screen.getByRole('button', { name: 'Todos (3) Todos los animales visibles' }),
  ).toBeInTheDocument()
})
