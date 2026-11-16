'use client'

import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import {
  type PregnantFemaleEntry,
  usePregnantFemales,
} from '@/components/Dashboard/Animals/hooks/usePregnantFemales'
import type { RootState } from '@/features/store'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { getWeaningDueDate, isActiveCalf } from '@/lib/animal-utils'
import { calculateExpectedBirthDate } from '@/lib/animalBreedingConfig'
import { toDate } from '@/lib/dates'
import type { Animal } from '@/types/animals'

/** Días hacia adelante que se consideran "próximos". */
export const PENDING_TASKS_WINDOW_DAYS = 7

export type FarmPendingTask = {
  id: string
  kind: 'parto' | 'destete'
  animal: Animal
  dueDate: Date
  /** Negativo = vencido. */
  daysUntil: number
}

const DAY_MS = 86400000
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const daysBetween = (from: Date, to: Date) =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS)

/** Fecha esperada de parto: la del empadre o pregnantAt + gestación de la especie. */
const expectedBirthDate = (entry: PregnantFemaleEntry): Date | null => {
  if (entry.info?.expectedBirthDate) return toDate(entry.info.expectedBirthDate)
  if (!entry.animal.pregnantAt) return null
  return calculateExpectedBirthDate(toDate(entry.animal.pregnantAt), entry.animal.type) ?? null
}

/**
 * Partos y destetes sin registrar: todos los vencidos y los que vencen dentro de
 * `windowDays`. Ordenados por fecha.
 */
export function buildFarmPendingTasks({
  activeAnimals,
  pregnant,
  now = new Date(),
  windowDays = PENDING_TASKS_WINDOW_DAYS,
}: {
  activeAnimals: Animal[]
  pregnant: PregnantFemaleEntry[]
  now?: Date
  windowDays?: number
}): FarmPendingTask[] {
  const tasks: FarmPendingTask[] = []
  const push = (kind: FarmPendingTask['kind'], animal: Animal, dueDate: Date | null) => {
    if (!dueDate || Number.isNaN(dueDate.getTime())) return
    const daysUntil = daysBetween(now, dueDate)
    if (daysUntil > windowDays) return
    tasks.push({ id: `${kind}-${animal.id}`, kind, animal, dueDate, daysUntil })
  }
  for (const entry of pregnant) push('parto', entry.animal, expectedBirthDate(entry))
  for (const animal of activeAnimals.filter(isActiveCalf)) {
    push('destete', animal, getWeaningDueDate(animal))
  }
  return tasks.sort((a, b) => a.daysUntil - b.daysUntil)
}

const matchAll = () => true

export function useFarmPendingTasks(): FarmPendingTask[] {
  const { animals } = useAnimalCRUD()
  const breedingRecords = useSelector((state: RootState) => state.breeding.breedingRecords)
  const activeAnimals = useMemo(
    () => animals.filter((animal) => (animal.status ?? 'activo') === 'activo'),
    [animals],
  )
  const pregnant = usePregnantFemales({
    activeAnimals,
    animals,
    breedingRecords,
    matchesEtapasFilters: matchAll,
  })
  return useMemo(
    () => buildFarmPendingTasks({ activeAnimals, pregnant }),
    [activeAnimals, pregnant],
  )
}
