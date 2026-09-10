'use client'

import { useCallback } from 'react'
import type { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import { useRecordMovements } from '@/hooks/useRecordMovements'
import { movementEqual } from '@/lib/record-movements'
import type { Animal } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'
import type { AbortPregnancyInput } from '@/types/components/breeding'

interface Params {
  animals: Animal[]
  updateBreedingRecord: ReturnType<typeof useBreedingCRUD>['updateBreedingRecord']
  deleteBreedingRecord: ReturnType<typeof useBreedingCRUD>['deleteBreedingRecord']
}

export const useBreedingHandlers = ({
  animals,
  updateBreedingRecord,
  deleteBreedingRecord,
}: Params) => {
  const movements = useRecordMovements(animals)

  const handleRemoveFromBreeding = useCallback(
    async (record: BreedingRecord, animalId: string) => {
      if (record.maleId === animalId) {
        await deleteBreedingRecord(record.id)
        return
      }
      const updatedFemaleInfo = record.femaleBreedingInfo.filter((i) => i.femaleId !== animalId)
      if (updatedFemaleInfo.length === 0) {
        await deleteBreedingRecord(record.id)
      } else {
        await updateBreedingRecord(record.id, { femaleBreedingInfo: updatedFemaleInfo })
      }
    },
    [deleteBreedingRecord, updateBreedingRecord],
  )

  const handleUnconfirmPregnancy = useCallback(
    async (record: BreedingRecord, femaleId: string) => {
      const updatedFemaleInfo = record.femaleBreedingInfo.map((info) =>
        info.femaleId === femaleId
          ? { ...info, pregnancyConfirmedDate: null, expectedBirthDate: null }
          : info,
      )
      await updateBreedingRecord(record.id, { femaleBreedingInfo: updatedFemaleInfo })
    },
    [updateBreedingRecord],
  )

  const handleAbortPregnancy = useCallback(
    async (record: BreedingRecord, femaleId: string, input: AbortPregnancyInput) => {
      const femaleInfo = record.femaleBreedingInfo.find((info) => info.femaleId === femaleId)
      if (!femaleInfo) return

      const abortedAt = input.date
      const updatedFemaleInfo = record.femaleBreedingInfo.map((info) =>
        info.femaleId === femaleId
          ? {
              ...info,
              outcome: 'aborted' as const,
              outcomeNotes: input.note?.trim() ?? '',
              diagnosedAt: abortedAt,
              actualBirthDate: null,
              expectedBirthDate: null,
            }
          : info,
      )

      await updateBreedingRecord(record.id, { femaleBreedingInfo: updatedFemaleInfo })
    },
    [updateBreedingRecord],
  )

  const handleRevertBirth = useCallback(
    async (breeding: BreedingRecord, femaleId: string) => {
      const mother = animals.find((animal) => animal.id === femaleId)
      const birth = [...(mother?.records ?? [])]
        .reverse()
        .find(
          (record) =>
            record.eventType === 'parto' &&
            !record.undoneAt &&
            record.undoData?.documents &&
            movementEqual(
              record.date,
              breeding.femaleBreedingInfo.find((info) => info.femaleId === femaleId)
                ?.actualBirthDate,
            ),
        )
      if (!birth)
        throw new Error(
          'Este parto anterior no conserva los datos necesarios para deshacerlo de forma segura.',
        )
      await movements.undo(birth)
    },
    [animals, movements],
  )

  return {
    handleRemoveFromBreeding,
    handleUnconfirmPregnancy,
    handleAbortPregnancy,
    handleRevertBirth,
  }
}
