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
  isWeaned: true,
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

/** Cría viva y sin destetar */
const createLiveCria = (overrides: Partial<Animal> = {}): Animal =>
  createAnimal({
    id: 'cria-1',
    stage: 'cria',
    isWeaned: false,
    weanedAt: undefined,
    status: undefined, // activo por defecto
    gender: 'hembra',
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

  describe('crias_lactantes detection', () => {
    const recentBirth = new Date(NOW)
    recentBirth.setDate(recentBirth.getDate() - 10)

    it('returns crias_lactantes for female with recent birth (no animals list — fallback)', () => {
      const female = createAnimal({ id: 'f-1', type: 'oveja' })
      const breedings = [
        createBreeding({
          femaleBreedingInfo: [{ femaleId: 'f-1', actualBirthDate: recentBirth }],
        }),
      ]
      // Sin lista de animales → fallback por fecha
      expect(computeAnimalEffectiveStage(female, breedings, NOW)).toBe('crias_lactantes')
    })

    it('returns crias_lactantes when at least one offspring is alive and unweaned', () => {
      const female = createAnimal({ id: 'f-1', type: 'oveja' })
      const cria = createLiveCria({ id: 'cria-1', motherId: 'f-1' })
      const breedings = [
        createBreeding({
          femaleBreedingInfo: [
            { femaleId: 'f-1', actualBirthDate: recentBirth, offspring: ['cria-1'] },
          ],
        }),
      ]
      expect(computeAnimalEffectiveStage(female, breedings, NOW, [female, cria])).toBe(
        'crias_lactantes',
      )
    })

    it('returns base stage when all offspring are dead', () => {
      const female = createAnimal({ id: 'f-1', type: 'oveja' })
      const deadCria = createLiveCria({ id: 'cria-1', motherId: 'f-1', status: 'muerto' })
      const breedings = [
        createBreeding({
          femaleBreedingInfo: [
            { femaleId: 'f-1', actualBirthDate: recentBirth, offspring: ['cria-1'] },
          ],
        }),
      ]
      expect(computeAnimalEffectiveStage(female, breedings, NOW, [female, deadCria])).toBe(
        'reproductor',
      )
    })

    it('returns base stage when all offspring are weaned', () => {
      const female = createAnimal({ id: 'f-1', type: 'oveja' })
      const weanedCria = createLiveCria({
        id: 'cria-1',
        motherId: 'f-1',
        isWeaned: true,
        stage: 'juvenil',
      })
      const breedings = [
        createBreeding({
          femaleBreedingInfo: [
            { femaleId: 'f-1', actualBirthDate: recentBirth, offspring: ['cria-1'] },
          ],
        }),
      ]
      expect(computeAnimalEffectiveStage(female, breedings, NOW, [female, weanedCria])).toBe(
        'reproductor',
      )
    })

    it('returns crias_lactantes when at least one offspring is alive even if others are dead', () => {
      const female = createAnimal({ id: 'f-1', type: 'oveja' })
      const deadCria = createLiveCria({ id: 'cria-1', motherId: 'f-1', status: 'muerto' })
      const liveCria = createLiveCria({ id: 'cria-2', motherId: 'f-1' })
      const breedings = [
        createBreeding({
          femaleBreedingInfo: [
            {
              femaleId: 'f-1',
              actualBirthDate: recentBirth,
              offspring: ['cria-1', 'cria-2'],
            },
          ],
        }),
      ]
      expect(
        computeAnimalEffectiveStage(female, breedings, NOW, [female, deadCria, liveCria]),
      ).toBe('crias_lactantes')
    })

    it('returns base stage for female with old birth (past weaning)', () => {
      const female = createAnimal({ id: 'f-1', type: 'oveja' })
      const oldBirth = new Date(NOW)
      oldBirth.setDate(oldBirth.getDate() - 200)
      const cria = createLiveCria({ id: 'cria-1', motherId: 'f-1' })
      const breedings = [
        createBreeding({
          femaleBreedingInfo: [
            { femaleId: 'f-1', actualBirthDate: oldBirth, offspring: ['cria-1'] },
          ],
        }),
      ]
      expect(computeAnimalEffectiveStage(female, breedings, NOW, [female, cria])).toBe(
        'reproductor',
      )
    })

    it('prioritizes crias_lactantes over embarazos when in multiple breedings', () => {
      const female = createAnimal({ id: 'f-1', type: 'oveja' })
      const cria = createLiveCria({ id: 'cria-1', motherId: 'f-1' })
      const breedings = [
        createBreeding({
          id: 'b-pregnant',
          femaleBreedingInfo: [{ femaleId: 'f-1', pregnancyConfirmedDate: new Date('2026-02-01') }],
        }),
        createBreeding({
          id: 'b-birthed',
          femaleBreedingInfo: [
            { femaleId: 'f-1', actualBirthDate: recentBirth, offspring: ['cria-1'] },
          ],
        }),
      ]
      expect(computeAnimalEffectiveStage(female, breedings, NOW, [female, cria])).toBe(
        'crias_lactantes',
      )
    })
  })

  describe('fallback via animal.birthedAt', () => {
    it('returns crias_lactantes via birthedAt when no breeding record and animals not provided', () => {
      const recentBirth = new Date(NOW)
      recentBirth.setDate(recentBirth.getDate() - 10)
      const female = createAnimal({ id: 'f-1', type: 'oveja', birthedAt: recentBirth })
      expect(computeAnimalEffectiveStage(female, [], NOW)).toBe('crias_lactantes')
    })

    it('returns crias_lactantes via birthedAt when a live cria has motherId', () => {
      const recentBirth = new Date(NOW)
      recentBirth.setDate(recentBirth.getDate() - 10)
      const female = createAnimal({ id: 'f-1', type: 'oveja', birthedAt: recentBirth })
      const cria = createLiveCria({ id: 'cria-1', motherId: 'f-1' })
      expect(computeAnimalEffectiveStage(female, [], NOW, [female, cria])).toBe('crias_lactantes')
    })

    it('returns base stage via birthedAt when all crias with motherId are dead', () => {
      const recentBirth = new Date(NOW)
      recentBirth.setDate(recentBirth.getDate() - 10)
      const female = createAnimal({ id: 'f-1', type: 'oveja', birthedAt: recentBirth })
      const deadCria = createLiveCria({ id: 'cria-1', motherId: 'f-1', status: 'muerto' })
      expect(computeAnimalEffectiveStage(female, [], NOW, [female, deadCria])).toBe('reproductor')
    })
  })
})
