'use client'

import { useMemo } from 'react'
import { findAnimalByRef } from '@/lib/animal-utils'
import type { Animal } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'

export type PregnantFemaleEntry = {
  animal: Animal
  record: BreedingRecord | null
  info: BreedingRecord['femaleBreedingInfo'][number] | undefined
  father: Animal | null
}

interface Params {
  activeAnimals: Animal[]
  animals: Animal[]
  breedingRecords: BreedingRecord[]
  matchesEtapasFilters: (animal: Animal | undefined, opts?: { skipSearch?: boolean }) => boolean
}

export const usePregnantFemales = ({
  activeAnimals,
  animals,
  breedingRecords,
  matchesEtapasFilters,
}: Params): PregnantFemaleEntry[] => {
  return useMemo(() => {
    const pregnant = activeAnimals.filter(
      (a) => a.gender === 'hembra' && a.computedStage === 'embarazos' && matchesEtapasFilters(a),
    )
    return pregnant.map<PregnantFemaleEntry>((animal) => {
      let record =
        breedingRecords.find((r) =>
          r.femaleBreedingInfo.some(
            (f) => f.femaleId === animal.id && f.pregnancyConfirmedDate && !f.actualBirthDate,
          ),
        ) ?? null
      if (!record) {
        record =
          breedingRecords.find((r) =>
            r.femaleBreedingInfo.some((f) => f.femaleId === animal.id && f.pregnancyConfirmedDate),
          ) ?? null
      }
      const info = record?.femaleBreedingInfo.find((f) => f.femaleId === animal.id)
      const fatherFromPregnantBy = animal.pregnantBy
        ? findAnimalByRef(animals, animal.pregnantBy)
        : undefined
      const fatherFromRecord = record ? findAnimalByRef(animals, record.maleId) : undefined
      const father = fatherFromPregnantBy ?? fatherFromRecord ?? null
      return { animal, record, info, father }
    })
  }, [activeAnimals, animals, breedingRecords, matchesEtapasFilters])
}
