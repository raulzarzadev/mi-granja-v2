'use client'

import { addDays, differenceInCalendarDays } from 'date-fns'
import { useMemo } from 'react'
import { getWeaningDays } from '@/lib/animalBreedingConfig'
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

export const useAnimalStages = ({
  activeAnimals,
  animals,
  breedingRecords,
  matchesEtapasFilters,
}: Params) => {
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
    const isAlive = (a: Animal) => a.status !== 'muerto' && a.status !== 'vendido'
    // weanedAt es el indicador definitivo de destete explícito; isWeaned puede ser inferido por edad
    const isUnweaned = (a: Animal) => !a.weanedAt

    return noursingMothersAnimals.map((mother) => {
      // Recopilar IDs de crías desde los breeding records
      const criaIdsFromBreeding = new Set<string>()
      for (const r of breedingRecords) {
        const info = r.femaleBreedingInfo?.find((f) => f.femaleId === mother.id)
        if (info?.offspring) {
          for (const id of info.offspring) criaIdsFromBreeding.add(id)
        }
      }

      // Resolver crías: desde breeding records primero, luego por motherId
      let crias: Animal[] = []
      if (criaIdsFromBreeding.size > 0) {
        crias = animals.filter(
          (a) =>
            criaIdsFromBreeding.has(a.id) &&
            isAlive(a) &&
            isUnweaned(a) &&
            a.computedStage === 'cria',
        )
      }
      // Fallback: crías cuyo motherId apunta a esta madre
      if (crias.length === 0) {
        const motherAnimal = animals.find((a) => a.id === mother.id)
        crias = animals.filter(
          (a) =>
            (a.motherId === mother.id ||
              (motherAnimal && a.motherId === motherAnimal.animalNumber)) &&
            isAlive(a) &&
            isUnweaned(a) &&
            a.computedStage === 'cria',
        )
      }

      // Destete más próximo entre las crías
      let minDaysUntilWean: number | null = null
      let earliestUnweanDate: Date | null = null
      for (const cria of crias) {
        if (cria.birthDate) {
          const days = getWeaningDays(cria)
          const weanDate = addDays(toDate(cria.birthDate), days)
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
  }, [noursingMothersAnimals, animals, breedingRecords])

  return {
    engordaAnimals,
    juvenilAnimals,
    reproductorAnimals,
    criaAnimals,
    descarteAnimals,
    empadreAnimals,
    noursingMothersAnimals,
    noursingMothersRows,
  }
}
