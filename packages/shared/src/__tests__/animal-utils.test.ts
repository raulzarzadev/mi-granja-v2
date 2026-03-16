jest.mock('date-fns', () => ({
  toDate: (d: any) => (d instanceof Date ? d : new Date(d)),
}))

import { animalAge } from '../lib/animal-utils'
import { Animal } from '../types/animals'

const createAnimal = (overrides: Partial<Animal> = {}): Animal => ({
  id: 'animal-1',
  farmerId: 'farmer-1',
  animalNumber: 'A001',
  type: 'oveja',
  gender: 'hembra',
  stage: 'reproductor',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('animalAge', () => {
  describe('long format (default)', () => {
    it('should return months for older animals', () => {
      const twoYearsAgo = new Date()
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
      twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 3)
      const animal = createAnimal({ birthDate: twoYearsAgo })
      const result = animalAge(animal)
      expect(result).toContain('meses')
      expect(result).toMatch(/\d+ meses/)
    })

    it('should return months for young animals', () => {
      const fiveMonthsAgo = new Date()
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5)
      fiveMonthsAgo.setDate(1)
      const animal = createAnimal({ birthDate: fiveMonthsAgo })
      const result = animalAge(animal)
      expect(result).toContain('mes')
    })

    it('should return 0 meses for newborns', () => {
      const fiveDaysAgo = new Date()
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
      const animal = createAnimal({ birthDate: fiveDaysAgo })
      const result = animalAge(animal)
      expect(result).toBe('0 meses')
    })
  })

  describe('short format', () => {
    it('should return months with m suffix', () => {
      const twoYearsAgo = new Date()
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
      twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 3)
      const animal = createAnimal({ birthDate: twoYearsAgo })
      const result = animalAge(animal, { format: 'short' })
      expect(result).toMatch(/\d+m/)
    })

    it('should return 0m for newborns', () => {
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      const animal = createAnimal({ birthDate: threeDaysAgo })
      const result = animalAge(animal, { format: 'short' })
      expect(result).toBe('0m')
    })
  })

  describe('months format', () => {
    it('should return a number', () => {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      oneYearAgo.setDate(1)
      const animal = createAnimal({ birthDate: oneYearAgo })
      const result = animalAge(animal, { format: 'months' })
      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThanOrEqual(11)
      expect(result).toBeLessThanOrEqual(13)
    })
  })

  describe('no birthDate', () => {
    it('should return "No registrado" in long format', () => {
      const animal = createAnimal({ birthDate: undefined })
      const result = animalAge(animal)
      expect(result).toBe('No registrado')
    })

    it('should return 0 in months format', () => {
      const animal = createAnimal({ birthDate: undefined })
      const result = animalAge(animal, { format: 'months' })
      expect(result).toBe(0)
    })

    it('should use approximate age if available (long)', () => {
      const animal = createAnimal({ birthDate: undefined, age: 18 })
      const result = animalAge(animal)
      expect(result).toBe('18 meses (aprox.)')
    })

    it('should use approximate age if available (short)', () => {
      const animal = createAnimal({ birthDate: undefined, age: 18 })
      const result = animalAge(animal, { format: 'short' })
      expect(result).toBe('~18m')
    })
  })
})
