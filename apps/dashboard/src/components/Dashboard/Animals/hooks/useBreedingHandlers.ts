'use client'

import { useCallback } from 'react'
import type { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import type { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import type { Animal } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'

interface Params {
  animals: Animal[]
  update: ReturnType<typeof useAnimalCRUD>['update']
  remove: ReturnType<typeof useAnimalCRUD>['remove']
  wean: ReturnType<typeof useAnimalCRUD>['wean']
  addRecord: ReturnType<typeof useAnimalCRUD>['addRecord']
  updateBreedingRecord: ReturnType<typeof useBreedingCRUD>['updateBreedingRecord']
  deleteBreedingRecord: ReturnType<typeof useBreedingCRUD>['deleteBreedingRecord']
}

export const useBreedingHandlers = ({
  animals,
  update,
  remove,
  wean,
  addRecord,
  updateBreedingRecord,
  deleteBreedingRecord,
}: Params) => {
  // Conserva embarazo, padre y referencia al empadre en el animal cuando se le
  // saca del empadre con embarazo confirmado, para poder registrar el parto después.
  const preservePregnancyOnRemoval = useCallback(
    async (record: BreedingRecord, info: BreedingRecord['femaleBreedingInfo'][number]) => {
      const animal = animals.find((a) => a.id === info.femaleId)
      await update(info.femaleId, {
        pregnantAt: animal?.pregnantAt ?? info.pregnancyConfirmedDate ?? null,
        pregnantBy: animal?.pregnantBy ?? record.maleId,
        pregnantBreedingRecordId: record.id,
        pregnantBreedingId: record.breedingId ?? null,
      })
      await addRecord(info.femaleId, {
        type: 'note',
        category: 'general',
        title: 'Removida del empadre',
        description: `Se removió del empadre ${record.breedingId || record.id} conservando el embarazo.`,
        date: new Date(),
      })
    },
    [addRecord, animals, update],
  )

  const handleRemoveFromBreeding = useCallback(
    async (record: BreedingRecord, animalId: string) => {
      if (record.maleId === animalId) {
        const pregnantInfos = record.femaleBreedingInfo.filter(
          (i) => i.pregnancyConfirmedDate && !i.actualBirthDate,
        )
        for (const info of pregnantInfos) {
          await preservePregnancyOnRemoval(record, info)
        }
        await deleteBreedingRecord(record.id)
        return
      }
      const removedInfo = record.femaleBreedingInfo.find((i) => i.femaleId === animalId)
      const updatedFemaleInfo = record.femaleBreedingInfo.filter((i) => i.femaleId !== animalId)
      if (updatedFemaleInfo.length === 0) {
        await deleteBreedingRecord(record.id)
      } else {
        await updateBreedingRecord(record.id, { femaleBreedingInfo: updatedFemaleInfo })
      }
      if (removedInfo?.pregnancyConfirmedDate && !removedInfo.actualBirthDate) {
        await preservePregnancyOnRemoval(record, removedInfo)
      }
    },
    [deleteBreedingRecord, preservePregnancyOnRemoval, updateBreedingRecord],
  )

  const handleUnconfirmPregnancy = useCallback(
    async (record: BreedingRecord, femaleId: string) => {
      const updatedFemaleInfo = record.femaleBreedingInfo.map((info) =>
        info.femaleId === femaleId
          ? { ...info, pregnancyConfirmedDate: null, expectedBirthDate: null }
          : info,
      )
      await updateBreedingRecord(record.id, { femaleBreedingInfo: updatedFemaleInfo })
      await update(femaleId, {
        pregnantAt: null,
        pregnantBy: null,
        pregnantBreedingRecordId: null,
        pregnantBreedingId: null,
        birthedAt: null,
        weanedMotherAt: null,
      })
    },
    [update, updateBreedingRecord],
  )

  const handleRevertBirth = useCallback(
    async (record: BreedingRecord, femaleId: string) => {
      const femaleInfo = record.femaleBreedingInfo.find((fi) => fi.femaleId === femaleId)
      if (!femaleInfo) return

      if (femaleInfo.offspring?.length) {
        for (const offspringId of femaleInfo.offspring) {
          await remove(offspringId)
        }
      }

      const updatedFemaleInfo = record.femaleBreedingInfo.map((fi) =>
        fi.femaleId === femaleId ? { ...fi, actualBirthDate: null, offspring: [] } : fi,
      )
      await updateBreedingRecord(record.id, { femaleBreedingInfo: updatedFemaleInfo })

      await update(femaleId, {
        birthedAt: null,
        pregnantAt: femaleInfo.pregnancyConfirmedDate ?? null,
        pregnantBy: femaleInfo.pregnancyConfirmedDate ? record.maleId : null,
        pregnantBreedingRecordId: femaleInfo.pregnancyConfirmedDate ? record.id : null,
        pregnantBreedingId: femaleInfo.pregnancyConfirmedDate ? (record.breedingId ?? null) : null,
      })

      const mother = animals.find((a) => a.id === femaleId)
      await addRecord(femaleId, {
        type: 'note',
        category: 'general',
        title: 'Parto revertido',
        description: `Se revirtió el parto de ${mother?.animalNumber || femaleId}. ${femaleInfo.offspring?.length || 0} cría(s) eliminada(s).`,
        date: new Date(),
      })
    },
    [addRecord, animals, remove, update, updateBreedingRecord],
  )

  const weanAndUpdateMother = useCallback(
    async (animalId: string, opts: { stageDecision: 'engorda' | 'reproductor' }) => {
      await wean(animalId, opts)
      const animal = animals.find((a) => a.id === animalId)
      if (animal?.motherId) {
        const remainingCrias = animals.filter(
          (a) =>
            a.motherId === animal.motherId &&
            a.id !== animalId &&
            a.stage === 'cria' &&
            a.status !== 'muerto' &&
            a.status !== 'vendido',
        )
        if (remainingCrias.length === 0) {
          await update(animal.motherId, { weanedMotherAt: new Date(), birthedAt: null })
        }
      }
    },
    [animals, update, wean],
  )

  return {
    handleRemoveFromBreeding,
    handleUnconfirmPregnancy,
    handleRevertBirth,
    weanAndUpdateMother,
  }
}
