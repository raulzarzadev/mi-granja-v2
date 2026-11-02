import { ANIMAL_BREEDING_CONFIGS, calculateExpectedBirthDate } from '@/lib/animalBreedingConfig'
import { toDate } from '@/lib/dates'
import type { Animal } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'
import { addFarmCalendarDays } from './farm-calendar'

/** Shared by the pregnancy modal and the assistant's reviewed command. */
export function preparePregnancyConfirmation(
  record: BreedingRecord,
  animals: Animal[],
  selectedIds: string[],
  referenceDate: Date,
  timeZone?: string,
): BreedingRecord {
  const ids = [...new Set(selectedIds)]
  if (!ids.length) throw new Error('Selecciona al menos una hembra.')
  if (!Number.isFinite(referenceDate.getTime()) || referenceDate.getTime() > Date.now())
    throw new Error('La fecha de referencia debe ser válida y no estar en el futuro.')
  if (record.status === 'finished') throw new Error('El empadre ya está terminado.')
  const male = animals.find((animal) => animal.id === record.maleId)
  if (!male || male.gender !== 'macho' || (male.status ?? 'activo') !== 'activo')
    throw new Error('El macho del empadre no está disponible.')
  for (const id of ids) {
    const female = animals.find((animal) => animal.id === id)
    const info = record.femaleBreedingInfo.find((item) => item.femaleId === id)
    if (
      !female ||
      female.gender !== 'hembra' ||
      (female.status ?? 'activo') !== 'activo' ||
      female.type !== male.type ||
      !info ||
      info.pregnancyConfirmedDate ||
      info.actualBirthDate
    )
      throw new Error('Selecciona hembras activas pendientes de confirmar en este empadre.')
    if (female.pregnantAt)
      throw new Error('Una hembra ya tiene una gestación activa. Revisa su empadre actual.')
  }
  const previousDate = toDate(record.breedingDate)
  const dateChanged = previousDate?.getTime() !== referenceDate.getTime()
  const femaleBreedingInfo = record.femaleBreedingInfo.map((info) => {
    if (
      !ids.includes(info.femaleId) &&
      !(dateChanged && info.pregnancyConfirmedDate && !info.actualBirthDate)
    )
      return info
    const female = animals.find((animal) => animal.id === info.femaleId)
    if (!female) throw new Error('Una hembra del empadre ya no existe.')
    return {
      ...info,
      pregnancyConfirmedDate: referenceDate,
      expectedBirthDate: timeZone
        ? addFarmCalendarDays(
            referenceDate,
            ANIMAL_BREEDING_CONFIGS[female.type].gestationDays,
            timeZone,
          )
        : calculateExpectedBirthDate(referenceDate, female.type),
    }
  })
  const allConfirmed = femaleBreedingInfo.every((info) => !!info.pregnancyConfirmedDate)
  return {
    ...record,
    breedingDate: referenceDate,
    femaleBreedingInfo,
    ...(allConfirmed ? { status: 'finished' as const } : {}),
  }
}
