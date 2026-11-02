import { toDate } from '@/lib/dates'
import type { MovementChange, MovementPlan } from '@/lib/record-movements'
import type { BreedingRecord } from '@/types/breedings'
import { movementEqual } from './movement-values'

/** Convierte de forma segura un valor (Timestamp, Date, string, number) a Date */
export const safeToDate = (val: unknown): Date | null => {
  if (!val) return null
  if (val instanceof Date) return val
  if (typeof val === 'string') {
    const d = new Date(val)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof val === 'number') return new Date(val)
  if (typeof val === 'object') {
    // Firestore Timestamp con toDate()
    if ('toDate' in val && typeof (val as { toDate: unknown }).toDate === 'function') {
      return (val as { toDate: () => Date }).toDate()
    }
    // Duck-typed Timestamp: { seconds: number, nanoseconds: number }
    if ('seconds' in val && typeof (val as { seconds: unknown }).seconds === 'number') {
      return new Date((val as { seconds: number }).seconds * 1000)
    }
  }
  return null
}

const breedingDateKey = (value: unknown) => {
  const date = safeToDate(value)
  if (!date) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeFemaleBreedingInfo = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value
    .map((raw) => {
      const info = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
      return {
        femaleId: String(info.femaleId ?? ''),
        pregnancyConfirmedDate: breedingDateKey(info.pregnancyConfirmedDate),
        expectedBirthDate: breedingDateKey(info.expectedBirthDate),
        actualBirthDate: breedingDateKey(info.actualBirthDate),
        diagnosedAt: breedingDateKey(info.diagnosedAt),
        offspring: Array.isArray(info.offspring)
          ? info.offspring.map(String).sort((a, b) => a.localeCompare(b))
          : [],
        outcome: info.outcome ?? null,
        outcomeNotes: info.outcomeNotes ?? null,
        legacyStatus: info.legacyStatus ?? null,
      }
    })
    .sort((a, b) => a.femaleId.localeCompare(b.femaleId))
}

export const breedingParticipantsEqual = (a: unknown, b: unknown) =>
  movementEqual(normalizeFemaleBreedingInfo(a), normalizeFemaleBreedingInfo(b))

export function breedingUpdateAnimalIds(
  currentRecord: BreedingRecord,
  updates: Partial<BreedingRecord>,
): string[] {
  return [
    ...new Set([
      currentRecord.maleId,
      ...currentRecord.femaleBreedingInfo.map((info) => info.femaleId),
      updates.maleId ?? currentRecord.maleId,
      ...(updates.femaleBreedingInfo ?? []).map((info) => info.femaleId),
    ]),
  ]
}

export function buildBreedingUpdatePlan(
  currentRecord: BreedingRecord,
  updates: Partial<BreedingRecord>,
  updateData: Record<string, unknown>,
  docs: Map<string, any>,
  deleteRecord = false,
): MovementPlan {
  const id = currentRecord.id
  const ids = breedingUpdateAnimalIds(currentRecord, updates)
  const previous = docs.get(`breedingRecords/${id}`)
  if (!previous) throw new Error('Empadre no encontrado')
  if (
    !breedingParticipantsEqual(previous.femaleBreedingInfo, currentRecord.femaleBreedingInfo) ||
    previous.maleId !== currentRecord.maleId
  )
    throw new Error('El empadre cambió. Actualiza la pantalla antes de continuar.')
  const changes: MovementChange[] = [
    { path: `breedingRecords/${id}`, data: updateData, delete: deleteRecord },
  ]
  for (const animalId of ids) {
    const animal = docs.get(`animals/${animalId}`)
    const before = previous.femaleBreedingInfo.find((info: any) => info.femaleId === animalId)
    const after = updates.femaleBreedingInfo?.find((info) => info.femaleId === animalId)
    let data: Record<string, unknown> = {}
    if (
      after &&
      !after.actualBirthDate &&
      (!movementEqual(before?.pregnancyConfirmedDate, after.pregnancyConfirmedDate) ||
        before?.outcome !== after.outcome)
    ) {
      if (
        after.outcome === 'aborted' ||
        (!after.pregnancyConfirmedDate && before?.pregnancyConfirmedDate)
      ) {
        data = {
          pregnantAt: null,
          pregnantBy: null,
          pregnantBreedingRecordId: null,
          pregnantBreedingId: null,
        }
      } else if (after.pregnancyConfirmedDate) {
        data = {
          pregnantAt: toDate(after.pregnancyConfirmedDate),
          pregnantBy: updates.maleId ?? previous.maleId,
          pregnantBreedingRecordId: id,
          pregnantBreedingId: updates.breedingId ?? previous.breedingId ?? null,
        }
      }
    } else if (
      updates.femaleBreedingInfo &&
      !after &&
      before?.pregnancyConfirmedDate &&
      before.outcome !== 'aborted' &&
      !before.actualBirthDate
    ) {
      data = {
        pregnantAt: animal?.pregnantAt ?? before.pregnancyConfirmedDate,
        pregnantBy: animal?.pregnantBy ?? previous.maleId,
        pregnantBreedingRecordId: id,
        pregnantBreedingId: previous.breedingId ?? null,
      }
    }
    changes.push({ path: `animals/${animalId}`, data })
  }
  const nextInfo = updates.femaleBreedingInfo
  const removed = previous.femaleBreedingInfo.filter(
    (info: any) => nextInfo && !nextInfo.some((next) => next.femaleId === info.femaleId),
  )
  const added =
    nextInfo?.filter(
      (info) => !previous.femaleBreedingInfo.some((old: any) => old.femaleId === info.femaleId),
    ) ?? []
  const aborted = nextInfo?.some(
    (info) =>
      info.outcome === 'aborted' &&
      previous.femaleBreedingInfo.find((old: any) => old.femaleId === info.femaleId)?.outcome !==
        'aborted',
  )
  const gestation = nextInfo?.some(
    (info) =>
      !movementEqual(
        info.pregnancyConfirmedDate,
        previous.femaleBreedingInfo.find((old: any) => old.femaleId === info.femaleId)
          ?.pregnancyConfirmedDate,
      ),
  )
  const title = aborted
    ? 'Aborto registrado'
    : gestation
      ? 'Gestación actualizada'
      : added.length || removed.length
        ? 'Entrada o salida de empadre'
        : 'Empadre actualizado'
  return {
    changes,
    record: {
      type: 'event',
      category: 'other',
      eventType: 'monta',
      title,
      date: new Date(),
      details: {
        Empadre: previous.breedingId ?? id,
        Entradas:
          added
            .map((info) => docs.get(`animals/${info.femaleId}`)?.animalNumber ?? info.femaleId)
            .join(', ') || '—',
        Salidas:
          removed
            .map((info: any) => docs.get(`animals/${info.femaleId}`)?.animalNumber ?? info.femaleId)
            .join(', ') || '—',
      },
    },
  }
}
