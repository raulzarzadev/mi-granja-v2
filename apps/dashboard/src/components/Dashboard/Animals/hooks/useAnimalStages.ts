'use client'

import { addDays, differenceInCalendarDays } from 'date-fns'
import { useMemo } from 'react'
import { getWeaningDays } from '@/lib/animalBreedingConfig'
import { activeUnweanedOffspring } from '@/lib/animal-utils'
import { toDate } from '@/lib/dates'
import type { Animal } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'
import type { NoursingMotherRow } from '../columns/noursingMothersColumns'

interface Params {
  activeAnimals: Animal[]
  animals: Animal[]
  breedingRecords: BreedingRecord[]
  matchesEtapasFilters: (animal: Animal | undefined, opts?: { skipSearch?: boolean }) => boolean
}

export const useAnimalStages = ({ activeAnimals, animals, matchesEtapasFilters }: Params) => {
  const engordaAnimals = useMemo(
    () => activeAnimals.filter((a) => a.computedStage === 'engorda' && matchesEtapasFilters(a)),
    [activeAnimals, matchesEtapasFilters],
  )
  const juvenilAnimals = useMemo(
    () => activeAnimals.filter((a) => a.computedStage === 'juvenil' && matchesEtapasFilters(a)),
    [activeAnimals, matchesEtapasFilters],
  )
  const reproductorAnimals = useMemo(
    () => activeAnimals.filter((a) => a.computedStage === 'reproductor' && matchesEtapasFilters(a)),
    [activeAnimals, matchesEtapasFilters],
  )
  const criaAnimals = useMemo(
    () => activeAnimals.filter((a) => a.computedStage === 'cria' && matchesEtapasFilters(a)),
    [activeAnimals, matchesEtapasFilters],
  )
  const descarteAnimals = useMemo(
    () => activeAnimals.filter((a) => a.computedStage === 'descarte' && matchesEtapasFilters(a)),
    [activeAnimals, matchesEtapasFilters],
  )

  /** Machos (y hembras) actualmente en un empadre activo */
  const empadreAnimals = useMemo(
    () => activeAnimals.filter((a) => a.computedStage === 'empadre' && matchesEtapasFilters(a)),
    [activeAnimals, matchesEtapasFilters],
  )

  /** Madres lactantes: computedStage ya fue calculado con lista completa de animales */
  const noursingMothersAnimals = useMemo(
    () =>
      activeAnimals.filter((a) => a.computedStage === 'crias_lactantes' && matchesEtapasFilters(a)),
    [activeAnimals, matchesEtapasFilters],
  )

  /** Rows enriquecidos para la tabla de madres lactantes */
  const noursingMothersRows = useMemo<NoursingMotherRow[]>(() => {
    return noursingMothersAnimals.map((mother) => {
      // Crías activas sin destetar (mismo criterio que hasLivingUnweanedOffspring)
      const crias = activeUnweanedOffspring({ farmAnimals: animals, motherId: mother.id })

      // Fecha de destete más próxima según birthDate de la cría + weaningDays de su especie
      let minDaysUntilWean: number | null = null
      let earliestUnweanDate: Date | null = null
      for (const cria of crias) {
        if (cria.birthDate) {
          const days = getWeaningDays(cria)
          const weanDate = addDays(toDate(cria.birthDate)!, days)
          const daysUntil = differenceInCalendarDays(weanDate, new Date())
          if (minDaysUntilWean === null || daysUntil < minDaysUntilWean) {
            minDaysUntilWean = daysUntil
            earliestUnweanDate = weanDate
          }
        }
      }

      return {
        animal: mother,
        crias,
        unweanDate: earliestUnweanDate,
        daysUntilWean: minDaysUntilWean,
      }
    })
  }, [noursingMothersAnimals, animals])

  /** Animales perdidos (status === 'perdido') */
  const perdidoAnimals = useMemo(
    () => animals.filter((a) => a.status === 'perdido' && matchesEtapasFilters(a)),
    [animals, matchesEtapasFilters],
  )

  return {
    engordaAnimals,
    juvenilAnimals,
    reproductorAnimals,
    criaAnimals,
    descarteAnimals,
    empadreAnimals,
    noursingMothersAnimals,
    noursingMothersRows,
    perdidoAnimals,
  }
}
