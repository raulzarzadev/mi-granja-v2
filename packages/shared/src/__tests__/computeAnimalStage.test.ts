jest.mock('date-fns', () => ({
  toDate: (d: any) => (d instanceof Date ? d : new Date(d)),
}))

import { computeAnimalStage, isJuvenile } from '../lib/animal-utils'
import { Animal } from '../types/animals'

/** Helper: crea un animal con defaults sensatos */
const makeAnimal = (overrides: Partial<Animal> = {}): Animal => ({
  id: 'a1',
  farmerId: 'f1',
  animalNumber: '001',
  type: 'oveja',
  gender: 'hembra',
  stage: 'reproductor',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

/** Helper: fecha N meses atrás */
const monthsAgo = (n: number): Date => {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  d.setDate(1) // evitar desfases por días
  return d
}

// ─── Stages manuales ───────────────────────────────────────

describe('computeAnimalStage — stages manuales', () => {
  it('respeta engorda sin importar edad', () => {
    const animal = makeAnimal({ stage: 'engorda', birthDate: monthsAgo(24), isWeaned: true })
    expect(computeAnimalStage(animal)).toBe('engorda')
  })

  it('respeta descarte sin importar edad', () => {
    const animal = makeAnimal({ stage: 'descarte', birthDate: monthsAgo(1) })
    expect(computeAnimalStage(animal)).toBe('descarte')
  })
})

// ─── Cría ──────────────────────────────────────────────────

describe('computeAnimalStage — cría', () => {
  it('no destetado → cría (oveja)', () => {
    const animal = makeAnimal({ isWeaned: false, birthDate: monthsAgo(1) })
    expect(computeAnimalStage(animal)).toBe('cria')
  })

  it('no destetado pero mayor a weaningDays → juvenil (edad supera destete)', () => {
    const animal = makeAnimal({ isWeaned: false, birthDate: monthsAgo(6) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  it('destetado con edad < weaningDays → juvenil (ya destetado)', () => {
    const animal = makeAnimal({ isWeaned: true, birthDate: monthsAgo(1) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  it('destetado con edad < weaningDays → juvenil (vaca destetada temprano)', () => {
    const animal = makeAnimal({ type: 'vaca', isWeaned: true, birthDate: monthsAgo(3) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  it('destetado con edad < weaningDays → juvenil (cerdo destetado al nacer)', () => {
    const animal = makeAnimal({ type: 'cerdo', isWeaned: true, birthDate: new Date() })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  it('recién nacido sin birthDate ni age → cría', () => {
    const animal = makeAnimal({ isWeaned: false, birthDate: undefined, age: undefined })
    expect(computeAnimalStage(animal)).toBe('cria')
  })
})

// ─── Juvenil ───────────────────────────────────────────────

describe('computeAnimalStage — juvenil', () => {
  // Oveja: weaningDays=60 (2m), minBreedingAge=8
  it('oveja destetada de 3 meses → juvenil', () => {
    const animal = makeAnimal({ isWeaned: true, birthDate: monthsAgo(3) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  it('oveja destetada de 7 meses → juvenil (< minBreedingAge 8)', () => {
    const animal = makeAnimal({ isWeaned: true, birthDate: monthsAgo(7) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  // Vaca: weaningDays=120 (4m), minBreedingAge=15
  it('vaca destetada de 5 meses → juvenil', () => {
    const animal = makeAnimal({ type: 'vaca', isWeaned: true, birthDate: monthsAgo(5) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  it('vaca destetada de 14 meses → juvenil (< minBreedingAge 15)', () => {
    const animal = makeAnimal({ type: 'vaca', isWeaned: true, birthDate: monthsAgo(14) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  // Cerdo: weaningDays=28 (1m), minBreedingAge=6
  it('cerdo destetado de 3 meses → juvenil', () => {
    const animal = makeAnimal({ type: 'cerdo', isWeaned: true, birthDate: monthsAgo(3) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  // Equino: weaningDays=180 (6m), minBreedingAge=36
  it('equino destetado de 12 meses → juvenil', () => {
    const animal = makeAnimal({ type: 'equino', isWeaned: true, birthDate: monthsAgo(12) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  it('equino destetado de 35 meses → juvenil (< minBreedingAge 36)', () => {
    const animal = makeAnimal({ type: 'equino', isWeaned: true, birthDate: monthsAgo(35) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })
})

// ─── Reproductor ───────────────────────────────────────────

describe('computeAnimalStage — reproductor', () => {
  it('oveja destetada de 8 meses → reproductor (= minBreedingAge)', () => {
    const animal = makeAnimal({ isWeaned: true, birthDate: monthsAgo(8) })
    expect(computeAnimalStage(animal)).toBe('reproductor')
  })

  it('oveja destetada de 24 meses → reproductor', () => {
    const animal = makeAnimal({ isWeaned: true, birthDate: monthsAgo(24) })
    expect(computeAnimalStage(animal)).toBe('reproductor')
  })

  it('vaca destetada de 15 meses → reproductor (= minBreedingAge)', () => {
    const animal = makeAnimal({ type: 'vaca', isWeaned: true, birthDate: monthsAgo(15) })
    expect(computeAnimalStage(animal)).toBe('reproductor')
  })

  it('cerdo destetado de 6 meses → reproductor (= minBreedingAge)', () => {
    const animal = makeAnimal({ type: 'cerdo', isWeaned: true, birthDate: monthsAgo(6) })
    expect(computeAnimalStage(animal)).toBe('reproductor')
  })

  it('equino destetado de 36 meses → reproductor (= minBreedingAge)', () => {
    const animal = makeAnimal({ type: 'equino', isWeaned: true, birthDate: monthsAgo(36) })
    expect(computeAnimalStage(animal)).toBe('reproductor')
  })

  it('macho adulto → reproductor', () => {
    const animal = makeAnimal({ gender: 'macho', isWeaned: true, birthDate: monthsAgo(12) })
    expect(computeAnimalStage(animal)).toBe('reproductor')
  })
})

// ─── Transiciones de frontera ──────────────────────────────

describe('computeAnimalStage — transiciones', () => {
  // Oveja: weaningMonths = ceil(60/30) = 2, minBreedingAge = 8
  it('oveja destetada exactamente a 2 meses (= weaningMonths) → juvenil, no cría', () => {
    const animal = makeAnimal({ isWeaned: true, birthDate: monthsAgo(2) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  it('stage "reproductor" en Firestore pero edad 3m destetada → se recalcula a juvenil', () => {
    const animal = makeAnimal({ stage: 'reproductor', isWeaned: true, birthDate: monthsAgo(3) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  it('stage "cria" en Firestore pero edad 10m destetada → se recalcula a reproductor', () => {
    const animal = makeAnimal({ stage: 'cria', isWeaned: true, birthDate: monthsAgo(10) })
    expect(computeAnimalStage(animal)).toBe('reproductor')
  })

  it('stage "juvenil" en Firestore, no destetado pero edad > weaningDays → juvenil', () => {
    const animal = makeAnimal({ stage: 'juvenil', isWeaned: false, birthDate: monthsAgo(3) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })
})

// ─── Edad aproximada (sin birthDate) ───────────────────────

describe('computeAnimalStage — edad aproximada', () => {
  it('sin birthDate, age=3, oveja destetada → juvenil', () => {
    const animal = makeAnimal({ birthDate: undefined, age: 3, isWeaned: true })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  it('sin birthDate, age=10, oveja destetada → reproductor', () => {
    const animal = makeAnimal({ birthDate: undefined, age: 10, isWeaned: true })
    expect(computeAnimalStage(animal)).toBe('reproductor')
  })

  it('sin birthDate, age=1, oveja destetada → juvenil (ya destetada)', () => {
    const animal = makeAnimal({ birthDate: undefined, age: 1, isWeaned: true })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })
})

// ─── isJuvenile helper ─────────────────────────────────────

describe('isJuvenile', () => {
  it('true para juvenil', () => {
    const animal = makeAnimal({ isWeaned: true, birthDate: monthsAgo(5) })
    expect(isJuvenile(animal)).toBe(true)
  })

  it('false para cría', () => {
    const animal = makeAnimal({ isWeaned: false, birthDate: monthsAgo(1) })
    expect(isJuvenile(animal)).toBe(false)
  })

  it('false para reproductor', () => {
    const animal = makeAnimal({ isWeaned: true, birthDate: monthsAgo(12) })
    expect(isJuvenile(animal)).toBe(false)
  })

  it('false para engorda (manual)', () => {
    const animal = makeAnimal({ stage: 'engorda', isWeaned: true, birthDate: monthsAgo(5) })
    expect(isJuvenile(animal)).toBe(false)
  })
})

// ─── Todas las especies ────────────────────────────────────

describe('computeAnimalStage — todas las especies', () => {
  const species: Array<{ type: Animal['type']; weanMonths: number; minAge: number }> = [
    { type: 'oveja', weanMonths: 2, minAge: 8 },
    { type: 'cabra', weanMonths: 2, minAge: 7 },
    { type: 'vaca', weanMonths: 4, minAge: 15 },
    { type: 'cerdo', weanMonths: 1, minAge: 6 },
    { type: 'gallina', weanMonths: 0, minAge: 5 },
    { type: 'perro', weanMonths: 2, minAge: 12 },
    { type: 'gato', weanMonths: 2, minAge: 6 },
    { type: 'equino', weanMonths: 6, minAge: 36 },
  ]

  for (const sp of species) {
    it(`${sp.type}: destetado a minBreedingAge (${sp.minAge}m) → reproductor`, () => {
      const animal = makeAnimal({ type: sp.type, isWeaned: true, birthDate: monthsAgo(sp.minAge) })
      expect(computeAnimalStage(animal)).toBe('reproductor')
    })

    if (sp.minAge > 1) {
      it(`${sp.type}: destetado a minBreedingAge-1 (${sp.minAge - 1}m) → juvenil`, () => {
        const animal = makeAnimal({
          type: sp.type,
          isWeaned: true,
          birthDate: monthsAgo(sp.minAge - 1),
        })
        expect(computeAnimalStage(animal)).toBe('juvenil')
      })
    }
  }
})
