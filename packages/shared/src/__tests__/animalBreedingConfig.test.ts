jest.mock('firebase/firestore', () => ({
  Timestamp: class MockTimestamp {
    seconds: number
    nanoseconds: number
    constructor(seconds: number, nanoseconds: number) {
      this.seconds = seconds
      this.nanoseconds = nanoseconds
    }
    toMillis() {
      return this.seconds * 1000 + this.nanoseconds / 1000000
    }
    toDate() {
      return new Date(this.toMillis())
    }
  },
}))

import {
  ANIMAL_BREEDING_CONFIGS,
  calculateExpectedBirthDate,
  getAnimalBreedingConfig,
  getWeaningDays,
  isInBreedingSeason,
} from '../lib/animalBreedingConfig'
import { AnimalType } from '../types/animals'

const allTypes: AnimalType[] = [
  'oveja',
  'cabra',
  'vaca',
  'cerdo',
  'gallina',
  'perro',
  'gato',
  'equino',
  'otro',
]

describe('animalBreedingConfig', () => {
  describe('ANIMAL_BREEDING_CONFIGS', () => {
    it('should have configs for all animal types', () => {
      for (const type of allTypes) {
        expect(ANIMAL_BREEDING_CONFIGS[type]).toBeDefined()
        expect(ANIMAL_BREEDING_CONFIGS[type].type).toBe(type)
        expect(ANIMAL_BREEDING_CONFIGS[type].gestationDays).toBeGreaterThan(0)
        expect(ANIMAL_BREEDING_CONFIGS[type].minBreedingAge).toBeGreaterThan(0)
      }
    })

    it('should have correct gestation days for known species', () => {
      expect(ANIMAL_BREEDING_CONFIGS.oveja.gestationDays).toBe(147)
      expect(ANIMAL_BREEDING_CONFIGS.vaca.gestationDays).toBe(283)
      expect(ANIMAL_BREEDING_CONFIGS.cerdo.gestationDays).toBe(114)
      expect(ANIMAL_BREEDING_CONFIGS.gallina.gestationDays).toBe(21)
      expect(ANIMAL_BREEDING_CONFIGS.equino.gestationDays).toBe(340)
    })
  })

  describe('getAnimalBreedingConfig', () => {
    it('should return config for a valid type', () => {
      const config = getAnimalBreedingConfig('oveja')
      expect(config.type).toBe('oveja')
      expect(config.gestationDays).toBe(147)
    })
  })

  describe('calculateExpectedBirthDate', () => {
    it('should add gestation days to breeding date', () => {
      const breedingDate = new Date(2025, 0, 1) // Jan 1, 2025
      const result = calculateExpectedBirthDate(breedingDate, 'oveja')
      expect(result).toBeInstanceOf(Date)
      // 147 days from Jan 1 = May 28
      expect(result!.getMonth()).toBe(4) // May
      expect(result!.getDate()).toBe(28)
    })

    it('should return null for invalid date', () => {
      const result = calculateExpectedBirthDate(new Date('invalid'), 'oveja')
      expect(result).toBeNull()
    })
  })

  describe('isInBreedingSeason', () => {
    it('should return true when within season', () => {
      // Oveja season: April (4) to July (7)
      const june = new Date(2025, 5, 15) // June
      expect(isInBreedingSeason(june, 'oveja')).toBe(true)
    })

    it('should return false when outside season', () => {
      // Oveja season: April (4) to July (7)
      const december = new Date(2025, 11, 15) // December
      expect(isInBreedingSeason(december, 'oveja')).toBe(false)
    })

    it('should handle season that crosses year boundary', () => {
      // Cabra season: August (8) to January (1)
      const december = new Date(2025, 11, 15) // December
      expect(isInBreedingSeason(december, 'cabra')).toBe(true)

      const march = new Date(2025, 2, 15) // March
      expect(isInBreedingSeason(march, 'cabra')).toBe(false)
    })

    it('should return true for year-round breeders', () => {
      // Vaca: Jan-Dec
      const anyMonth = new Date(2025, 3, 15)
      expect(isInBreedingSeason(anyMonth, 'vaca')).toBe(true)
    })
  })

  describe('getWeaningDays', () => {
    it('should return default weaning days for a type string', () => {
      expect(getWeaningDays('oveja')).toBe(60)
      expect(getWeaningDays('vaca')).toBe(120)
      expect(getWeaningDays('cerdo')).toBe(28)
    })

    it('should use custom weaning days if provided on animal', () => {
      const animal = { type: 'oveja' as const, customWeaningDays: 45 }
      expect(getWeaningDays(animal)).toBe(45)
    })

    it('should fall back to default if custom is not set', () => {
      const animal = { type: 'oveja' as const }
      expect(getWeaningDays(animal)).toBe(60)
    })
  })
})
