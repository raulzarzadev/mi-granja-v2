import { AnimalType } from '@/types'

export interface AnimalBreedingConfig {
  type: AnimalType
  gestationDays: number
  breedingSeasonStart?: number // Mes del año (1-12)
  breedingSeasonEnd?: number
  averageLitterSize: number
  minBreedingAge: number // En meses
  maxBreedingAge?: number // En meses
  breedingCycleDays: number // Ciclo estral
  description: string
}

export const ANIMAL_BREEDING_CONFIGS: Record<AnimalType, AnimalBreedingConfig> =
  {
    oveja: {
      type: 'oveja',
      gestationDays: 147, // ~5 meses
      breedingSeasonStart: 4, // Abril
      breedingSeasonEnd: 7, // Julio
      averageLitterSize: 1.5,
      minBreedingAge: 8, // 8 meses
      maxBreedingAge: 96, // 8 años
      breedingCycleDays: 17,
      description: 'Ovejas: gestación ~5 meses, temporada de abril a julio'
    },
    cabra: {
      type: 'cabra',
      gestationDays: 150, // ~5 meses
      breedingSeasonStart: 8, // Agosto
      breedingSeasonEnd: 1, // Enero (siguiente año)
      averageLitterSize: 2,
      minBreedingAge: 7,
      maxBreedingAge: 84, // 7 años
      breedingCycleDays: 21,
      description: 'Cabras: gestación ~5 meses, temporada de agosto a enero'
    },
    vaca_leche: {
      type: 'vaca_leche',
      gestationDays: 283, // ~9.3 meses
      breedingSeasonStart: 1, // Todo el año
      breedingSeasonEnd: 12,
      averageLitterSize: 1,
      minBreedingAge: 15, // 15 meses
      maxBreedingAge: 180, // 15 años
      breedingCycleDays: 21,
      description: 'Vacas lecheras: gestación ~9.3 meses, reproducción anual'
    },
    vaca_engorda: {
      type: 'vaca_engorda',
      gestationDays: 283,
      breedingSeasonStart: 1,
      breedingSeasonEnd: 12,
      averageLitterSize: 1,
      minBreedingAge: 15,
      maxBreedingAge: 144, // 12 años
      breedingCycleDays: 21,
      description: 'Vacas de engorda: gestación ~9.3 meses'
    },
    cerdo: {
      type: 'cerdo',
      gestationDays: 114, // ~3.8 meses
      breedingSeasonStart: 1,
      breedingSeasonEnd: 12,
      averageLitterSize: 8,
      minBreedingAge: 6,
      maxBreedingAge: 60, // 5 años
      breedingCycleDays: 21,
      description: 'Cerdos: gestación ~3.8 meses, camadas grandes'
    }
  }

export const getAnimalBreedingConfig = (
  animalType: AnimalType
): AnimalBreedingConfig => {
  return ANIMAL_BREEDING_CONFIGS[animalType]
}

export const calculateExpectedBirthDate = (
  breedingDate: Date,
  animalType: AnimalType
): Date => {
  const config = getAnimalBreedingConfig(animalType)
  const expectedDate = new Date(breedingDate)
  expectedDate.setDate(expectedDate.getDate() + config.gestationDays)
  return expectedDate
}

export const isInBreedingSeason = (
  date: Date,
  animalType: AnimalType
): boolean => {
  const config = getAnimalBreedingConfig(animalType)
  const month = date.getMonth() + 1 // JavaScript months are 0-indexed

  if (!config.breedingSeasonStart || !config.breedingSeasonEnd) {
    return true // Todo el año
  }

  // Si la temporada cruza el año (ej: agosto a enero)
  if (config.breedingSeasonStart > config.breedingSeasonEnd) {
    return (
      month >= config.breedingSeasonStart || month <= config.breedingSeasonEnd
    )
  }

  return (
    month >= config.breedingSeasonStart && month <= config.breedingSeasonEnd
  )
}

export const getBreedingAdvice = (
  breedingDate: Date,
  femaleType: AnimalType,
  femaleAge?: number
): string[] => {
  const config = getAnimalBreedingConfig(femaleType)
  const advice: string[] = []

  // Verificar temporada de reproducción
  if (!isInBreedingSeason(breedingDate, femaleType)) {
    advice.push(`⚠️ Fuera de temporada reproductiva óptima para ${femaleType}`)
  }

  // Verificar edad
  if (femaleAge) {
    if (femaleAge < config.minBreedingAge) {
      advice.push(
        `⚠️ La hembra puede ser muy joven (${femaleAge} meses, mínimo ${config.minBreedingAge} meses)`
      )
    }
    if (config.maxBreedingAge && femaleAge > config.maxBreedingAge) {
      advice.push(
        `⚠️ La hembra puede ser muy mayor (${femaleAge} meses, máximo ${config.maxBreedingAge} meses)`
      )
    }
  }

  // Información general
  advice.push(`ℹ️ ${config.description}`)
  advice.push(`ℹ️ Promedio de crías esperadas: ${config.averageLitterSize}`)

  return advice
}
