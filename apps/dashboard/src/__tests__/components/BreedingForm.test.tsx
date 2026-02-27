/**
 * Test para BreedingForm component
 *
 * BreedingForm usa react-hook-form + zod + custom form components +
 * useAnimalCRUD/useBreedingCRUD hooks. Tests verify rendering and basic UI.
 */

import { screen } from '@testing-library/react'
import React from 'react'
import BreedingForm from '@/components/BreedingForm'
import { Animal } from '@/types/animals'
import { renderWithProviders } from '../test-utils'

const mockAnimals: Animal[] = [
  {
    id: 'male-1',
    farmerId: 'farmer-1',
    animalNumber: 'M001',
    type: 'oveja',
    stage: 'reproductor',
    gender: 'macho',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: 'female-1',
    farmerId: 'farmer-1',
    animalNumber: 'H001',
    type: 'oveja',
    stage: 'reproductor',
    gender: 'hembra',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
]

const defaultProps = {
  animals: mockAnimals,
  onSubmit: jest.fn(),
  onCancel: jest.fn(),
  isLoading: false,
}

describe('BreedingForm Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the form without crashing', () => {
    const { container } = renderWithProviders(<BreedingForm {...defaultProps} />)
    expect(container.querySelector('form')).toBeTruthy()
  })

  it('should render the male select field', () => {
    renderWithProviders(<BreedingForm {...defaultProps} />)
    // The SelectField renders a label "Macho"
    expect(screen.getByText('Macho')).toBeTruthy()
  })

  it('should show guidance message when no male selected', () => {
    renderWithProviders(<BreedingForm {...defaultProps} />)
    expect(screen.getByText(/primero selecciona un macho/i)).toBeTruthy()
  })

  it('should render cancel button', () => {
    renderWithProviders(<BreedingForm {...defaultProps} />)
    const cancelButton = screen.getByRole('button', { name: /cancelar/i })
    expect(cancelButton).toBeTruthy()
  })

  it('should render ID de Monta field', () => {
    renderWithProviders(<BreedingForm {...defaultProps} />)
    expect(screen.getByText('ID de Monta')).toBeTruthy()
  })

  it('should render Fecha de Monta field', () => {
    renderWithProviders(<BreedingForm {...defaultProps} />)
    expect(screen.getByText('Fecha de Monta')).toBeTruthy()
  })

  it('should render male options in select', () => {
    renderWithProviders(<BreedingForm {...defaultProps} />)
    // The select should have the male option
    const maleSelect = screen.getByLabelText('Macho') as HTMLSelectElement
    expect(maleSelect).toBeTruthy()
    // Should have "Seleccionar macho" placeholder + male option
    const options = maleSelect.querySelectorAll('option')
    expect(options.length).toBeGreaterThanOrEqual(2)
  })
})
