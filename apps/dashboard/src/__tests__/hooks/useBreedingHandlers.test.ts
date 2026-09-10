import { renderHook } from '@testing-library/react'
import { useBreedingHandlers } from '@/components/Dashboard/Animals/hooks/useBreedingHandlers'
import type { Animal } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'

const mockUndo = jest.fn()
jest.mock('@/hooks/useRecordMovements', () => ({ useRecordMovements: () => ({ undo: mockUndo }) }))
const date = new Date('2026-01-01')
const record = {
  id: 'b',
  maleId: 'm',
  femaleBreedingInfo: [
    { femaleId: 'h', pregnancyConfirmedDate: date, actualBirthDate: date },
    { femaleId: 'h2' },
  ],
} as BreedingRecord
const setup = (animals: Animal[] = []) => {
  const updateBreedingRecord = jest.fn().mockResolvedValue(undefined)
  const deleteBreedingRecord = jest.fn().mockResolvedValue(undefined)
  const { result } = renderHook(() =>
    useBreedingHandlers({ animals, updateBreedingRecord, deleteBreedingRecord }),
  )
  return { result, updateBreedingRecord, deleteBreedingRecord }
}
beforeEach(() => jest.clearAllMocks())
it('retira la hembra mediante la actualización transaccional del empadre', async () => {
  const { result, updateBreedingRecord } = setup()
  await result.current.handleRemoveFromBreeding(record, 'h')
  expect(updateBreedingRecord).toHaveBeenCalledWith('b', {
    femaleBreedingInfo: [{ femaleId: 'h2' }],
  })
})
it('retira la confirmación mediante la actualización transaccional', async () => {
  const { result, updateBreedingRecord } = setup()
  await result.current.handleUnconfirmPregnancy(record, 'h')
  expect(updateBreedingRecord).toHaveBeenCalledWith('b', {
    femaleBreedingInfo: expect.arrayContaining([
      expect.objectContaining({ femaleId: 'h', pregnancyConfirmedDate: null }),
    ]),
  })
})
it('conserva la nota y fecha de aborto en el mismo movimiento', async () => {
  const { result, updateBreedingRecord } = setup()
  await result.current.handleAbortPregnancy(record, 'h', { date, note: 'Control' })
  expect(updateBreedingRecord).toHaveBeenCalledWith('b', {
    femaleBreedingInfo: expect.arrayContaining([
      expect.objectContaining({ outcome: 'aborted', outcomeNotes: 'Control', diagnosedAt: date }),
    ]),
  })
})
it('deshace el movimiento del parto correspondiente', async () => {
  const birth = { id: 'birth', eventType: 'parto', date, undoData: { documents: [{}] } }
  const { result } = setup([{ id: 'h', records: [birth] } as unknown as Animal])
  await result.current.handleRevertBirth(record, 'h')
  expect(mockUndo).toHaveBeenCalledWith(birth)
})
it('no elimina crías cuando un parto antiguo carece de reversión segura', async () => {
  const { result } = setup()
  await expect(result.current.handleRevertBirth(record, 'h')).rejects.toThrow('datos necesarios')
  expect(mockUndo).not.toHaveBeenCalled()
})
