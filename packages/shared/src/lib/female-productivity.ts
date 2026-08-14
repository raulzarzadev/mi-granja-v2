import { Animal, AnimalType } from '../types/animals'
import { BreedingRecord, FemaleBreedingInfo } from '../types/breedings'
import { isAnimalWeaned } from './animal-utils'
import { ANIMAL_BREEDING_CONFIGS } from './animalBreedingConfig'
import { toDate } from './dates'

const DAYS_PER_YEAR = 365.25
const MIN_EXPOSURE_YEARS = 1

export type FemaleProductivityBand =
  | 'none'
  | 'low'
  | 'below'
  | 'expected'
  | 'high'
  | 'extraordinary'

export interface FemaleProductivityResult {
  femaleId: string
  animalNumber: string
  species: AnimalType
  score: number
  band: FemaleProductivityBand
  targetPerYear: number
  productiveYears: number
  achievedOffspring: number
  annualizedOffspring: number
  recordedBirths: number
}

const validDate = (value: unknown): Date | null => {
  if (!value) return null
  const date = toDate(value as Date)
  return Number.isNaN(date.getTime()) ? null : date
}

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

/**
 * Curva de Hill: 0 cuando no hay producción, 1 al cumplir la meta y asíntota en 2.
 * El exponente 3 hace que duplicar la meta sea excepcional (1.78), sin llegar a 2.
 */
export const productivityRatioToScore = (ratio: number): number => {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0
  const cubed = ratio ** 3
  return Math.min(1.99, (2 * cubed) / (1 + cubed))
}

export const getFemaleProductivityBand = (score: number): FemaleProductivityBand => {
  const displayedScore = Number(score.toFixed(2))
  if (displayedScore <= 0) return 'none'
  if (displayedScore < 0.75) return 'low'
  if (displayedScore < 1) return 'below'
  if (displayedScore < 1.25) return 'expected'
  if (displayedScore < 1.6) return 'high'
  return 'extraordinary'
}

interface ProductivityContext {
  animalsByReference: Map<string, Animal>
  offspringByMother: Map<string, Animal[]>
  breedingInfoByFemale: Map<string, FemaleBreedingInfo[]>
}

const buildProductivityContext = (
  animals: Animal[],
  breedings: BreedingRecord[],
): ProductivityContext => {
  const animalsByReference = new Map<string, Animal>()
  const offspringByMother = new Map<string, Animal[]>()
  const breedingInfoByFemale = new Map<string, FemaleBreedingInfo[]>()

  for (const animal of animals) {
    animalsByReference.set(animal.id, animal)
    animalsByReference.set(animal.animalNumber, animal)
    if (animal.motherId) {
      const list = offspringByMother.get(animal.motherId) || []
      list.push(animal)
      offspringByMother.set(animal.motherId, list)
    }
  }

  for (const breeding of breedings) {
    for (const info of breeding.femaleBreedingInfo || []) {
      const list = breedingInfoByFemale.get(info.femaleId) || []
      list.push(info)
      breedingInfoByFemale.set(info.femaleId, list)
    }
  }

  return { animalsByReference, offspringByMother, breedingInfoByFemale }
}

const productiveExposureYears = (female: Animal, earliestBirth: Date | null, now: Date): number => {
  const config = ANIMAL_BREEDING_CONFIGS[female.type]
  const birthDate = validDate(female.birthDate)
  let start: Date | null = null

  if (birthDate) {
    start = new Date(birthDate)
    start.setMonth(start.getMonth() + config.minBreedingAge)
  } else if (earliestBirth) {
    // Sin nacimiento de la madre no inventamos edad: usamos el historial observable.
    start = earliestBirth
  }

  if (!start) return MIN_EXPOSURE_YEARS
  const elapsedYears = (now.getTime() - start.getTime()) / (DAYS_PER_YEAR * 24 * 60 * 60 * 1000)
  return Math.max(MIN_EXPOSURE_YEARS, elapsedYears)
}

export const hasReachedMinimumBreedingAge = (female: Animal, now = new Date()): boolean => {
  const birthDate = validDate(female.birthDate)
  if (!birthDate) return true

  const eligibleFrom = new Date(birthDate)
  eligibleFrom.setMonth(
    eligibleFrom.getMonth() + ANIMAL_BREEDING_CONFIGS[female.type].minBreedingAge,
  )
  return eligibleFrom.getTime() <= now.getTime()
}

const isDirectOffspringOf = (
  offspring: Animal,
  female: Animal,
  animalsByReference: Map<string, Animal>,
) => {
  if (!offspring.motherId) return true
  if (offspring.motherId === female.id || offspring.motherId === female.animalNumber) return true
  return animalsByReference.get(offspring.motherId)?.id === female.id
}

const calculateFemaleProductivityWithContext = (
  female: Animal,
  context: ProductivityContext,
  now = new Date(),
): FemaleProductivityResult => {
  const offspring = new Map<string, Animal>()
  const birthDates = new Map<string, Date>()

  const children = [
    ...(context.offspringByMother.get(female.id) || []),
    ...(context.offspringByMother.get(female.animalNumber) || []),
  ]
  for (const animal of children) {
    offspring.set(animal.id, animal)
    const birthDate = validDate(animal.birthDate)
    if (birthDate) birthDates.set(dateKey(birthDate), birthDate)
  }

  const breedingInfo = [
    ...(context.breedingInfoByFemale.get(female.id) || []),
    ...(context.breedingInfoByFemale.get(female.animalNumber) || []),
  ]
  for (const info of breedingInfo) {
    const actualBirthDate = validDate(info.actualBirthDate)
    if (actualBirthDate) birthDates.set(dateKey(actualBirthDate), actualBirthDate)

    for (const reference of info.offspring || []) {
      const animal = context.animalsByReference.get(reference)
      if (animal && isDirectOffspringOf(animal, female, context.animalsByReference)) {
        offspring.set(animal.id, animal)
      }
    }
  }

  const achievedOffspring = [...offspring.values()].filter(isAnimalWeaned).length
  const orderedBirthDates = [...birthDates.values()].sort((a, b) => a.getTime() - b.getTime())
  const productiveYears = productiveExposureYears(female, orderedBirthDates[0] || null, now)
  const annualizedOffspring = achievedOffspring / productiveYears
  const targetPerYear = ANIMAL_BREEDING_CONFIGS[female.type]?.expectedWeanedOffspringPerYear || 1
  const score = productivityRatioToScore(annualizedOffspring / targetPerYear)

  return {
    femaleId: female.id,
    animalNumber: female.animalNumber,
    species: female.type,
    score,
    band: getFemaleProductivityBand(score),
    targetPerYear,
    productiveYears,
    achievedOffspring,
    annualizedOffspring,
    recordedBirths: birthDates.size,
  }
}

export function calculateFemaleProductivity(
  female: Animal,
  animals: Animal[],
  breedings: BreedingRecord[],
  now = new Date(),
): FemaleProductivityResult {
  return calculateFemaleProductivityWithContext(
    female,
    buildProductivityContext(animals, breedings),
    now,
  )
}

export function calculateFemaleProductivityRanking(
  animals: Animal[],
  breedings: BreedingRecord[],
  now = new Date(),
): FemaleProductivityResult[] {
  const context = buildProductivityContext(animals, breedings)
  return animals
    .filter((animal) => {
      if (animal.gender !== 'hembra' || (animal.status ?? 'activo') !== 'activo') return false
      if (!hasReachedMinimumBreedingAge(animal, now)) return false
      const hasMaternalHistory =
        (context.offspringByMother.get(animal.id)?.length || 0) > 0 ||
        (context.offspringByMother.get(animal.animalNumber)?.length || 0) > 0 ||
        (context.breedingInfoByFemale.get(animal.id)?.length || 0) > 0 ||
        (context.breedingInfoByFemale.get(animal.animalNumber)?.length || 0) > 0
      return animal.stage === 'reproductor' || hasMaternalHistory
    })
    .map((female) => calculateFemaleProductivityWithContext(female, context, now))
    .sort((a, b) => b.score - a.score || a.animalNumber.localeCompare(b.animalNumber))
}
