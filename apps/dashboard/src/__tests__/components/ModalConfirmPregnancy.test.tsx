import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import ModalConfirmPregnancy from '@/components/ModalConfirmPregnancy'
import type { Animal } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'
import { renderWithProviders } from '../test-utils'

const animals: Animal[] = [
  {
    id: 'male-1',
    farmerId: 'farmer-1',
    animalNumber: 'M-1',
    type: 'oveja',
    gender: 'macho',
    stage: 'reproductor',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'female-1',
    farmerId: 'farmer-1',
    animalNumber: 'H-1',
    type: 'oveja',
    gender: 'hembra',
    stage: 'reproductor',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'female-2',
    farmerId: 'farmer-1',
    animalNumber: 'H-2',
    type: 'oveja',
    gender: 'hembra',
    stage: 'reproductor',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const breedingRecord: BreedingRecord = {
  id: 'breeding-1',
  breedingId: '01-feb-25-01',
  farmerId: 'farmer-1',
  maleId: 'male-1',
  breedingDate: new Date(2025, 1, 1),
  femaleBreedingInfo: [
    { femaleId: 'female-1', pregnancyConfirmedDate: null, offspring: [] },
    {
      femaleId: 'female-2',
      pregnancyConfirmedDate: new Date(2025, 1, 1),
      offspring: [],
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('ModalConfirmPregnancy', () => {
  it('allows editing and persisting the breeding start date', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    renderWithProviders(
      <ModalConfirmPregnancy
        isOpen
        onClose={jest.fn()}
        breedingRecord={breedingRecord}
        animals={animals}
        onSubmit={onSubmit}
        selectedAnimal="female-1"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Editar fecha' }))
    fireEvent.change(screen.getByLabelText('Nueva fecha de inicio del empadre'), {
      target: { value: '2025-02-15' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar 1 gestación' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const submittedRecord = onSubmit.mock.calls[0][0] as BreedingRecord
    expect(submittedRecord.breedingDate).toEqual(new Date(2025, 1, 15))
    expect(submittedRecord.femaleBreedingInfo[0].pregnancyConfirmedDate).toEqual(
      new Date(2025, 1, 15),
    )
    expect(submittedRecord.femaleBreedingInfo[1].pregnancyConfirmedDate).toEqual(
      new Date(2025, 1, 15),
    )
  })
})
