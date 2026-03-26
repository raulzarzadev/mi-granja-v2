import { Animal, AnimalType } from '../types/animals'
import { GeneticScore, RealScore } from '../types/genetics'

// Peso esperado por especie y edad (en gramos). Aproximaciones para ganado típico mexicano.
const expectedWeightByAge: Partial<Record<AnimalType, (ageMonths: number) => number>> = {
  oveja: (m) => Math.min(m * 4000, 60000), // ~4kg/mes, max 60kg
  vaca: (m) => Math.min(m * 25000, 600000), // ~25kg/mes, max 600kg
  cabra: (m) => Math.min(m * 3500, 50000), // ~3.5kg/mes, max 50kg
  cerdo: (m) => Math.min(m * 12000, 120000), // ~12kg/mes, max 120kg
  equino: (m) => Math.min(m * 20000, 500000), // ~20kg/mes, max 500kg
}

function getAnimalAgeMonths(animal: Animal): number | null {
  if (animal.age != null) return animal.age
  if (animal.birthDate) {
    const now = new Date()
    const birth = new Date(animal.birthDate)
    return Math.max(0, (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  }
  return null
}

/**
 * Calcula el score genético de cada semental basado en sus crías.
 */
export function computeGeneticScores(animals: Animal[]): GeneticScore[] {
  // Índice: fatherId → crías
  const sireMap = new Map<string, Animal[]>()
  for (const a of animals) {
    if (!a.fatherId) continue
    const list = sireMap.get(a.fatherId) || []
    list.push(a)
    sireMap.set(a.fatherId, list)
  }

  const scores: GeneticScore[] = []
  for (const [sireId, offspring] of sireMap) {
    const weights = offspring
      .map((a) => (typeof a.weight === 'number' ? a.weight : Number(a.weight) || 0))
      .filter((w) => w > 0)

    const avgWeight = weights.length > 0 ? weights.reduce((s, w) => s + w, 0) / weights.length : 0

    const alive = offspring.filter((a) => (a.status ?? 'activo') === 'activo').length
    const survivalRate = offspring.length > 0 ? alive / offspring.length : 0

    const dams = new Set(offspring.map((a) => a.motherId).filter(Boolean))

    scores.push({
      sireId,
      offspringCount: offspring.length,
      avgOffspringWeight: avgWeight,
      survivalRate,
      damsCount: dams.size,
    })
  }

  return scores.sort((a, b) => b.offspringCount - a.offspringCount)
}

/**
 * Calcula el rendimiento real de cada animal (peso actual vs esperado por edad/especie).
 */
export function computeRealScores(animals: Animal[]): RealScore[] {
  const scores: RealScore[] = []

  for (const a of animals) {
    if ((a.status ?? 'activo') !== 'activo') continue
    const weight = typeof a.weight === 'number' ? a.weight : Number(a.weight) || 0
    if (weight <= 0) continue

    const ageMonths = getAnimalAgeMonths(a)
    if (ageMonths == null || ageMonths <= 0) continue

    const fn = expectedWeightByAge[a.type]
    if (!fn) continue

    const expected = fn(ageMonths)
    if (expected <= 0) continue

    scores.push({
      animalId: a.id,
      currentWeight: weight,
      expectedWeight: expected,
      ratio: weight / expected,
      ageMonths,
    })
  }

  return scores
}

/**
 * Retorna un color CSS según el ratio de rendimiento.
 * < 0.7 = rojo, 0.7-0.9 = amarillo, >= 0.9 = verde
 */
export function scoreColor(ratio: number): string {
  if (ratio < 0.7) return 'bg-red-500'
  if (ratio < 0.9) return 'bg-yellow-500'
  return 'bg-green-500'
}

export function scoreLabel(ratio: number): string {
  if (ratio < 0.7) return 'Bajo'
  if (ratio < 0.9) return 'Regular'
  return 'Bueno'
}

export function scoreTextColor(ratio: number): string {
  if (ratio < 0.7) return 'text-red-600'
  if (ratio < 0.9) return 'text-yellow-600'
  return 'text-green-600'
}
