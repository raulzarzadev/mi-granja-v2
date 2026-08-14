import { ANIMAL_BREEDING_CONFIGS } from '../lib/animalBreedingConfig'
import {
  calculateFemaleProductivity,
  calculateFemaleProductivityRanking,
  productivityRatioToScore,
} from '../lib/female-productivity'
import { Animal, AnimalType } from '../types/animals'
import { BreedingRecord } from '../types/breedings'

const now = new Date('2026-01-01T12:00:00')

const makeAnimal = (overrides: Partial<Animal> & Pick<Animal, 'id' | 'animalNumber'>): Animal =>
  ({
    farmerId: 'farmer-1',
    farmId: 'farm-1',
    type: 'oveja',
    stage: 'reproductor',
    gender: 'hembra',
    status: 'activo',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    ...overrides,
  }) as Animal

const makeBreeding = (femaleId: string, offspring: string[]): BreedingRecord => ({
  id: `breeding-${femaleId}`,
  farmerId: 'farmer-1',
  farmId: 'farm-1',
  maleId: 'male-1',
  breedingDate: new Date('2025-01-01'),
  femaleBreedingInfo: [
    {
      femaleId,
      actualBirthDate: new Date('2025-06-01'),
      offspring,
    },
  ],
})

describe('female productivity index', () => {
  it('returns 0 for a female with no recorded offspring', () => {
    const female = makeAnimal({ id: 'f-0', animalNumber: '001', birthDate: new Date('2023-05-01') })
    const result = calculateFemaleProductivity(female, [female], [], now)

    expect(result.achievedOffspring).toBe(0)
    expect(result.score).toBe(0)
    expect(result.band).toBe('none')
  })

  it('does not count a born but not-yet-weaned offspring as achieved', () => {
    const female = makeAnimal({ id: 'f-1', animalNumber: '002', birthDate: new Date('2023-05-01') })
    const calf = makeAnimal({
      id: 'c-1',
      animalNumber: '002-A',
      gender: 'hembra',
      stage: 'cria',
      motherId: female.id,
      birthDate: new Date('2025-06-01'),
      isWeaned: false,
    })
    const result = calculateFemaleProductivity(
      female,
      [female, calf],
      [makeBreeding(female.id, [calf.id])],
      now,
    )

    expect(result.recordedBirths).toBe(1)
    expect(result.achievedOffspring).toBe(0)
    expect(result.score).toBe(0)
  })

  it('counts only direct offspring and never grandchildren', () => {
    const female = makeAnimal({
      id: 'grandmother',
      animalNumber: '170',
      birthDate: new Date('2022-01-01'),
    })
    const daughter = makeAnimal({
      id: 'daughter',
      animalNumber: '170-A',
      motherId: female.id,
      stage: 'reproductor',
      isWeaned: true,
    })
    const grandchild = makeAnimal({
      id: 'grandchild',
      animalNumber: '170-A-1',
      motherId: daughter.id,
      stage: 'juvenil',
      isWeaned: true,
    })

    const result = calculateFemaleProductivity(
      female,
      [female, daughter, grandchild],
      [makeBreeding(female.id, [daughter.id, grandchild.id])],
      now,
    )

    expect(result.achievedOffspring).toBe(1)
  })

  it('scores about 1 when a sheep meets 1.5 weaned offspring per productive year', () => {
    const female = makeAnimal({ id: 'f-2', animalNumber: '003', birthDate: new Date('2023-05-01') })
    const offspring = ['a', 'b', 'c'].map((suffix) =>
      makeAnimal({
        id: `c-${suffix}`,
        animalNumber: `003-${suffix}`,
        gender: 'hembra',
        stage: 'juvenil',
        motherId: female.id,
        birthDate: new Date('2025-06-01'),
        isWeaned: true,
      }),
    )
    const result = calculateFemaleProductivity(
      female,
      [female, ...offspring],
      [
        makeBreeding(
          female.id,
          offspring.map((animal) => animal.id),
        ),
      ],
      now,
    )

    expect(result.productiveYears).toBeCloseTo(2, 1)
    expect(result.annualizedOffspring).toBeCloseTo(1.5, 1)
    expect(result.score).toBeCloseTo(1, 1)
    expect(result.band).toBe('expected')
  })

  it('uses a saturating curve that approaches 2 without reaching it', () => {
    expect(productivityRatioToScore(0)).toBe(0)
    expect(productivityRatioToScore(1)).toBe(1)
    expect(productivityRatioToScore(2)).toBeCloseTo(1.78, 2)
    expect(productivityRatioToScore(10)).toBeLessThan(2)
  })

  it('uses an independent annual target for every species', () => {
    const types = Object.keys(ANIMAL_BREEDING_CONFIGS) as AnimalType[]
    for (const type of types) {
      expect(ANIMAL_BREEDING_CONFIGS[type].expectedWeanedOffspringPerYear).toBeGreaterThan(0)
    }
    expect(ANIMAL_BREEDING_CONFIGS.oveja.expectedWeanedOffspringPerYear).toBe(1.5)
    expect(ANIMAL_BREEDING_CONFIGS.oveja.expectedWeanedOffspringPerYear).not.toBe(
      ANIMAL_BREEDING_CONFIGS.vaca.expectedWeanedOffspringPerYear,
    )
  })

  it('ranks only active females and orders them by score', () => {
    const productive = makeAnimal({ id: 'productive', animalNumber: '010' })
    const withoutBirths = makeAnimal({ id: 'empty', animalNumber: '011' })
    const inactive = makeAnimal({ id: 'inactive', animalNumber: '012', status: 'muerto' })
    const male = makeAnimal({ id: 'male', animalNumber: '013', gender: 'macho' })
    const child = makeAnimal({
      id: 'child',
      animalNumber: '010-A',
      motherId: productive.id,
      stage: 'juvenil',
      isWeaned: true,
    })

    const ranking = calculateFemaleProductivityRanking(
      [productive, withoutBirths, inactive, male, child],
      [],
      now,
    )

    expect(ranking.map((item) => item.femaleId)).toEqual(['productive', 'empty'])
    expect(ranking[0].score).toBeGreaterThan(ranking[1].score)
  })

  it('excludes females that have not reached their species reproductive age', () => {
    const underageSheep = makeAnimal({
      id: 'underage-sheep',
      animalNumber: '020',
      birthDate: new Date('2025-06-01'),
    })
    const eligibleSheep = makeAnimal({
      id: 'eligible-sheep',
      animalNumber: '021',
      birthDate: new Date('2025-05-01'),
    })

    const ranking = calculateFemaleProductivityRanking([underageSheep, eligibleSheep], [], now)

    expect(ranking.map((item) => item.femaleId)).toEqual(['eligible-sheep'])
  })
})
