jest.mock('date-fns', () => ({
  toDate: (d: any) => (d instanceof Date ? d : new Date(d)),
}))

import { computeAnimalEffectiveStage } from '../lib/animal-utils'
import { Animal } from '../types/animals'
import { BreedingRecord } from '../types/breedings'

const NOW = new Date('2026-04-19T12:00:00Z')

const createAnimal = (overrides: Partial<Animal> = {}): Animal => ({
  id: 'animal-1',
  farmerId: 'farmer-1',
  animalNumber: 'A001',
  type: 'oveja',
  gender: 'hembra',
  stage: 'reproductor',
  birthDate: new Date('2024-01-01'),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const createBreeding = (overrides: Partial<BreedingRecord> = {}): BreedingRecord => ({
  id: 'b-1',
  farmerId: 'farmer-1',
  maleId: 'male-1',
  breedingDate: new Date('2026-01-01'),
  femaleBreedingInfo: [],
  status: 'active',
  ...overrides,
})

describe('computeAnimalEffectiveStage', () => {
  it('returns base stage when no breedings', () => {
    const animal = createAnimal()
    expect(computeAnimalEffectiveStage(animal, [], NOW)).toBe('reproductor')
  })

  it('returns empadre for active male in breeding', () => {
    const male = createAnimal({ id: 'male-1', gender: 'macho' })
    const breedings = [createBreeding({ maleId: 'male-1' })]
    expect(computeAnimalEffectiveStage(male, breedings, NOW)).toBe('empadre')
  })

  it('returns base stage for male in finished breeding', () => {
    const male = createAnimal({ id: 'male-1', gender: 'macho' })
    const breedings = [createBreeding({ maleId: 'male-1', status: 'finished' })]
    expect(computeAnimalEffectiveStage(male, breedings, NOW)).toBe('reproductor')
  })

  it('returns empadre for female without pregnancy confirmed', () => {
    const female = createAnimal({ id: 'f-1' })
    const breedings = [
      createBreeding({
        femaleBreedingInfo: [{ femaleId: 'f-1' }],
      }),
    ]
    expect(computeAnimalEffectiveStage(female, breedings, NOW)).toBe('empadre')
  })

  it('returns embarazos for female with pregnancy confirmed and no birth', () => {
    const female = createAnimal({ id: 'f-1' })
    const breedings = [
      createBreeding({
        femaleBreedingInfo: [{ femaleId: 'f-1', pregnancyConfirmedDate: new Date('2026-02-01') }],
      }),
    ]
    expect(computeAnimalEffectiveStage(female, breedings, NOW)).toBe('embarazos')
  })

  it('returns crias_lactantes for female with recent birth (within weaning days)', () => {
    const female = createAnimal({ id: 'f-1', type: 'oveja' })
    const recentBirth = new Date(NOW)
    recentBirth.setDate(recentBirth.getDate() - 10)
    const breedings = [
      createBreeding({
        femaleBreedingInfo: [{ femaleId: 'f-1', actualBirthDate: recentBirth }],
      }),
    ]
    expect(computeAnimalEffectiveStage(female, breedings, NOW)).toBe('crias_lactantes')
  })

  it('returns base stage for female with old birth (past weaning)', () => {
    const female = createAnimal({ id: 'f-1', type: 'oveja' })
    const oldBirth = new Date(NOW)
    oldBirth.setDate(oldBirth.getDate() - 200)
    const breedings = [
      createBreeding({
        femaleBreedingInfo: [{ femaleId: 'f-1', actualBirthDate: oldBirth }],
      }),
    ]
    expect(computeAnimalEffectiveStage(female, breedings, NOW)).toBe('reproductor')
  })

  it('prioritizes crias_lactantes over embarazos when in multiple breedings', () => {
    const female = createAnimal({ id: 'f-1', type: 'oveja' })
    const recentBirth = new Date(NOW)
    recentBirth.setDate(recentBirth.getDate() - 10)
    const breedings = [
      createBreeding({
        id: 'b-pregnant',
        femaleBreedingInfo: [{ femaleId: 'f-1', pregnancyConfirmedDate: new Date('2026-02-01') }],
      }),
      createBreeding({
        id: 'b-birthed',
        femaleBreedingInfo: [{ femaleId: 'f-1', actualBirthDate: recentBirth }],
      }),
    ]
    expect(computeAnimalEffectiveStage(female, breedings, NOW)).toBe('crias_lactantes')
  })
})
