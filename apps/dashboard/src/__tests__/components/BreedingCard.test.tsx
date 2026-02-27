/**
 * Test para BreedingCard component
 *
 * BreedingCard usa useBreedingCRUD que accede a Redux + Firestore.
 * Verificamos que el componente se monta correctamente con Provider.
 */

import React from 'react'
import '@testing-library/jest-dom'
import BreedingCard from '@/components/BreedingCard'
import { Animal } from '@/types/animals'
import { BreedingRecord } from '@/types/breedings'
import { renderWithProviders } from '../test-utils'

const mockAnimals: Animal[] = [
  {
    id: 'male1',
    animalNumber: 'M001',
    type: 'vaca',
    gender: 'macho',
    stage: 'reproductor',
    farmerId: 'farmer1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'female1',
    animalNumber: 'F001',
    type: 'vaca',
    gender: 'hembra',
    stage: 'reproductor',
    farmerId: 'farmer1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
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
      offspring: [],
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('BreedingCard', () => {
  it('should render breeding card without crashing', () => {
    const { container } = renderWithProviders(
      <BreedingCard record={mockRecord} animals={mockAnimals} />,
    )
    expect(container).toBeTruthy()
  })

  it('should display male animal number', () => {
    const { container } = renderWithProviders(
      <BreedingCard record={mockRecord} animals={mockAnimals} />,
    )
    expect(container.textContent).toContain('M001')
  })

  it('should render with optional action handlers', () => {
    const { container } = renderWithProviders(
      <BreedingCard
        record={mockRecord}
        animals={mockAnimals}
        onRemoveFromBreeding={jest.fn()}
        onDeleteBirth={jest.fn()}
        onUnconfirmPregnancy={jest.fn()}
      />,
    )
    expect(container).toBeTruthy()
  })
})
