jest.mock('date-fns', () => ({
  toDate: (d: any) => (d instanceof Date ? d : new Date(d)),
}))

import {
  femaleBreedingStats,
  formatTimeRemaining,
  getLastWeight,
  monthsUntilBreedingAge,
  parentingStats,
  weightTargetProgress,
} from '../lib/animal-utils'
import { Animal } from '../types/animals'
import { BreedingRecord } from '../types/breedings'

const NOW = new Date('2026-04-19T12:00:00Z')

const createAnimal = (overrides: Partial<Animal> = {}): Animal => ({
  id: 'a-1',
  farmerId: 'f-1',
  animalNumber: 'A001',
  type: 'oveja',
  gender: 'hembra',
  stage: 'reproductor',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('formatTimeRemaining', () => {
  it('returns "ya disponible" for 0 or negative', () => {
    expect(formatTimeRemaining(0)).toBe('ya disponible')
    expect(formatTimeRemaining(-2)).toBe('ya disponible')
  })

  it('returns days when less than 1 month', () => {
    expect(formatTimeRemaining(0.4)).toBe('en 12 días')
    expect(formatTimeRemaining(0.033)).toBe('en 1 día')
  })

  it('returns months when >= 1', () => {
    expect(formatTimeRemaining(1)).toBe('en 1 mes')
    expect(formatTimeRemaining(3)).toBe('en 3 meses')
  })
})

describe('monthsUntilBreedingAge', () => {
  it('returns null if already past breeding age', () => {
    const old = new Date(NOW)
    old.setMonth(old.getMonth() - 24)
    const animal = createAnimal({ type: 'oveja', birthDate: old })
    expect(monthsUntilBreedingAge(animal, NOW)).toBeNull()
  })

  it('returns positive months left for young animals', () => {
    const recent = new Date(NOW)
    recent.setMonth(recent.getMonth() - 3) // 3 months old, oveja minBreedingAge = 8
    const animal = createAnimal({ type: 'oveja', birthDate: recent })
    const months = monthsUntilBreedingAge(animal, NOW)
    expect(months).not.toBeNull()
    expect(months!).toBeGreaterThan(4)
    expect(months!).toBeLessThanOrEqual(5)
  })
})

describe('getLastWeight', () => {
  it('returns null with no records', () => {
    expect(getLastWeight(createAnimal())).toBeNull()
  })

  it('reads from weightRecords (grams)', () => {
    const animal = createAnimal({
      weightRecords: [{ id: 'w1', date: new Date('2026-04-01'), weight: 35000 }],
    })
    const r = getLastWeight(animal)
    expect(r).not.toBeNull()
    expect(r!.kg).toBe(35)
  })

  it('picks most recent across both sources', () => {
    const animal = createAnimal({
      weightRecords: [{ id: 'w1', date: new Date('2026-03-01'), weight: 30000 }],
      records: [
        {
          id: 'r1',
          type: 'weight',
          date: new Date('2026-04-10'),
          title: '40 kg',
        } as any,
      ],
    })
    const r = getLastWeight(animal)
    expect(r!.kg).toBe(40)
  })
})

describe('weightTargetProgress', () => {
  it('returns null without target weight (e.g. perro)', () => {
    const animal = createAnimal({ type: 'perro' })
    expect(weightTargetProgress(animal)).toBeNull()
  })

  it('returns null without weight record', () => {
    expect(weightTargetProgress(createAnimal({ type: 'oveja' }))).toBeNull()
  })

  it('computes percent vs target (oveja target 50)', () => {
    const animal = createAnimal({
      type: 'oveja',
      weightRecords: [{ id: 'w1', date: new Date('2026-04-01'), weight: 44000 }],
    })
    const p = weightTargetProgress(animal)
    expect(p).not.toBeNull()
    expect(p!.target).toBe(50)
    expect(p!.current).toBe(44)
    expect(Math.round(p!.percent)).toBe(88)
  })
})

describe('parentingStats', () => {
  it('returns zero with empty animals', () => {
    expect(parentingStats(createAnimal({ id: 'm-1' }), [])).toEqual({
      births: 0,
      offspring: 0,
      lastBirthDate: null,
    })
  })

  it('counts offspring of female via motherId', () => {
    const mother = createAnimal({ id: 'mom-1', gender: 'hembra' })
    const animals: Animal[] = [
      mother,
      createAnimal({ id: 'c1', motherId: 'mom-1', birthDate: new Date('2026-01-10') }),
      createAnimal({ id: 'c2', motherId: 'mom-1', birthDate: new Date('2026-01-10') }),
      createAnimal({ id: 'c3', motherId: 'mom-1', birthDate: new Date('2025-06-05') }),
      createAnimal({ id: 'c4', motherId: 'other' }),
    ]
    const stats = parentingStats(mother, animals)
    expect(stats.offspring).toBe(3)
    expect(stats.births).toBe(2) // 2 distinct birthDates
    expect(stats.lastBirthDate?.toISOString().slice(0, 10)).toBe('2026-01-10')
  })

  it('counts offspring of male via fatherId', () => {
    const father = createAnimal({ id: 'dad-1', gender: 'macho' })
    const animals: Animal[] = [
      father,
      createAnimal({ id: 'c1', fatherId: 'dad-1', birthDate: new Date('2026-02-01') }),
      createAnimal({ id: 'c2', fatherId: 'dad-1', birthDate: new Date('2026-02-01') }),
    ]
    const stats = parentingStats(father, animals)
    expect(stats.offspring).toBe(2)
    expect(stats.births).toBe(1)
  })

  it('matches motherId by animalNumber too', () => {
    const mother = createAnimal({ id: 'mom-1', animalNumber: '167', gender: 'hembra' })
    const animals: Animal[] = [
      mother,
      createAnimal({ id: 'c1', motherId: '167', birthDate: new Date('2026-01-01') }),
    ]
    const stats = parentingStats(mother, animals)
    expect(stats.offspring).toBe(1)
  })
})

describe('femaleBreedingStats', () => {
  const female = createAnimal({ id: 'f-1' })

  const breeding = (info: any, overrides: Partial<BreedingRecord> = {}): BreedingRecord => ({
    id: 'b-1',
    farmerId: 'f-1',
    maleId: 'm-1',
    breedingDate: new Date('2026-01-01'),
    femaleBreedingInfo: [{ femaleId: 'f-1', ...info }],
    status: 'active',
    ...overrides,
  })

  it('zero stats with no breedings', () => {
    expect(femaleBreedingStats(female, [])).toEqual({
      pregnancies: 0,
      births: 0,
      offspring: 0,
      lastBirthDate: null,
    })
  })

  it('counts pregnancies, births and offspring', () => {
    const breedings = [
      breeding(
        {
          pregnancyConfirmedDate: new Date('2026-01-15'),
          actualBirthDate: new Date('2026-03-01'),
          offspring: ['c1', 'c2'],
        },
        { id: 'b1' },
      ),
      breeding(
        {
          pregnancyConfirmedDate: new Date('2025-08-15'),
          actualBirthDate: new Date('2025-10-15'),
          offspring: ['c3'],
        },
        { id: 'b2' },
      ),
      breeding({ pregnancyConfirmedDate: new Date('2026-04-01') }, { id: 'b3' }),
    ]
    const stats = femaleBreedingStats(female, breedings)
    expect(stats.pregnancies).toBe(3)
    expect(stats.births).toBe(2)
    expect(stats.offspring).toBe(3)
    expect(stats.lastBirthDate?.toISOString().slice(0, 10)).toBe('2026-03-01')
  })

  it('ignores breedings where female is not present', () => {
    const breedings = [
      {
        id: 'b1',
        farmerId: 'f-1',
        maleId: 'm-1',
        breedingDate: new Date('2026-01-01'),
        femaleBreedingInfo: [{ femaleId: 'other', actualBirthDate: new Date('2026-03-01') }],
        status: 'active',
      } as BreedingRecord,
    ]
    const stats = femaleBreedingStats(female, breedings)
    expect(stats).toEqual({ pregnancies: 0, births: 0, offspring: 0, lastBirthDate: null })
  })
})
