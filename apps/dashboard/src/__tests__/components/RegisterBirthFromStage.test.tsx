import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import RegisterBirthFromStage from '@/components/RegisterBirthFromStage'

const birth = jest.fn()
const record = {
  id: 'mating',
  femaleBreedingInfo: [{ femaleId: 'mother', pregnancyConfirmedDate: '2026-01-01' }],
}
jest.mock('react-redux', () => ({
  useSelector: (select: any) => select({ breeding: { breedingRecords: [record] } }),
}))
jest.mock('@/hooks/useRecordMovements', () => ({ useRecordMovements: () => ({ birth }) }))
jest.mock('@/lib/record-movements', () => ({ createMovementId: () => 'movement' }))
jest.mock('@/components/ModalBirthForm', () => ({
  __esModule: true,
  default: ({ selectedFemaleId, onSubmit, onClose }: any) => (
    <div>
      <p>{selectedFemaleId}</p>
      <button type="button" onClick={() => onSubmit({ animalId: selectedFemaleId })}>
        Registrar parto
      </button>
      <button type="button" onClick={onClose}>
        Cerrar
      </button>
    </div>
  ),
}))
it('opens with the mother and closes without writing when canceled', () => {
  birth.mockClear()
  const close = jest.fn()
  render(
    <RegisterBirthFromStage
      motherId="mother"
      animals={[]}
      onClose={close}
      onCompleted={jest.fn()}
    />,
  )
  expect(screen.getByText('mother')).toBeInTheDocument()
  fireEvent.click(screen.getByText('Cerrar'))
  expect(close).toHaveBeenCalled()
  expect(birth).not.toHaveBeenCalled()
})
it('uses the existing birth movement and returns after persisted success', async () => {
  birth.mockResolvedValue(undefined)
  const completed = jest.fn()
  render(
    <RegisterBirthFromStage
      motherId="mother"
      animals={[]}
      onClose={jest.fn()}
      onCompleted={completed}
    />,
  )
  fireEvent.click(screen.getByText('Registrar parto'))
  await waitFor(() =>
    expect(birth).toHaveBeenCalledWith('movement', { animalId: 'mother' }, record),
  )
  fireEvent.click(screen.getByText('Cerrar'))
  expect(completed).toHaveBeenCalledTimes(1)
})
