import { toDate } from 'date-fns'
import { Animal, AnimalStage, AnimalStageKey, NextStep } from '../types/animals'
import { BreedingRecord } from '../types/breedings'
import {
  ANIMAL_BREEDING_CONFIGS,
  getAnimalBreedingConfig,
  getWeaningDays,
} from './animalBreedingConfig'

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

  // Calcular días totales para animales muy jóvenes
  const totalDays = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24))

  switch (format) {
    case 'months':
      return totalMonths
    case 'short':
      if (totalMonths === 0) return `${Math.max(0, totalDays)}d`
      return `${totalMonths}m`
    default:
      if (totalMonths === 0) return `${Math.max(0, totalDays)} día${totalDays !== 1 ? 's' : ''}`
      return `${totalMonths} mes${totalMonths !== 1 ? 'es' : ''}`
  }
}

/** Stages asignados manualmente por el usuario (no se sobreescriben) */
const MANUAL_STAGES = new Set<AnimalStage>(['engorda', 'descarte'])

/**
 * Calcula el stage de un animal basándose en sus parámetros:
 *  - cria: no destetado Y edad < weaningDays de su especie
 *  - juvenil: destetado, edad >= weaningDays pero < minBreedingAge
 *  - reproductor: edad >= minBreedingAge
 *  - engorda / descarte: asignación manual, se respeta
 */
export function computeAnimalStage(animal: Animal): AnimalStage {
  // Stages manuales: el usuario los asignó explícitamente
  if (MANUAL_STAGES.has(animal.stage)) return animal.stage

  const ageMonths = animalAge(animal, { format: 'months' })
  const config = ANIMAL_BREEDING_CONFIGS[animal.type]
  const weaningDays = config?.weaningDays ?? 60
  const minBreedingAge = config?.minBreedingAge ?? 12

  // Calcular edad en días para comparación precisa con weaningDays
  let ageDays = 0
  if (animal.birthDate) {
    const birth = toDate(animal.birthDate)
    ageDays = Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24))
  } else if (animal.age) {
    // animal.age está en meses aproximados
    ageDays = animal.age * 30
  } else {
    // Sin fecha ni edad → cría (recién nacido sin datos)
    return 'cria'
  }

  // Cría: edad menor al tiempo de destete de su especie.
  // La edad manda sobre isWeaned (evita falsos destetes en bebés).
  if (ageDays < weaningDays) return 'cria'

  // Juvenil: aún no alcanza edad reproductiva
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
 * Calcula la etapa efectiva del animal incluyendo estados derivados de breeding.
 * Si el animal participa en un empadre activo:
 *   - Macho activo → 'empadre'
 *   - Hembra sin gestación confirmada y sin parto → 'empadre'
 *   - Hembra con gestación confirmada y sin parto → 'embarazos'
 *   - Hembra con parto reciente (dentro del periodo de lactancia) → 'crias_lactantes'
 * Si no, regresa el resultado de computeAnimalStage (AnimalStage base).
 */
export function computeAnimalEffectiveStage(
  animal: Animal,
  breedings: BreedingRecord[],
  now: Date = new Date(),
): AnimalStageKey {
  const activeBreedings = (breedings || []).filter((b) => b.status !== 'finished')

  // Macho activo en algún empadre
  if (animal.gender === 'macho') {
    const inEmpadre = activeBreedings.some((b) => b.maleId === animal.id)
    if (inEmpadre) return 'empadre'
    return computeAnimalStage(animal)
  }

  // Hembra: revisar femaleBreedingInfo de empadres activos
  let bestState: AnimalStageKey | null = null
  const weaningDays = getWeaningDays(animal)

  for (const breeding of activeBreedings) {
    const info = breeding.femaleBreedingInfo?.find((f) => f.femaleId === animal.id)
    if (!info) continue

    if (info.actualBirthDate) {
      const birthDate = toDate(info.actualBirthDate)
      const daysSinceBirth = Math.floor(
        (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24),
      )
      if (daysSinceBirth <= weaningDays) {
        bestState = 'crias_lactantes'
      }
      // si ya pasó destete, este empadre no aporta estado activo
    } else if (info.pregnancyConfirmedDate) {
      // embarazos > empadre en prioridad
      if (bestState !== 'crias_lactantes') bestState = 'embarazos'
    } else {
      if (bestState === null) bestState = 'empadre'
    }
  }

  if (bestState) return bestState

  // Fallback a campos directos del animal (cuando el breeding ya fue cerrado pero
  // el animal todavía conserva el estado reproductivo).
  if (animal.gender === 'hembra') {
    if (animal.birthedAt) {
      const birthDate = toDate(animal.birthedAt)
      const daysSinceBirth = Math.floor(
        (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24),
      )
      if (daysSinceBirth >= 0 && daysSinceBirth <= weaningDays) return 'crias_lactantes'
    }
    if (animal.pregnantAt) return 'embarazos'
  }

  return computeAnimalStage(animal)
}

/**
 * Resuelve un animal por id o animalNumber. motherId/fatherId pueden guardarse
 * como id de Firestore o como animalNumber (legado). Usar siempre este helper
 * en lugar de comparar directamente por id.
 */
export function findAnimalByRef(animals: Animal[], ref?: string | null): Animal | undefined {
  if (!ref) return undefined
  return animals.find((a) => a.id === ref || a.animalNumber === ref)
}

/**
 * Meses faltantes hasta alcanzar minBreedingAge. Retorna null si ya lo alcanzó
 * o si no se puede calcular la edad.
 */
export function monthsUntilBreedingAge(animal: Animal, now?: Date): number | null {
  const config = getAnimalBreedingConfig(animal.type)
  if (!config) return null
  const ageMonths = animalAge(animal, { format: 'months', endDate: now })
  if (ageMonths <= 0 && !animal.birthDate) return null
  const remaining = config.minBreedingAge - ageMonths
  if (remaining <= 0) return null
  return remaining
}

/**
 * Formatea meses restantes como texto humano: "en X meses", "en Y días" si <1 mes.
 */
export function formatTimeRemaining(months: number): string {
  if (months <= 0) return 'ya disponible'
  if (months < 1) {
    const days = Math.max(1, Math.round(months * 30))
    return `en ${days} día${days === 1 ? '' : 's'}`
  }
  const rounded = Math.round(months)
  return `en ${rounded} mes${rounded === 1 ? '' : 'es'}`
}

/**
 * Obtiene el peso más reciente del animal (en kg) considerando ambas fuentes:
 * `records` (type='weight') y `weightRecords` (gramos). Devuelve null si no hay.
 */
export function getLastWeight(animal: Animal): { kg: number; date: Date } | null {
  const weightFromRecords = [...(animal.records || [])]
    .filter((r) => r.type === 'weight')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

  const weightFromEntries = [...(animal.weightRecords || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0]

  if (weightFromRecords && weightFromEntries) {
    const rDate = new Date(weightFromRecords.date).getTime()
    const eDate = new Date(weightFromEntries.date).getTime()
    if (rDate >= eDate) {
      const match = weightFromRecords.title.match(/^([\d.]+)/)
      if (match) return { kg: Number.parseFloat(match[1]), date: new Date(weightFromRecords.date) }
    } else {
      return { kg: weightFromEntries.weight / 1000, date: new Date(weightFromEntries.date) }
    }
  } else if (weightFromRecords) {
    const match = weightFromRecords.title.match(/^([\d.]+)/)
    if (match) return { kg: Number.parseFloat(match[1]), date: new Date(weightFromRecords.date) }
  } else if (weightFromEntries) {
    return { kg: weightFromEntries.weight / 1000, date: new Date(weightFromEntries.date) }
  }

  return null
}

/**
 * Calcula el progreso de peso del animal hacia el peso objetivo de su especie.
 * Retorna null si no hay peso registrado o si la especie no tiene targetWeightKg.
 */
export function weightTargetProgress(
  animal: Animal,
): { current: number; target: number; percent: number } | null {
  const target = getAnimalBreedingConfig(animal.type)?.targetWeightKg
  if (!target) return null
  const last = getLastWeight(animal)
  if (!last) return null
  const percent = (last.kg / target) * 100
  return { current: last.kg, target, percent }
}

/**
 * Estadísticas de breeding para una hembra: número de gestaciones confirmadas,
 * partos registrados y la fecha del último parto.
 */
export function femaleBreedingStats(
  animal: Animal,
  breedings: BreedingRecord[],
): { pregnancies: number; births: number; offspring: number; lastBirthDate: Date | null } {
  let pregnancies = 0
  let births = 0
  let offspring = 0
  let lastBirthDate: Date | null = null

  for (const breeding of breedings || []) {
    const info = breeding.femaleBreedingInfo?.find((f) => f.femaleId === animal.id)
    if (!info) continue
    if (info.pregnancyConfirmedDate) pregnancies++
    if (info.actualBirthDate) {
      births++
      offspring += info.offspring?.length ?? 0
      const d = toDate(info.actualBirthDate)
      if (!lastBirthDate || d.getTime() > lastBirthDate.getTime()) {
        lastBirthDate = d
      }
    }
  }

  return { pregnancies, births, offspring, lastBirthDate }
}

/** Días entre dos fechas, redondeados hacia abajo. */
function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

function plural(n: number, sing: string, plur: string): string {
  return n === 1 ? `${n} ${sing}` : `${n} ${plur}`
}

/** Detail para "monitorea su peso": tiempo desde el último registro de peso. */
function lastWeightDetail(animal: Animal, now?: Date): string | undefined {
  const last = getLastWeight(animal)
  if (!last) return 'sin registros de peso'
  const ref = now ?? new Date()
  const days = daysBetween(last.date, ref)
  if (days <= 0) return `último registro: ${last.kg.toFixed(1)} kg hoy`
  if (days < 30)
    return `último registro: ${last.kg.toFixed(1)} kg hace ${plural(days, 'día', 'días')}`
  const months = Math.round(days / 30)
  return `último registro: ${last.kg.toFixed(1)} kg hace ${plural(months, 'mes', 'meses')}`
}

/** Detail para cría: días al destete según birthDate + weaningDays. */
function daysUntilWeaningDetail(animal: Animal, now?: Date): string | undefined {
  if (!animal.birthDate) return undefined
  const ref = now ?? new Date()
  const weaningDays = getWeaningDays(animal)
  const since = daysBetween(toDate(animal.birthDate), ref)
  const remaining = weaningDays - since
  if (remaining <= 0) return 'destete recomendado'
  return `destete en ${plural(remaining, 'día', 'días')}`
}

/** Detail para empadre: días en empadre del animal en su empadre activo. */
function empadreDetail(
  animal: Animal,
  breedings: BreedingRecord[],
  now?: Date,
): string | undefined {
  const ref = now ?? new Date()
  const active = (breedings || []).filter((b) => b.status !== 'finished')

  if (animal.gender === 'macho') {
    const breeding = active.find((b) => b.maleId === animal.id)
    if (!breeding) return undefined
    const females = breeding.femaleBreedingInfo?.length ?? 0
    const sinceStart = breeding.breedingDate
      ? daysBetween(toDate(breeding.breedingDate), ref)
      : null
    const parts: string[] = []
    parts.push(`${plural(females, 'hembra', 'hembras')}`)
    if (sinceStart != null && sinceStart >= 0) {
      parts.push(`hace ${plural(sinceStart, 'día', 'días')}`)
    }
    return parts.join(' · ')
  }

  // Hembra: empadre con info pendiente (sin gestación ni parto)
  for (const b of active) {
    const info = b.femaleBreedingInfo?.find((f) => f.femaleId === animal.id)
    if (!info) continue
    if (info.pregnancyConfirmedDate || info.actualBirthDate) continue
    const sinceStart = b.breedingDate ? daysBetween(toDate(b.breedingDate), ref) : null
    if (sinceStart != null && sinceStart >= 0) {
      return `en empadre hace ${plural(sinceStart, 'día', 'días')}`
    }
    return undefined
  }
  return undefined
}

/** Detail para embarazos: días al parto esperado. */
function expectedBirthDetail(
  animal: Animal,
  breedings: BreedingRecord[],
  now?: Date,
): string | undefined {
  const ref = now ?? new Date()
  const active = (breedings || []).filter((b) => b.status !== 'finished')
  const config = getAnimalBreedingConfig(animal.type)

  for (const b of active) {
    const info = b.femaleBreedingInfo?.find((f) => f.femaleId === animal.id)
    if (!info || info.actualBirthDate || !info.pregnancyConfirmedDate) continue

    let expected: Date | null = null
    if (info.expectedBirthDate) {
      expected = toDate(info.expectedBirthDate)
    } else if (b.breedingDate && config) {
      const e = toDate(b.breedingDate)
      e.setDate(e.getDate() + config.gestationDays)
      expected = e
    }
    if (!expected) return undefined
    const days = daysBetween(ref, expected)
    if (days < 0) return `parto vencido hace ${plural(-days, 'día', 'días')}`
    if (days === 0) return 'parto esperado hoy'
    return `parto en ${plural(days, 'día', 'días')}`
  }
  return undefined
}

/** Detail para crías lactantes: días al destete desde actualBirthDate. */
function lactanteWeaningDetail(
  animal: Animal,
  breedings: BreedingRecord[],
  now?: Date,
): string | undefined {
  const ref = now ?? new Date()
  const active = (breedings || []).filter((b) => b.status !== 'finished')
  const weaningDays = getWeaningDays(animal)

  for (const b of active) {
    const info = b.femaleBreedingInfo?.find((f) => f.femaleId === animal.id)
    if (!info?.actualBirthDate) continue
    const since = daysBetween(toDate(info.actualBirthDate), ref)
    const remaining = weaningDays - since
    if (remaining <= 0) return 'destete recomendado'
    return `destete en ${plural(remaining, 'día', 'días')}`
  }
  return undefined
}

export interface NextStepsContext {
  animal: Animal
  breedings: BreedingRecord[]
  /** Lista completa de animales de la granja, para derivar offspring vía motherId/fatherId. */
  animals?: Animal[]
  now?: Date
}

/**
 * Estadísticas de paternidad/maternidad derivadas del padrón de animales:
 * cuenta crías directas (motherId/fatherId), partos (fechas únicas de nacimiento)
 * y la fecha del nacimiento más reciente.
 */
export function parentingStats(
  animal: Animal,
  animals: Animal[],
): { births: number; offspring: number; lastBirthDate: Date | null } {
  const isFemale = animal.gender === 'hembra'
  const offspringList = (animals || []).filter((a) => {
    const id = animal.id
    const num = animal.animalNumber
    if (isFemale) return a.motherId === id || a.motherId === num
    return a.fatherId === id || a.fatherId === num
  })

  const birthDateKeys = new Set<string>()
  let lastBirthDate: Date | null = null

  for (const child of offspringList) {
    if (!child.birthDate) continue
    const d = toDate(child.birthDate)
    birthDateKeys.add(d.toISOString().slice(0, 10))
    if (!lastBirthDate || d.getTime() > lastBirthDate.getTime()) lastBirthDate = d
  }

  return {
    births: birthDateKeys.size,
    offspring: offspringList.length,
    lastBirthDate,
  }
}

export type NextStepsResolver = (ctx: NextStepsContext) => NextStep[]

const staticSteps =
  (steps: string[]): NextStepsResolver =>
  () =>
    steps.map((text) => ({ text }))

/** Acciones recomendadas según la etapa efectiva del animal. */
export const animal_stage_next_steps: Record<AnimalStageKey, NextStepsResolver> = {
  cria: ({ animal, now }) => {
    const detail = daysUntilWeaningDetail(animal, now)
    return [
      { text: 'Registra el peso al nacer' },
      { text: 'Aplica vacunas y desparasitación según calendario' },
      {
        text: 'Marca el destete cuando alcance la edad o peso recomendado',
        detail,
      },
    ]
  },
  juvenil: ({ animal, now }) => {
    const monthsLeft = monthsUntilBreedingAge(animal, now)
    return [
      { text: 'Lleva control de peso mensual', detail: lastWeightDetail(animal, now) },
      { text: 'Mantén calendario de vacunación y desparasitación' },
      {
        text: 'Decide su destino: pasar a engorda o reproductor al madurar',
        detail: monthsLeft != null ? formatTimeRemaining(monthsLeft) : undefined,
      },
    ]
  },
  engorda: ({ animal, now }) => {
    const progress = weightTargetProgress(animal)
    return [
      { text: 'Monitorea su peso semanalmente', detail: lastWeightDetail(animal, now) },
      {
        text: 'Planea venta o sacrificio al alcanzar el peso objetivo',
        detail: progress
          ? `${Math.round(progress.percent)}% del objetivo (${progress.current.toFixed(1)}/${progress.target} kg)`
          : undefined,
      },
      { text: 'Registra la venta cuando se concrete' },
    ]
  },
  reproductor: ({ animal, animals, now }) => {
    const stats = animals ? parentingStats(animal, animals) : null
    let partosDetail: string | undefined
    if (stats && stats.offspring > 0) {
      const parts = [
        `${stats.births} parto${stats.births === 1 ? '' : 's'}`,
        `${stats.offspring} cría${stats.offspring === 1 ? '' : 's'}`,
      ]
      if (stats.lastBirthDate) {
        const refNow = now ?? new Date()
        const days = daysBetween(stats.lastBirthDate, refNow)
        if (days <= 0) parts.push('último: hoy')
        else if (days < 30) parts.push(`último: hace ${plural(days, 'día', 'días')}`)
        else {
          const months = Math.round(days / 30)
          parts.push(`último: hace ${plural(months, 'mes', 'meses')}`)
        }
      }
      partosDetail = parts.join(' · ')
    } else if (stats) {
      partosDetail = 'sin crías registradas'
    }
    return [
      { text: 'Agrega al animal a un empadre' },
      { text: 'Monitorea su condición corporal antes y después del cruce' },
      { text: 'Registra cruzas, gestaciones y partos', detail: partosDetail },
    ]
  },
  descarte: staticSteps([
    'No usar para reproducción',
    'Planea venta o sacrificio',
    'Registra el motivo de descarte en notas',
  ]),
  empadre: ({ animal, breedings, now }) => {
    const detail = empadreDetail(animal, breedings, now)
    return [
      { text: 'Confirma el embarazo cuando lo detectes' },
      { text: 'Sácala del empadre si no quedó preñada' },
      { text: 'Verifica el estado del macho y las hembras periódicamente', detail },
    ]
  },
  embarazos: ({ animal, breedings, now }) => {
    const detail = expectedBirthDetail(animal, breedings, now)
    return [
      { text: 'Registra el parto cuando nazcan las crías', detail },
      { text: 'Registra aborto si llega a ocurrir' },
      { text: 'Cuida la alimentación y condición durante la gestación' },
    ]
  },
  crias_lactantes: ({ animal, breedings, now }) => {
    const detail = lactanteWeaningDetail(animal, breedings, now)
    return [
      { text: 'Registra el peso de las crías' },
      { text: 'Aplica vacunación inicial según calendario' },
      { text: 'Marca el destete cuando las crías estén listas', detail },
    ]
  },
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
