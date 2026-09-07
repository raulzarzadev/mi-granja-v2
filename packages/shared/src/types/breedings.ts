import { Comment } from './comment'

export type BreedingOutcome = 'pending' | 'pregnant' | 'open' | 'calved' | 'aborted'

export interface FemaleBreedingInfo {
  femaleId: string // NOTA: Este campo almacena el ID de Firestore del animal hembra, no el animalNumber del usuario
  pregnancyConfirmedDate?: Date | null
  expectedBirthDate?: Date | null
  actualBirthDate?: Date | null
  offspring?: string[] // IDs de las crías de esta hembra específica
  /** Resultado histórico de la monta; `open` significa diagnosticada no gestante. */
  outcome?: BreedingOutcome
  /** Fecha en que se confirmó el resultado reproductivo. */
  diagnosedAt?: Date | null
  /** Compatibilidad y trazabilidad con respaldos de la aplicación anterior. */
  legacyStatus?: 'PENDING' | 'PREGNANT' | 'EMPTY' | 'BIRTH'
}

/**
 * Cierra el resultado reproductivo de cada hembra al terminar un empadre.
 * Las hembras sin gestación confirmada cuentan como un ciclo abierto/no gestante.
 */
export function finalizeFemaleBreedingOutcomes(
  femaleBreedingInfo: FemaleBreedingInfo[],
  diagnosedAt = new Date(),
): FemaleBreedingInfo[] {
  return femaleBreedingInfo.map((info) => {
    const outcome =
      info.outcome === 'aborted'
        ? 'aborted'
        : info.actualBirthDate
          ? 'calved'
          : info.pregnancyConfirmedDate
            ? 'pregnant'
            : 'open'

    return {
      ...info,
      outcome,
      diagnosedAt: info.outcome === 'aborted' ? (info.diagnosedAt ?? diagnosedAt) : diagnosedAt,
    }
  })
}

/** Estado de un empadre: active = en curso, finished = terminada manualmente */
export type BreedingStatus = 'active' | 'finished'

export interface BreedingRecord {
  id: string
  breedingId?: string // ID legible por humanos, ej: "10-10-25-01"
  farmerId: string
  farmId?: string
  maleId: string
  breedingDate: Date | null
  femaleBreedingInfo: FemaleBreedingInfo[] // Información específica de cada hembra
  /** Estado del empadre. Si es 'finished', las hembras pendientes quedan libres */
  status?: BreedingStatus
  notes?: string
  comments?: Comment[]
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Genera el ID corto de un empadre: año (2 dígitos) + semana ISO (2 dígitos) + consecutivo.
 * Ejemplo: 26520 = 2026, semana 52, primer empadre de esa semana.
 */
export function generateBreedingId(
  breedingDate: Date,
  records: BreedingRecord[] = [],
  excludeRecordId?: string,
): string {
  const date = new Date(breedingDate.getFullYear(), breedingDate.getMonth(), breedingDate.getDate())
  const dayOfWeek = date.getDay() || 7
  date.setDate(date.getDate() + 4 - dayOfWeek)

  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const week = Math.ceil(((date.getTime() - firstDayOfYear.getTime()) / 86_400_000 + 1) / 7)
  const baseId = `${String(breedingDate.getFullYear()).slice(-2)}${String(week).padStart(2, '0')}`
  const usedIds = new Set(
    records
      .filter((record) => record.id !== excludeRecordId)
      .map((record) => record.breedingId?.trim())
      .filter((breedingId): breedingId is string => Boolean(breedingId)),
  )

  let consecutive = 0
  while (usedIds.has(`${baseId}${consecutive}`)) consecutive += 1
  return `${baseId}${consecutive}`
}
