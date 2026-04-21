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
  d.setDate(1)
  d.setMonth(d.getMonth() - n)
  return d
}

// ─── Stages manuales ───────────────────────────────────────

describe('computeAnimalStage — stages manuales', () => {
  it('respeta engorda sin importar edad/destete', () => {
    const animal = makeAnimal({ stage: 'engorda', birthDate: monthsAgo(24), isWeaned: true })
    expect(computeAnimalStage(animal)).toBe('engorda')
  })

  it('respeta descarte sin importar edad/destete', () => {
    const animal = makeAnimal({ stage: 'descarte', birthDate: monthsAgo(1) })
    expect(computeAnimalStage(animal)).toBe('descarte')
  })
})

// ─── Cría (regla: permanece cría hasta que isWeaned=true o weanedAt) ───

describe('computeAnimalStage — cría', () => {
  it('no destetado → cría (oveja joven)', () => {
    const animal = makeAnimal({ isWeaned: false, birthDate: monthsAgo(1) })
    expect(computeAnimalStage(animal)).toBe('cria')
  })

  it('no destetado aunque edad supere weaningDays → cría (NO auto-avance por edad)', () => {
    const animal = makeAnimal({ isWeaned: false, birthDate: monthsAgo(6) })
    expect(computeAnimalStage(animal)).toBe('cria')
  })

  it('sin isWeaned ni weanedAt → cría (regardless of edad)', () => {
    const animal = makeAnimal({ birthDate: monthsAgo(10) })
    expect(computeAnimalStage(animal)).toBe('cria')
  })

  it('recién nacido sin birthDate ni age → cría', () => {
    const animal = makeAnimal({ isWeaned: false, birthDate: undefined, age: undefined })
    expect(computeAnimalStage(animal)).toBe('cria')
  })

  it('weanedAt set sin isWeaned explícito → ya no es cría', () => {
    const animal = makeAnimal({ weanedAt: monthsAgo(2), birthDate: monthsAgo(3) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })
})

// ─── Juvenil (destetado + age < minBreedingAge) ───────────

describe('computeAnimalStage — juvenil', () => {
  // Oveja: minBreedingAge = 8
  it('oveja destetada de 3 meses → juvenil', () => {
    const animal = makeAnimal({ isWeaned: true, birthDate: monthsAgo(3) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  it('oveja destetada de 7 meses → juvenil (< 8)', () => {
    const animal = makeAnimal({ isWeaned: true, birthDate: monthsAgo(7) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  it('oveja destetada temprano edad 1m → juvenil (destete manda sobre edad)', () => {
    const animal = makeAnimal({ isWeaned: true, birthDate: monthsAgo(1) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  // Vaca: minBreedingAge = 15
  it('vaca destetada de 5 meses → juvenil', () => {
    const animal = makeAnimal({ type: 'vaca', isWeaned: true, birthDate: monthsAgo(5) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  it('vaca destetada de 14 meses → juvenil', () => {
    const animal = makeAnimal({ type: 'vaca', isWeaned: true, birthDate: monthsAgo(14) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  // Cerdo: minBreedingAge = 6
  it('cerdo destetado de 3 meses → juvenil', () => {
    const animal = makeAnimal({ type: 'cerdo', isWeaned: true, birthDate: monthsAgo(3) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  // Equino: minBreedingAge = 36
  it('equino destetado de 12 meses → juvenil', () => {
    const animal = makeAnimal({ type: 'equino', isWeaned: true, birthDate: monthsAgo(12) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })
})

// ─── Reproductor ───────────────────────────────────────────

describe('computeAnimalStage — reproductor', () => {
  it('oveja destetada de 8 meses → reproductor', () => {
    const animal = makeAnimal({ isWeaned: true, birthDate: monthsAgo(8) })
    expect(computeAnimalStage(animal)).toBe('reproductor')
  })

  it('oveja destetada de 24 meses → reproductor', () => {
    const animal = makeAnimal({ isWeaned: true, birthDate: monthsAgo(24) })
    expect(computeAnimalStage(animal)).toBe('reproductor')
  })

  it('vaca destetada de 15 meses → reproductor', () => {
    const animal = makeAnimal({ type: 'vaca', isWeaned: true, birthDate: monthsAgo(15) })
    expect(computeAnimalStage(animal)).toBe('reproductor')
  })

  it('cerdo destetado de 6 meses → reproductor', () => {
    const animal = makeAnimal({ type: 'cerdo', isWeaned: true, birthDate: monthsAgo(6) })
    expect(computeAnimalStage(animal)).toBe('reproductor')
  })

  it('equino destetado de 36 meses → reproductor', () => {
    const animal = makeAnimal({ type: 'equino', isWeaned: true, birthDate: monthsAgo(36) })
    expect(computeAnimalStage(animal)).toBe('reproductor')
  })

  it('macho destetado adulto → reproductor', () => {
    const animal = makeAnimal({ gender: 'macho', isWeaned: true, birthDate: monthsAgo(12) })
    expect(computeAnimalStage(animal)).toBe('reproductor')
  })
})

// ─── Reglas frontera (destete es el disparador, no la edad) ───

describe('computeAnimalStage — regla destete vs edad', () => {
  it('edad adulta sin destete → sigue cría (decisión del producto)', () => {
    const animal = makeAnimal({ isWeaned: false, birthDate: monthsAgo(24) })
    expect(computeAnimalStage(animal)).toBe('cria')
  })

  it('destete marcado explícito adelanta a juvenil aunque edad sea baja', () => {
    const animal = makeAnimal({ isWeaned: true, birthDate: monthsAgo(1) })
    expect(computeAnimalStage(animal)).toBe('juvenil')
  })

  it('stage "reproductor" en Firestore pero !isWeaned → se recalcula a cria', () => {
    const animal = makeAnimal({ stage: 'reproductor', isWeaned: false, birthDate: monthsAgo(3) })
    expect(computeAnimalStage(animal)).toBe('cria')
  })

  it('stage "cria" en Firestore pero isWeaned=true y edad adulta → reproductor', () => {
    const animal = makeAnimal({ stage: 'cria', isWeaned: true, birthDate: monthsAgo(10) })
    expect(computeAnimalStage(animal)).toBe('reproductor')
  })

  it('stage "juvenil" en Firestore, !isWeaned → cria (la función ignora stage salvo manual)', () => {
    const animal = makeAnimal({ stage: 'juvenil', isWeaned: false, birthDate: monthsAgo(3) })
    expect(computeAnimalStage(animal)).toBe('cria')
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

  it('sin birthDate, age=1, oveja destetada → juvenil (destete gana)', () => {
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

// ─── Todas las especies: destete al minBreedingAge → reproductor ───

describe('computeAnimalStage — todas las especies', () => {
  const species: Array<{ type: Animal['type']; minAge: number }> = [
    { type: 'oveja', minAge: 8 },
    { type: 'cabra', minAge: 7 },
    { type: 'vaca', minAge: 15 },
    { type: 'cerdo', minAge: 6 },
    { type: 'gallina', minAge: 5 },
    { type: 'perro', minAge: 12 },
    { type: 'gato', minAge: 6 },
    { type: 'equino', minAge: 36 },
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

    it(`${sp.type}: NO destetado a ${sp.minAge}m → cría (edad no avanza)`, () => {
      const animal = makeAnimal({ type: sp.type, isWeaned: false, birthDate: monthsAgo(sp.minAge) })
      expect(computeAnimalStage(animal)).toBe('cria')
    })
  }
})
