import { toDate } from 'date-fns'
import { Animal, AnimalStage, AnimalStageKey, isActivePregnancy, NextStep } from '../types/animals'
import { BreedingRecord } from '../types/breedings'
import {
  ANIMAL_BREEDING_CONFIGS,
  getAnimalBreedingConfig,
  getWeaningDays,
} from './animalBreedingConfig'

export const isAvailableToSale = (a: Animal): boolean =>
  !!a.availableToSaleAt && (a.status ?? 'activo') === 'activo'

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

export type WeaningStatusKind = 'completed' | 'unknown' | 'upcoming' | 'soon' | 'today' | 'overdue'

export type WeaningStatusTone = 'neutral' | 'warning' | 'danger'

export interface WeaningStatus {
  kind: WeaningStatusKind
  tone: WeaningStatusTone
  daysUntilDue: number | null
  label: string
  description: string
}

/** El destete sólo existe cuando fue registrado explícitamente. */
export function isAnimalWeaned(animal: Pick<Animal, 'isWeaned'>): boolean {
  return animal.isWeaned === true
}

/** Una cría conserva su etapa hasta que el usuario registra el destete. */
export function isCalf(animal: Pick<Animal, 'stage' | 'isWeaned'>): boolean {
  return animal.stage === 'cria' && !isAnimalWeaned(animal)
}

/** Criterio canónico para listas y conteos de crías activas. */
export function isActiveCalf(animal: Pick<Animal, 'stage' | 'isWeaned' | 'status'>): boolean {
  return (animal.status ?? 'activo') === 'activo' && isCalf(animal)
}

/** Fecha recomendada de destete: nacimiento + override/configuración de especie. */
export function getWeaningDueDate(
  animal: Pick<Animal, 'birthDate' | 'type' | 'customWeaningDays'>,
): Date | null {
  if (!animal.birthDate) return null
  const birthDate = toDate(animal.birthDate)
  if (Number.isNaN(birthDate.getTime())) return null
  const dueDate = new Date(birthDate)
  dueDate.setDate(dueDate.getDate() + getWeaningDays(animal))
  return dueDate
}

export function getWeaningStatusFromDays(daysUntilDue: number | null): WeaningStatus {
  if (daysUntilDue === null) {
    return {
      kind: 'unknown',
      tone: 'neutral',
      daysUntilDue,
      label: 'Sin fecha',
      description: 'Falta la fecha de nacimiento para calcular el destete',
    }
  }
  if (daysUntilDue < 0) {
    return {
      kind: 'overdue',
      tone: 'danger',
      daysUntilDue,
      label: `Hace ${Math.abs(daysUntilDue)}d`,
      description: `Destete vencido hace ${Math.abs(daysUntilDue)} días`,
    }
  }
  if (daysUntilDue === 0) {
    return {
      kind: 'today',
      tone: 'warning',
      daysUntilDue,
      label: 'Hoy',
      description: 'El destete recomendado vence hoy',
    }
  }
  if (daysUntilDue <= 14) {
    return {
      kind: 'soon',
      tone: 'warning',
      daysUntilDue,
      label: `En ${daysUntilDue}d`,
      description: `Destete recomendado en ${daysUntilDue} días`,
    }
  }
  return {
    kind: 'upcoming',
    tone: 'neutral',
    daysUntilDue,
    label: `En ${daysUntilDue}d`,
    description: `Destete recomendado en ${daysUntilDue} días`,
  }
}

/** Estado operativo del destete. La fecha vencida nunca cambia stage/isWeaned. */
export function getWeaningStatus(
  animal: Pick<Animal, 'birthDate' | 'type' | 'customWeaningDays' | 'isWeaned'>,
  now: Date = new Date(),
): WeaningStatus {
  if (isAnimalWeaned(animal)) {
    return {
      kind: 'completed',
      tone: 'neutral',
      daysUntilDue: null,
      label: 'Destetado',
      description: 'Destete registrado',
    }
  }
  const dueDate = getWeaningDueDate(animal)
  if (!dueDate) return getWeaningStatusFromDays(null)
  const startOfDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const daysUntilDue = Math.round(
    (startOfDueDate.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
  )
  return getWeaningStatusFromDays(daysUntilDue)
}

/**
 * Calcula el stage de un animal basándose en sus parámetros.
 *
 * Regla canónica — el destete real manda para las crías:
 *  - engorda / descarte: asignación manual, se respeta
 *  - stage='cria' + isWeaned!==true → 'cria', sin importar la edad
 *  - después del destete, la edad decide entre juvenil y reproductor
 *  - sin birthDate/age se conserva el stage persistido
 */
export function computeAnimalStage(animal: Animal): AnimalStage {
  // La fecha recomendada puede estar vencida, pero eso no equivale a un destete real.
  if (isCalf(animal)) return 'cria'

  // Stages manuales: el usuario los asignó explícitamente
  if (MANUAL_STAGES.has(animal.stage)) return animal.stage

  const config = ANIMAL_BREEDING_CONFIGS[animal.type]
  const minBreedingAge = config?.minBreedingAge ?? 12

  // Destete explícito a reproductor por el usuario: nunca 'cria'.
  // weaningDestination solo se setea por la acción "Destetar a Reproductor" en UI;
  // es una decisión autoritativa y la edad sólo decide si se muestra como juvenil
  // o si ya alcanzó la etapa de reproductor.
  if (animal.weaningDestination === 'reproductor') {
    const ageMonths = animalAge(animal, { format: 'months' })
    return ageMonths < minBreedingAge ? 'juvenil' : 'reproductor'
  }

  if (!animal.birthDate && !animal.age) return animal.stage

  const ageMonths = animalAge(animal, { format: 'months' })
  if (ageMonths < minBreedingAge) return 'juvenil'

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
 *   - Hembra con parto reciente (dentro del periodo de lactancia) Y con al menos una
 *     cría viva y sin destetar → 'crias_lactantes'
 * Si no, regresa el resultado de computeAnimalStage (AnimalStage base).
 *
 * @param animals - Lista completa de animales de la granja. Si se provee, se verifica
 *   que la madre tenga al menos una cría viva y sin destetar para retornar
 *   'crias_lactantes'. Sin este parámetro el check es solo por fecha (fallback).
 */
export function computeAnimalEffectiveStage(
  animal: Animal,
  breedings: BreedingRecord[],
  now: Date = new Date(),
  animals?: Animal[],
): AnimalStageKey {
  const activeBreedings = (breedings || []).filter((b) => b.status !== 'finished')

  // La lactancia es una condición explícita y concurrente. Tiene prioridad visual
  // incluso si faltan datos de edad legacy o la hembra ya volvió a quedar preñada.
  if (animal.gender === 'hembra' && animal.lactationStatus === 'active') {
    return 'crias_lactantes'
  }

  const baseStage = computeAnimalStage(animal)
  // Una cría no puede estar en estado reproductivo (empadre/gestaciones/crias_lactantes).
  // Evita clasificar crías con datos legacy (birthedAt/pregnantAt heredados) como madres.
  if (baseStage === 'cria') return 'cria'

  // Macho activo en algún empadre
  if (animal.gender === 'macho') {
    const inEmpadre = activeBreedings.some((b) => b.maleId === animal.id)
    if (inEmpadre) return 'empadre'
    return baseStage
  }

  // Hembra: revisar breeding records.
  // Para crias_lactantes revisamos TODOS los records (activos y cerrados) cuando
  // tenemos la lista de animales — el empadre puede haberse cerrado tras el parto.
  // Para empadre/gestaciones solo usamos records activos.
  let bestState: AnimalStageKey | null = null
  const weaningDays = getWeaningDays(animal)
  const breedingsToCheck = animals ? breedings || [] : activeBreedings

  for (const breeding of breedingsToCheck) {
    const info = breeding.femaleBreedingInfo?.find((f) => f.femaleId === animal.id)
    if (!info) continue

    if (info.actualBirthDate) {
      if (animals) {
        // Con la lista de animales verificamos directamente si hay crías vivas sin destetar.
        // No usamos ventana temporal — la existencia de crías activas es la prueba real.
        const hasActiveCria = hasLivingUnweanedOffspring(info.offspring, animals, animal.id)
        if (hasActiveCria) {
          bestState = 'crias_lactantes'
          break // máxima prioridad, no hay nada mejor
        }
      } else if (breeding.status !== 'finished') {
        // Sin lista de animales, usar ventana temporal como proxy (solo en activos)
        const birthDate = toDate(info.actualBirthDate)
        const daysSinceBirth = Math.floor(
          (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24),
        )
        if (daysSinceBirth <= weaningDays) {
          bestState = 'crias_lactantes'
        }
      }
    } else if (breeding.status !== 'finished') {
      // empadre/gestaciones solo aplican a records activos
      if (info.pregnancyConfirmedDate) {
        if (bestState !== 'crias_lactantes') bestState = 'embarazos'
      } else {
        if (bestState === null) bestState = 'empadre'
      }
    }
  }

  // Con lista de animales: verificar crías activas sin importar la fecha de parto
  const hasActiveCria = hasLivingUnweanedOffspring(undefined, animals, animal.id)
  if (hasActiveCria) return 'crias_lactantes'
  // La gestación activa se determina por el animal, aunque ya no pertenezca a un empadre.
  if (isActivePregnancy(animal)) return 'embarazos'
  // Un dato histórico del empadre no puede crear una gestación activa por sí solo.
  if (bestState === 'embarazos') return baseStage
  if (bestState) return bestState
  // Fallback a campos directos del animal (cuando no hay breeding record con parto)
  if (animal.gender === 'hembra') {
    if (animal.birthedAt) {
      if (animals) {
      } else {
        // Sin lista: ventana temporal como proxy
        const birthDate = toDate(animal.birthedAt)
        const daysSinceBirth = Math.floor(
          (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24),
        )
        if (daysSinceBirth >= 0 && daysSinceBirth <= weaningDays) return 'crias_lactantes'
      }
    }
    if (isActivePregnancy(animal)) return 'embarazos'
  }

  return baseStage
}

/**
 * Un animal sigue «sin destetar» hasta que exista una decisión explícita.
 * La fecha objetivo es sólo una recomendación operativa: no debe separar a la
 * cría de su madre automáticamente porque el destete real puede retrasarse.
 */
/**
 * Verifica si la madre tiene al menos una cría viva y sin destetar.
 * Prioriza offspringIds del breeding record; hace fallback a motherId
 * (soportando tanto id de Firestore como animalNumber legado).
 * Si no se dispone de la lista de animales, retorna `true` como fallback.
 */
function hasLivingUnweanedOffspring(
  _offspringIds: string[] | undefined,
  animals: Animal[] | undefined,
  motherId: string,
): boolean {
  const offspring = activeUnweanedOffspring({ farmAnimals: animals ?? [], motherId })
  return !!offspring?.length
}

export function activeUnweanedOffspring({
  farmAnimals,
  motherId,
}: {
  farmAnimals: Animal[]
  motherId: string
}): Animal[] {
  const isActive = (a: Animal) =>
    a.status === 'activo' || a.status === undefined || a.status === null
  const isOffspring = (a: Animal) => a.motherId === motherId

  // Retorna los animales que son hijas de la madre y están activos y sin destetar
  return farmAnimals.filter((a) => isOffspring(a) && isActive(a) && isCalf(a))
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
 * Obtiene el peso más reciente del animal desde el historial unificado.
 * `weightGrams` es la fuente de verdad; el título sólo se interpreta para
 * registros antiguos que todavía no hayan sido migrados.
 */
export function getLastWeight(animal: Animal): { kg: number; date: Date } | null {
  const latest = [...(animal.records || [])]
    .filter((r) => r.type === 'weight' && !r.undoneAt)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
  if (!latest) return null
  if (typeof latest.weightGrams === 'number' && latest.weightGrams > 0) {
    return { kg: latest.weightGrams / 1000, date: new Date(latest.date) }
  }
  const match = latest.title.match(/^([\d.]+)\s*(kg|lb)?/i)
  if (!match) return null
  const value = Number.parseFloat(match[1])
  const kg = match[2]?.toLowerCase() === 'lb' ? value * 0.453592 : value
  return { kg, date: new Date(latest.date) }
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
): {
  pregnancies: number
  births: number
  offspring: number
  openCycles: number
  lastBirthDate: Date | null
} {
  let pregnancies = 0
  let births = 0
  let offspring = 0
  let openCycles = 0
  let lastBirthDate: Date | null = null

  for (const breeding of breedings || []) {
    const info = breeding.femaleBreedingInfo?.find((f) => f.femaleId === animal.id)
    if (!info) continue
    if (info.pregnancyConfirmedDate) pregnancies++
    if (
      info.outcome === 'open' ||
      (breeding.status === 'finished' && !info.pregnancyConfirmedDate && !info.actualBirthDate)
    ) {
      openCycles++
    }
    if (info.actualBirthDate) {
      births++
      offspring += info.offspring?.length ?? 0
      const d = toDate(info.actualBirthDate)
      if (!lastBirthDate || d.getTime() > lastBirthDate.getTime()) {
        lastBirthDate = d
      }
    }
  }

  return { pregnancies, births, offspring, openCycles, lastBirthDate }
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
  const status = getWeaningStatus(animal, now)
  if (status.kind === 'unknown' || status.kind === 'completed') return undefined
  if (status.kind === 'overdue') return status.description.toLowerCase()
  if (status.kind === 'today') return 'destete recomendado hoy'
  return `destete en ${plural(status.daysUntilDue!, 'día', 'días')}`
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

/** Detail para gestaciones: días al parto esperado. */
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
      { text: 'Confirma la gestación cuando lo detectes' },
      { text: 'Sácala del empadre si no quedó gestante' },
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
