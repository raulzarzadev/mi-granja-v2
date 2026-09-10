import { collection, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore'
import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setBreedingRecords } from '@/features/breeding/breedingSlice'
import { deserializeObj, serializeObj } from '@/features/libs/serializeObj'
import { RootState } from '@/features/store'
import { toDate, toLocalDateStart } from '@/lib/dates'
import {
  commitMovement,
  createMovementId,
  type MovementChange,
  movementEqual,
} from '@/lib/record-movements'
import { isActivePregnancy } from '@/types/animals'
import { useRecordMovements } from './useRecordMovements'

/** Convierte de forma segura un valor (Timestamp, Date, string, number) a Date */
const safeToDate = (val: unknown): Date | null => {
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

import {
  trackGestationTracked,
  trackReproductionEventCreated,
  trackReproductionEventUpdated,
} from '@/lib/analytics/track'
import { db } from '@/lib/firebase'
import { BreedingRecord, generateBreedingId as buildBreedingId } from '@/types/breedings'
import { Comment, NewCommentInput } from '@/types/comment'
import { getBreedingUpcomingBirths } from './libs/breeding-helpers'

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

export const useBreedingCRUD = () => {
  const dispatch = useDispatch()

  const [isLoading] = useState(false)
  const { user } = useSelector((state: RootState) => state.auth)
  const { breedingRecords } = useSelector((state: RootState) => state.breeding)
  const { animals } = useSelector((state: RootState) => state.animals)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { currentFarm } = useSelector((state: RootState) => state.farm)
  const movements = useRecordMovements(animals)

  // Función para generar ID legible por humanos
  const generateBreedingId = (breedingDate: Date): string => {
    return buildBreedingId(breedingDate, breedingRecords)
  }

  // Crear registro de empadre
  const createBreedingRecord = async (
    data: Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt' | 'updatedAt' | 'breedingId'>,
  ) => {
    if (!user) throw new Error('Usuario no autenticado')
    if (!currentFarm?.id) throw new Error('Selecciona una granja primero')

    setIsSubmitting(true)
    try {
      const breedingDate = data.breedingDate ? new Date(data.breedingDate) : new Date()
      await movements.breeding(createMovementId(), {
        ...data,
        breedingDate,
        breedingId: generateBreedingId(breedingDate),
        status:
          data.femaleBreedingInfo.length &&
          data.femaleBreedingInfo.every((info) => info.pregnancyConfirmedDate)
            ? 'finished'
            : 'active',
      })
      trackReproductionEventCreated({ type: 'breeding' })
    } catch (error) {
      console.error('Error creating breeding record:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Actualizar registro de reproducción
  const updateBreedingRecord = async (
    id: string,
    updates: Partial<Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt'>>,
    deleteRecord = false,
  ) => {
    setIsSubmitting(true)
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
      }

      const hasProp = <K extends keyof typeof updates>(key: K) => Object.hasOwn(updates, key)

      if (hasProp('breedingId')) {
        updateData.breedingId = updates.breedingId ?? null
      }

      if (hasProp('maleId')) {
        updateData.maleId = updates.maleId ?? null
      }

      if (hasProp('notes')) {
        updateData.notes = updates.notes ?? ''
      }

      if (hasProp('status')) {
        updateData.status = updates.status ?? 'active'
      }

      if (hasProp('breedingDate')) {
        updateData.breedingDate = updates.breedingDate
          ? Timestamp.fromDate(toLocalDateStart(new Date(updates.breedingDate)))
          : null
      }

      if (hasProp('femaleBreedingInfo') && updates.femaleBreedingInfo) {
        updateData.femaleBreedingInfo = updates.femaleBreedingInfo.map((info) => ({
          ...info,
          pregnancyConfirmedDate: info.pregnancyConfirmedDate
            ? Timestamp.fromDate(toLocalDateStart(new Date(info.pregnancyConfirmedDate)))
            : null,
          expectedBirthDate: info.expectedBirthDate
            ? Timestamp.fromDate(toLocalDateStart(new Date(info.expectedBirthDate)))
            : null,
          actualBirthDate: info.actualBirthDate
            ? Timestamp.fromDate(toLocalDateStart(new Date(info.actualBirthDate)))
            : null,
        }))
      }

      if (hasProp('comments')) {
        const commentToFirestore = (comment: Comment) => ({
          ...comment,
          createdAt: comment.createdAt
            ? Timestamp.fromDate(new Date(comment.createdAt))
            : Timestamp.now(),
        })

        updateData.comments = updates.comments?.map(commentToFirestore) ?? []
      }

      const currentRecord = breedingRecords.find((record) => record.id === id)
      if (!currentRecord) throw new Error('Empadre no encontrado')
      const ids = [
        ...new Set([
          currentRecord.maleId,
          ...currentRecord.femaleBreedingInfo.map((info) => info.femaleId),
          updates.maleId ?? currentRecord.maleId,
          ...(updates.femaleBreedingInfo ?? []).map((info) => info.femaleId),
        ]),
      ]
      await commitMovement(
        movements.context,
        createMovementId(),
        ids,
        [`breedingRecords/${id}`],
        (docs) => {
          const previous = docs.get(`breedingRecords/${id}`)
          if (!previous) throw new Error('Empadre no encontrado')
          if (
            !breedingParticipantsEqual(
              previous.femaleBreedingInfo,
              currentRecord.femaleBreedingInfo,
            ) ||
            previous.maleId !== currentRecord.maleId
          )
            throw new Error('El empadre cambió. Actualiza la pantalla antes de continuar.')
          const changes: MovementChange[] = [
            { path: `breedingRecords/${id}`, data: updateData, delete: deleteRecord },
          ]
          for (const animalId of ids) {
            const animal = docs.get(`animals/${animalId}`)
            const before = previous.femaleBreedingInfo.find(
              (info: any) => info.femaleId === animalId,
            )
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
              (info) =>
                !previous.femaleBreedingInfo.some((old: any) => old.femaleId === info.femaleId),
            ) ?? []
          const aborted = nextInfo?.some(
            (info) =>
              info.outcome === 'aborted' &&
              previous.femaleBreedingInfo.find((old: any) => old.femaleId === info.femaleId)
                ?.outcome !== 'aborted',
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
                    .map(
                      (info) => docs.get(`animals/${info.femaleId}`)?.animalNumber ?? info.femaleId,
                    )
                    .join(', ') || '—',
                Salidas:
                  removed
                    .map(
                      (info: any) =>
                        docs.get(`animals/${info.femaleId}`)?.animalNumber ?? info.femaleId,
                    )
                    .join(', ') || '—',
              },
            },
          }
        },
      )
      // birth registered = parto type; confirmed pregnancy = gestation
      const hasBirth = updates.femaleBreedingInfo?.some((i) => i.actualBirthDate)
      const eventType = hasBirth ? 'parto' : 'breeding'
      trackReproductionEventUpdated({ type: eventType })
      if (updates.femaleBreedingInfo?.some((i) => i.pregnancyConfirmedDate && !i.actualBirthDate)) {
        trackGestationTracked()
      }
    } catch (error) {
      console.error('Error updating breeding record:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Eliminar registro
  const deleteBreedingRecord = async (id: string) => {
    setIsSubmitting(true)
    try {
      await updateBreedingRecord(id, { status: 'finished', femaleBreedingInfo: [] }, true)
    } catch (error) {
      console.error('Error deleting breeding record:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Obtener registros por animal (usando ID de Firestore)
  const getRecordsByAnimal = (animalId: string) => {
    return breedingRecords.filter(
      (record) =>
        record.femaleBreedingInfo?.some((info) => info.femaleId === animalId) ||
        record.maleId === animalId,
    )
  }

  // Obtener gestaciones activas
  const getActivePregnancies = () => {
    const activePregnantIds = new Set(animals.filter(isActivePregnancy).map((animal) => animal.id))
    return breedingRecords.filter((record) =>
      record.femaleBreedingInfo?.some((info) => activePregnantIds.has(info.femaleId)),
    )
  }

  // Obtener partos próximos (dentro de 7 días)
  const getUpcomingBirths = () => {
    return breedingRecords.filter((record) => {
      const upcoming = getBreedingUpcomingBirths(record)
      return upcoming
    })
  }

  // Obtener estadísticas
  const getStats = () => {
    const activePregnancies = animals.filter(isActivePregnancy).length
    const upcomingBirths = getUpcomingBirths().length

    const totalOffspring = breedingRecords.reduce(
      (total, record) =>
        total +
        (record.femaleBreedingInfo?.reduce(
          (femaleTotal, info) => femaleTotal + (info.offspring?.length || 0),
          0,
        ) || 0),
      0,
    )

    return {
      totalBreedings: breedingRecords.length,
      activePregnancies,
      upcomingBirths,
      totalOffspring,
    }
  }

  // ============== Births Window (past due / upcoming) ==============
  // Cache simple por "days" + firma de datos para evitar recálculos pesados
  const windowsCache = useRef<
    Map<number, { signature: string; value: ReturnType<typeof buildBirthsWindow> }>
  >(new Map())
  const summariesCache = useRef<
    Map<number, { signature: string; value: ReturnType<typeof buildBirthsWindowSummary> }>
  >(new Map())

  interface FemaleInfoLite {
    femaleId: string
    expectedBirthDate?: Date | null
    actualBirthDate?: Date | null
    pregnancyConfirmedDate?: Date | null
  }

  const buildSignature = () => {
    // Firma basada en ids + timestamps relevantes
    return breedingRecords
      .map((r) =>
        [
          r.id,
          r.femaleBreedingInfo
            .map((f) =>
              [
                f.femaleId,
                f.expectedBirthDate ? toDate(f.expectedBirthDate)?.getTime() : 0,
                f.actualBirthDate ? toDate(f.actualBirthDate)?.getTime() : 0,
                f.pregnancyConfirmedDate ? toDate(f.pregnancyConfirmedDate)?.getTime() : 0,
              ].join(':'),
            )
            .join('|'),
        ].join('#'),
      )
      .join(';')
  }

  const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

  const buildBirthsWindow = (days: number) => {
    const now = normalizeDate(new Date())
    const msDay = 86400000
    const pastDue: {
      record: BreedingRecord
      info: FemaleInfoLite
      daysDiff: number
    }[] = []
    const upcoming: {
      record: BreedingRecord
      info: FemaleInfoLite
      daysDiff: number
    }[] = []

    breedingRecords.forEach((record) => {
      record.femaleBreedingInfo.forEach((info) => {
        if (!info.expectedBirthDate || info.actualBirthDate) return
        const expected = normalizeDate(new Date(info.expectedBirthDate))
        const diffDays = Math.round((expected.getTime() - now.getTime()) / msDay)
        if (diffDays < 0 && Math.abs(diffDays) <= days) {
          pastDue.push({ record, info, daysDiff: diffDays })
        } else if (diffDays >= 0 && diffDays <= days) {
          upcoming.push({ record, info, daysDiff: diffDays })
        }
      })
    })

    // Ordenar: pastDue más antiguos primero (más negativos), upcoming más cercanos primero
    pastDue.sort((a, b) => a.daysDiff - b.daysDiff) // e.g. -10, -2
    upcoming.sort((a, b) => a.daysDiff - b.daysDiff) // e.g. 0,1,2

    return { pastDue, upcoming, days }
  }

  const buildBirthsWindowSummary = (window: ReturnType<typeof buildBirthsWindow>) => {
    return {
      pastDueCount: window.pastDue.length,
      upcomingCount: window.upcoming.length,
      windowDays: window.days,
    }
  }

  const getBirthsWindow = (days = 7) => {
    const signature = buildSignature()
    const cached = windowsCache.current.get(days)
    if (cached && cached.signature === signature) return cached.value
    const value = buildBirthsWindow(days)
    windowsCache.current.set(days, { signature, value })
    return value
  }

  const getBirthsWindowSummary = (days = 7) => {
    const signature = buildSignature()
    const cached = summariesCache.current.get(days)
    if (cached && cached.signature === signature) return cached.value
    const window = getBirthsWindow(days)
    const value = buildBirthsWindowSummary(window)
    summariesCache.current.set(days, { signature, value })
    return value
  }

  const getFarmBreedings = () => {
    const constraints = []
    if (currentFarm?.id) constraints.push(where('farmId', '==', currentFarm.id))
    const q = query(
      collection(db, 'breedingRecords'),
      ...constraints,
      orderBy('breedingDate', 'desc'),
    )

    return onSnapshot(q, (snapshot) => {
      const records: BreedingRecord[] = []
      snapshot.forEach((docSnap) => {
        try {
          const data = docSnap.data()
          records.push({
            ...data,
            id: docSnap.id,
            farmerId: data.farmerId,
            maleId: data.maleId,
            breedingId: data.breedingId || '',
            notes: data.notes || '',
            status: data.status || undefined,
            breedingDate: safeToDate(data.breedingDate)
              ? toLocalDateStart(safeToDate(data.breedingDate)!)
              : null,
            femaleBreedingInfo:
              data.femaleBreedingInfo?.map(
                (info: {
                  animalNumber: string
                  pregnancyConfirmedDate?: unknown
                  expectedBirthDate?: unknown
                  actualBirthDate?: unknown
                  offspring?: string[]
                }) => ({
                  ...info,
                  pregnancyConfirmedDate: safeToDate(info.pregnancyConfirmedDate)
                    ? toLocalDateStart(safeToDate(info.pregnancyConfirmedDate)!)
                    : undefined,
                  expectedBirthDate: safeToDate(info.expectedBirthDate)
                    ? toLocalDateStart(safeToDate(info.expectedBirthDate)!)
                    : undefined,
                  actualBirthDate: safeToDate(info.actualBirthDate)
                    ? toLocalDateStart(safeToDate(info.actualBirthDate)!)
                    : undefined,
                }),
              ) || [],
            createdAt: safeToDate(data.createdAt) || new Date(),
            updatedAt: safeToDate(data.updatedAt) || new Date(),
          })
        } catch (e) {
          console.error('Error parseando breeding record:', docSnap.id, e)
        }
      })
      dispatch(setBreedingRecords(serializeObj(records)))
    })
  }

  const onAddComment = async (breedingId: string, comment: NewCommentInput) => {
    if (!user) throw new Error('Usuario no autenticado')

    const record = breedingRecords.find((b) => b.id === breedingId)
    if (!record) throw new Error('Registro de empadre no encontrado')

    const newComment = {
      id: `cmt-${Date.now()}`, // ID temporal, idealmente generado por el backend
      content: comment.content,
      urgency: comment.urgency || 'none',
      createdAt: new Date(),
      createdBy: user.id,
    }

    const updatedComments = [newComment, ...(record.comments || [])]

    await updateBreedingRecord(breedingId, { comments: updatedComments })
    return newComment
  }
  const handleUpdateCommentUrgency = async (
    breedingId: string,
    commentId: string,
    newLevel: NewCommentInput['urgency'],
  ) => {
    const record = breedingRecords.find((b) => b.id === breedingId)
    if (!record) throw new Error('Registro de empadre no encontrado')

    const updatedComments = record.comments?.map((comment) =>
      comment.id === commentId ? { ...comment, urgency: newLevel } : comment,
    )

    await updateBreedingRecord(breedingId, { comments: updatedComments })

    setBreedingRecords(
      serializeObj(
        breedingRecords.map((r) =>
          r.id === breedingId ? { ...r, comments: updatedComments || [] } : r,
        ),
      ),
    )
  }

  return {
    breedingRecords: deserializeObj(breedingRecords),
    getFarmBreedings,
    isLoading,
    isSubmitting,
    createBreedingRecord,
    updateBreedingRecord,
    deleteBreedingRecord,
    getRecordsByAnimal,
    getActivePregnancies,
    getUpcomingBirths,
    getBirthsWindow,
    getBirthsWindowSummary,
    getStats,
    onAddComment,
    handleUpdateCommentUrgency,
  }
}
