/**
 * Test para BreedingCard component
 */

import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import BreedingCard from '@/components/BreedingCard'
import { BreedingRecord } from '@/types/breedings'
import { Animal } from '@/types/animals'

const mockAnimals: Animal[] = [
  {
    id: 'male1',
    animalNumber: 'M001',
    type: 'vaca',
    gender: 'macho',
    stage: 'reproductor',
    farmerId: 'farmer1',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const mockRecord: BreedingRecord = {
  id: 'breeding1',
  farmerId: 'farmer1',
  maleId: 'male1',
  breedingDate: new Date('2024-01-01'),
  femaleBreedingInfo: [
    {
      femaleId: 'female1',
      pregnancyConfirmedDate: null,
      offspring: []
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('BreedingCard', () => {
  it('should render breeding card with basic information', () => {
    const { container } = render(
      <BreedingCard record={mockRecord} animals={mockAnimals} />
    )

    expect(container.textContent).contain('M001')
    expect(container.textContent).contain('F001')
  })

  it('should render with onRemoveFromBreeding prop', () => {
    const mockOnRemoveFromBreeding = jest.fn()

    const { container } = render(
      <BreedingCard
        record={mockRecord}
        animals={mockAnimals}
        onRemoveFromBreeding={mockOnRemoveFromBreeding}
      />
    )

    // Verificar que el componente se renderiza sin errores
    expect(container.textContent).contain('M001')
  })

  it('should render with onDeleteBirth prop', () => {
    const mockOnDeleteBirth = jest.fn()

    const { container } = render(
      <BreedingCard
        record={mockRecord}
        animals={mockAnimals}
        onDeleteBirth={mockOnDeleteBirth}
      />
    )

    // Verificar que el componente se renderiza sin errores
    expect(container.textContent).contain('M001')
  })

  it('should render with onUnconfirmPregnancy prop', () => {
    const mockOnUnconfirmPregnancy = jest.fn()

    const { container } = render(
      <BreedingCard
        record={mockRecord}
        animals={mockAnimals}
        onUnconfirmPregnancy={mockOnUnconfirmPregnancy}
      />
    )

    // Verificar que el componente se renderiza sin errores
    expect(container.textContent).contain('M001')
  })
})
