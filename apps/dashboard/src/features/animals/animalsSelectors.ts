import { createSelector } from '@reduxjs/toolkit'
import { computeAnimalEffectiveStage } from '@/lib/animal-utils'
import type { RootState } from '../store'

/**
 * Selector derivado que enriquece cada animal con `computedStage`.
 * Re-corre siempre que cambie la lista de animales o los registros de crianza.
 * Usa la lista completa de animales para detectar crías vivas/sin destetar
 * (sin fallback por fecha), eliminando las inconsistencias del stage efectivo.
 */
export const selectAnimalsWithComputedStage = createSelector(
  (state: RootState) => state.animals.animals,
  (state: RootState) => state.breeding.breedingRecords,
  (animals, breedingRecords) => {
    const now = new Date()
    return animals.map((animal) => ({
      ...animal,
      computedStage: computeAnimalEffectiveStage(animal, breedingRecords, now, animals),
    }))
  },
)
