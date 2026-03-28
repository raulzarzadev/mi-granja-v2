import { toDate } from 'date-fns'
import { Animal, AnimalStage, getReproductiveStatus } from '../types/animals'
import { ANIMAL_BREEDING_CONFIGS } from './animalBreedingConfig'

/**
 * Calcula la edad de un animal en meses
 * @param animal - El animal del que se quiere calcular la edad
 * @param options - Opciones de formato
 * @returns La edad formateada
 *
 * Formatos disponibles:
 * - 'months': Devuelve solo el número de meses (ej: 25)
 * - 'short': Formato corto en meses (ej: "25m", "~36m" si es aprox.)
 * - 'long': Formato largo en meses (ej: "25 meses", "36 meses (aprox.)")
 */

// Sobrecarga: cuando format es 'months', retorna number
export function animalAge(animal: Animal, options: { format: 'months'; endDate?: Date }): number

// Sobrecarga: cuando format es 'short' o 'long' (o no se especifica), retorna string
export function animalAge(
  animal: Animal,
  options?: { format?: 'short' | 'long'; endDate?: Date },
): string

// Implementación real
export function animalAge(
  animal: Animal,
  options?: { format?: 'months' | 'short' | 'long'; endDate?: Date },
): string | number {
  const format = options?.format || 'long'

  // Si no hay fecha de nacimiento, usar la edad aproximada si existe
  if (!animal.birthDate) {
    if (animal.age) {
      if (format === 'months') return animal.age
      if (format === 'short') return `~${animal.age}m`
      return `${animal.age} mes${animal.age !== 1 ? 'es' : ''} (aprox.)`
    }
    return format === 'months' ? 0 : 'No registrado'
  }

  const birthDate = toDate(animal.birthDate)
  const now = options?.endDate || new Date()

  // Calcular años, meses y días exactos
  let years = now.getFullYear() - birthDate.getFullYear()
  let months = now.getMonth() - birthDate.getMonth()
  const days = now.getDate() - birthDate.getDate()

  // Ajustar si los días son negativos
  if (days < 0) {
    months--
  }

  // Ajustar si los meses son negativos
  if (months < 0) {
    years--
    months += 12
  }

  // Calcular total de meses
  const totalMonths = years * 12 + months

  switch (format) {
    case 'months':
      return totalMonths
    case 'short':
      return `${totalMonths}m`
    default:
      return `${totalMonths} mes${totalMonths !== 1 ? 'es' : ''}`
  }
}

/** Stages asignados manualmente por el usuario (no se sobreescriben) */
const MANUAL_STAGES = new Set<AnimalStage>(['engorda', 'pie_cria', 'descarte'])

/**
 * Calcula el stage de un animal basándose en sus parámetros:
 *  - cria: no destetado o edad < weaningDays de su especie
 *  - juvenil: destetado, edad >= weaningDays pero < minBreedingAge
 *  - reproductor: edad >= minBreedingAge
 *  - engorda / pie_cria / descarte: asignación manual, se respeta
 */
export function computeAnimalStage(animal: Animal): AnimalStage {
  // Stages manuales: el usuario los asignó explícitamente
  if (MANUAL_STAGES.has(animal.stage)) return animal.stage

  const ageMonths = animalAge(animal, { format: 'months' })
  const config = ANIMAL_BREEDING_CONFIGS[animal.type]
  const weaningMonths = Math.ceil((config?.weaningDays ?? 60) / 30)
  const minBreedingAge = config?.minBreedingAge ?? 12

  // Cría: no destetado o edad menor al tiempo de destete
  if (!animal.isWeaned || ageMonths < weaningMonths) return 'cria'

  // Juvenil: destetado pero no alcanza edad reproductiva
  if (ageMonths < minBreedingAge) return 'juvenil'

  // Alcanzó edad reproductiva → reproductor
  return 'reproductor'
}

/**
 * Determina si un animal es juvenil según computeAnimalStage.
 */
export function isJuvenile(animal: Animal): boolean {
  return computeAnimalStage(animal) === 'juvenil'
}

/**
 * Convierte gramos a kilogramos para mostrar en la UI
 * @param grams - Peso en gramos (number | string | null | undefined)
 * @returns String formateado en kg (ej: "4.5") o null si no hay valor
 */
export function formatWeight(grams: number | string | null | undefined): string | null {
  if (grams == null || grams === '') return null
  const g = typeof grams === 'number' ? grams : Number.parseFloat(String(grams))
  if (Number.isNaN(g) || g === 0) return null
  const kg = g / 1000
  return kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(1)
}
