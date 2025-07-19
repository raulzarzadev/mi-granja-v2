import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BreedingForm from '@/components/BreedingForm'
import { Animal } from '@/types/animals'
import { BreedingRecord } from '@/types/breedings'

const mockAnimals: Animal[] = [
  {
    id: 'male-1',
    farmerId: 'farmer-1',
    animalNumber: 'M001',
    type: 'oveja',
    stage: 'reproductor',
    gender: 'macho',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },
  {
    id: 'female-1',
    farmerId: 'farmer-1',
    animalNumber: 'H001',
    type: 'oveja',
    stage: 'reproductor',
    gender: 'hembra',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  }
]

const defaultProps = {
  animals: mockAnimals,
  onSubmit: jest.fn(),
  onCancel: jest.fn(),
  isLoading: false
}

describe('BreedingForm Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render form elements correctly', () => {
    render(<BreedingForm {...defaultProps} />)

    const machoSelect = screen.getByLabelText(/macho/i)
    const hembraInput = screen.getByLabelText(/hembra/i)
    const cancelButton = screen.getByRole('button', { name: /cancelar/i })

    if (!machoSelect) throw new Error('Macho select not found')
    if (!hembraInput) throw new Error('Hembra input not found')
    if (!cancelButton) throw new Error('Cancel button not found')
  })

  it('should show guidance message when no male selected', () => {
    render(<BreedingForm {...defaultProps} />)

    const message = screen.getByText(/primero selecciona un macho/i)
    if (!message) throw new Error('Guidance message not found')
  })

  it('should allow male selection and show animal type badge', async () => {
    const user = userEvent.setup()
    render(<BreedingForm {...defaultProps} />)

    const maleSelect = screen.getByLabelText(/macho/i) as HTMLSelectElement
    await user.selectOptions(maleSelect, 'male-1')

    if (maleSelect.value !== 'male-1') {
      throw new Error('Male selection failed')
    }

    // Check for animal type badge
    const badge = screen.getByText('Oveja')
    if (!badge) throw new Error('Animal type badge not found')
  })

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnCancel = jest.fn()
    render(<BreedingForm {...defaultProps} onCancel={mockOnCancel} />)

    const cancelButton = screen.getByRole('button', { name: /cancelar/i })
    await user.click(cancelButton)

    if (mockOnCancel.mock.calls.length === 0) {
      throw new Error('onCancel should have been called')
    }
  })

  it('should disable submit button when required data is missing', () => {
    render(<BreedingForm {...defaultProps} />)

    const submitButton = screen.getByRole('button', {
      name: /selecciona un macho/i
    }) as HTMLButtonElement
    if (!submitButton.disabled) {
      throw new Error('Submit button should be disabled when data is missing')
    }
  })

  it('should show loading state correctly', () => {
    render(<BreedingForm {...defaultProps} isLoading={true} />)

    const submitButton = screen.getByRole('button', {
      name: /registrando.../i
    }) as HTMLButtonElement
    if (!submitButton.disabled) {
      throw new Error('Submit button should be disabled during loading')
    }
  })

  it('should load initial data in edit mode', () => {
    const initialData: BreedingRecord = {
      id: 'breeding-1',
      farmerId: 'farmer-1',
      maleId: 'male-1',
      breedingDate: new Date('2025-01-01'),
      femaleBreedingInfo: [
        {
          femaleId: 'female-1',
          pregnancyConfirmedDate: new Date('2025-01-15'),
          expectedBirthDate: new Date('2025-06-15'),
          offspring: []
        }
      ],
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01')
    }

    render(<BreedingForm {...defaultProps} initialData={initialData} />)

    const maleSelect = screen.getByLabelText(/macho/i) as HTMLSelectElement
    if (maleSelect.value !== 'male-1') {
      throw new Error('Initial male data not loaded correctly')
    }

    const updateButton = screen.getByRole('button', {
      name: /actualizar monta/i
    })
    if (!updateButton) throw new Error('Update button not found in edit mode')
  })

  it('should enable female selection after male selection', async () => {
    const user = userEvent.setup()
    render(<BreedingForm {...defaultProps} />)

    // Initially female input should be disabled
    const femaleInput = screen.getByPlaceholderText(
      /primero selecciona un macho/i
    ) as HTMLInputElement
    if (!femaleInput.disabled) {
      throw new Error('Female input should be disabled initially')
    }

    // Select male
    const maleSelect = screen.getByLabelText(/macho/i)
    await user.selectOptions(maleSelect, 'male-1')

    // Now female input should be enabled with proper placeholder
    const enabledFemaleInput = screen.getByPlaceholderText(
      /buscar hembra oveja/i
    ) as HTMLInputElement
    if (enabledFemaleInput.disabled) {
      throw new Error('Female input should be enabled after male selection')
    }
  })

  it('should allow female selection and show badge', async () => {
    const user = userEvent.setup()
    render(<BreedingForm {...defaultProps} />)

    // Select male first
    const maleSelect = screen.getByLabelText(/macho/i)
    await user.selectOptions(maleSelect, 'male-1')

    // Click on female input to open dropdown
    const femaleInput = screen.getByPlaceholderText(/buscar hembra oveja/i)
    await user.click(femaleInput)

    // Wait for and click on female option
    await waitFor(async () => {
      const femaleOption = screen.getByText('H001 - oveja')
      await user.click(femaleOption)
    })

    // Check that female badge appears in the selected females section
    await waitFor(() => {
      const femaleBadges = screen.getAllByText(/H001 - oveja/i)
      // Should have at least one badge (in the selected females area)
      if (femaleBadges.length === 0) throw new Error('Female badge not found')

      // Check specifically for the badge in the selected females section
      const selectedFemalesSection = screen
        .getByText(/hembra\(s\)/i)
        .closest('div')
      if (!selectedFemalesSection)
        throw new Error('Selected females section not found')

      const badgeInSection =
        selectedFemalesSection.querySelector('.bg-green-100')
      if (!badgeInSection)
        throw new Error('Female badge not found in selected section')
    })
  })
})
