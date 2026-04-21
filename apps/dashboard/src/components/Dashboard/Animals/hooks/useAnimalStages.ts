'use client'

import { useMemo } from 'react'
import { computeAnimalEffectiveStage } from '@/lib/animal-utils'
import type { Animal } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'

interface Params {
  activeAnimals: Animal[]
  breedingRecords: BreedingRecord[]
  matchesEtapasFilters: (animal: Animal | undefined, opts?: { skipSearch?: boolean }) => boolean
}

export const useAnimalStages = ({
  activeAnimals,
  breedingRecords,
  matchesEtapasFilters,
}: Params) => {
  const engordaAnimals = useMemo(
    () =>
      activeAnimals.filter(
        (a) =>
          computeAnimalEffectiveStage(a, breedingRecords) === 'engorda' && matchesEtapasFilters(a),
      ),
    [activeAnimals, breedingRecords, matchesEtapasFilters],
  )
  const juvenilAnimals = useMemo(
    () =>
      activeAnimals.filter(
        (a) =>
          computeAnimalEffectiveStage(a, breedingRecords) === 'juvenil' && matchesEtapasFilters(a),
      ),
    [activeAnimals, breedingRecords, matchesEtapasFilters],
  )
  const reproductorAnimals = useMemo(
    () =>
      activeAnimals.filter(
        (a) =>
          computeAnimalEffectiveStage(a, breedingRecords) === 'reproductor' &&
          matchesEtapasFilters(a),
      ),
    [activeAnimals, breedingRecords, matchesEtapasFilters],
  )
  const criaAnimals = useMemo(
    () =>
      activeAnimals.filter(
        (a) =>
          computeAnimalEffectiveStage(a, breedingRecords) === 'cria' && matchesEtapasFilters(a),
      ),
    [activeAnimals, breedingRecords, matchesEtapasFilters],
  )
  const descarteAnimals = useMemo(
    () =>
      activeAnimals.filter(
        (a) =>
          computeAnimalEffectiveStage(a, breedingRecords) === 'descarte' && matchesEtapasFilters(a),
      ),
    [activeAnimals, breedingRecords, matchesEtapasFilters],
  )

  return {
    engordaAnimals,
    juvenilAnimals,
    reproductorAnimals,
    criaAnimals,
    descarteAnimals,
  }
}
