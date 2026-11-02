import { createAnimalRegistrationRecord } from '@/lib/animal-registration'
import { registrationStages } from '@/lib/animal-registration-stages'
import { normalizeAnimalSearch } from '@/lib/animal-search'
import { ANIMAL_BREEDING_CONFIGS } from '@/lib/animalBreedingConfig'
import type { Animal, AnimalRecord } from '@/types/animals'
import { farmDateKey } from './farm-calendar'

export type AnimalRegistrationInput = Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
export const animalNumberReservationKey = (farmId: string, number: string) =>
  `${encodeURIComponent(farmId)}--${encodeURIComponent(normalizeAnimalSearch(number))}`

export function validateAnimalRegistration(
  input: AnimalRegistrationInput,
  animals: Animal[],
  now = new Date(),
  timeZone?: string,
) {
  const number = input.animalNumber?.trim()
  if (!number || number.length > 120)
    throw new Error('Ingresa un ID de animal válido (máximo 120 caracteres).')
  if (
    animals.some(
      (animal) => normalizeAnimalSearch(animal.animalNumber) === normalizeAnimalSearch(number),
    )
  )
    throw new Error(`Ya existe un animal con el ID “${number}”.`)
  const localCalendar = (date: Date) => {
    if (!timeZone) return date
    const [year, month, day] = farmDateKey(date, timeZone).split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  const calendarToday = localCalendar(now)
  let inputBirth: Date | undefined
  if (input.birthDate) {
    const raw = input.birthDate as Date | { toDate?: () => Date }
    const birth = raw instanceof Date ? raw : raw.toDate?.()
    if (!birth || !Number.isFinite(birth.getTime()) || birth > now)
      throw new Error('La fecha de nacimiento debe ser válida y no estar en el futuro.')
    inputBirth = birth
    const calendarBirth = localCalendar(birth)
    const dateKey = `${calendarBirth.getFullYear()}-${String(calendarBirth.getMonth() + 1).padStart(2, '0')}-${String(calendarBirth.getDate()).padStart(2, '0')}`
    const lifecycle =
      input.lactationStatus === 'active'
        ? 'lechera'
        : input.pregnantAt
          ? 'embarazada'
          : input.stage === 'juvenil'
            ? 'reproductor'
            : input.stage
    if (!registrationStages(input.type, input.gender, dateKey, calendarToday).includes(lifecycle))
      throw new Error('Selecciona una etapa compatible con el género y la edad.')
  }
  if (input.isBreedingMale) {
    const config = ANIMAL_BREEDING_CONFIGS[input.type]
    if (
      input.gender !== 'macho' ||
      !inputBirth ||
      !['juvenil', 'reproductor'].includes(input.stage)
    )
      throw new Error('Solo un macho reproductor puede marcarse como semental.')
    const calendarBirth = localCalendar(inputBirth)
    const eligibleAt = new Date(
      calendarBirth.getFullYear(),
      calendarBirth.getMonth() + config.minBreedingAge,
      calendarBirth.getDate(),
    )
    if (calendarToday < eligibleAt)
      throw new Error('El macho aún no tiene la edad reproductiva de su especie.')
  }
  if (input.lactationStatus === 'active') {
    const lastBirth = input.birthedAt instanceof Date ? input.birthedAt : undefined
    if (!lastBirth || !inputBirth || lastBirth <= inputBirth || lastBirth > now)
      throw new Error('Revisa las fechas de nacimiento de la madre y su último parto.')
  }
  for (const [id, gender] of [
    [input.motherId, 'hembra'],
    [input.fatherId, 'macho'],
  ] as const) {
    if (!id) continue
    const parent = animals.find((animal) => animal.id === id)
    if (!parent || parent.gender !== gender || parent.type !== input.type)
      throw new Error('Selecciona progenitores de la misma especie y género correcto.')
    if (inputBirth && parent.birthDate) {
      const parentBirth =
        parent.birthDate instanceof Date
          ? parent.birthDate
          : new Date(parent.birthDate as unknown as string)
      if (Number.isFinite(parentBirth.getTime()) && parentBirth >= inputBirth)
        throw new Error('Los progenitores deben haber nacido antes que la cría.')
    }
  }
}

export function buildRegisteredAnimal(
  input: AnimalRegistrationInput,
  context: { userId: string; farmId: string },
  now = new Date(),
  registrationId?: string,
) {
  const registration = createAnimalRegistrationRecord(input, context.userId, now)
  if (registrationId) registration.id = registrationId
  const records: AnimalRecord[] = [...(input.records || []), registration]
  if (
    typeof input.weight === 'number' &&
    input.weight > 0 &&
    !records.some((record) => record.type === 'weight')
  ) {
    records.push({
      id: registrationId ? `${registrationId}-weight` : crypto.randomUUID(),
      type: 'weight',
      category: 'general',
      title: `${(input.weight / 1000).toFixed(1)} kg`,
      weightGrams: input.weight,
      date: now,
      createdAt: now,
      createdBy: context.userId,
    })
  }
  return {
    ...input,
    animalNumber: input.animalNumber.trim(),
    records,
    farmerId: context.userId,
    farmId: context.farmId,
    createdAt: now,
    updatedAt: now,
  }
}
