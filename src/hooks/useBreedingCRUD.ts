import { useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  where,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { RootState } from '@/features/store'
import { setBreedingRecords } from '@/features/breeding/breedingSlice'
import { deserializeObj, serializeObj } from '@/features/libs/serializeObj'
import { getBreedingUpcomingBirths } from './libs/breeding-helpers'
import { BreedingRecord } from '@/types/breedings'
import { toDate, toLocalDateStart } from '@/lib/dates'
import { NewCommentInput } from '@/types/comment'
import { Comment } from '@/types/comment'

export const useBreedingCRUD = () => {
  const dispatch = useDispatch()

  const [isLoading] = useState(false)
  const { user } = useSelector((state: RootState) => state.auth)
  const { breedingRecords } = useSelector((state: RootState) => state.breeding)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { currentFarm } = useSelector((state: RootState) => state.farm)

  // Función para generar ID legible por humanos
  const generateBreedingId = (breedingDate: Date): string => {
    const day = breedingDate.getDate().toString().padStart(2, '0')
    const month = (breedingDate.getMonth() + 1).toString().padStart(2, '0')
    const year = breedingDate.getFullYear().toString().slice(-2)
    const baseId = `${day}-${month}-${year}`

    // Buscar registros existentes para la misma fecha
    const sameDate = breedingRecords.filter((record) => {
      if (!record.breedingDate) return false
      const recordDate = toDate(record.breedingDate)
      return recordDate.toDateString() === breedingDate.toDateString()
    })

    // Generar consecutivo
    const consecutive = (sameDate.length + 1).toString().padStart(2, '0')
    return `${baseId}-${consecutive}`
  }

  // Crear registro de monta
  const createBreedingRecord = async (
    data: Omit<
      BreedingRecord,
      'id' | 'farmerId' | 'createdAt' | 'updatedAt' | 'breedingId'
    >
  ) => {
    if (!user) throw new Error('Usuario no autenticado')
    if (!currentFarm?.id) throw new Error('Selecciona una granja primero')

    setIsSubmitting(true)
    try {
      const now = Timestamp.now()
      const breedingDate = data.breedingDate
        ? new Date(data.breedingDate)
        : new Date()
      const breedingId = generateBreedingId(breedingDate)

      const docData = {
        breedingId,
        farmerId: user.id,
        farmId: currentFarm.id,
        maleId: data.maleId,
        breedingDate: data.breedingDate
          ? Timestamp.fromDate(toLocalDateStart(new Date(data.breedingDate)))
          : null,

        femaleBreedingInfo:
          data.femaleBreedingInfo?.map((info) => ({
            ...info,
            pregnancyConfirmedDate: info.pregnancyConfirmedDate
              ? Timestamp.fromDate(
                  toLocalDateStart(new Date(info.pregnancyConfirmedDate))
                )
              : null,
            expectedBirthDate: info.expectedBirthDate
              ? Timestamp.fromDate(
                  toLocalDateStart(new Date(info.expectedBirthDate))
                )
              : null,
            actualBirthDate: info.actualBirthDate
              ? Timestamp.fromDate(
                  toLocalDateStart(new Date(info.actualBirthDate))
                )
              : null
          })) || [],

        notes: data.notes || '',
        createdAt: now,
        updatedAt: now
      }

      await addDoc(collection(db, 'breedingRecords'), docData)
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
    updates: Partial<Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt'>>
  ) => {
    setIsSubmitting(true)
    try {
      const docRef = doc(db, 'breedingRecords', id)

      const updateData: Record<string, unknown> = {
        updatedAt: Timestamp.now()
      }

      const hasProp = <K extends keyof typeof updates>(key: K) =>
        Object.prototype.hasOwnProperty.call(updates, key)

      if (hasProp('breedingId')) {
        updateData.breedingId = updates.breedingId ?? null
      }

      if (hasProp('maleId')) {
        updateData.maleId = updates.maleId ?? null
      }

      if (hasProp('notes')) {
        updateData.notes = updates.notes ?? ''
      }

      if (hasProp('breedingDate')) {
        updateData.breedingDate = updates.breedingDate
          ? Timestamp.fromDate(toLocalDateStart(new Date(updates.breedingDate)))
          : null
      }

      if (hasProp('femaleBreedingInfo') && updates.femaleBreedingInfo) {
        updateData.femaleBreedingInfo = updates.femaleBreedingInfo.map(
          (info) => ({
            ...info,
            pregnancyConfirmedDate: info.pregnancyConfirmedDate
              ? Timestamp.fromDate(
                  toLocalDateStart(new Date(info.pregnancyConfirmedDate))
                )
              : null,
            expectedBirthDate: info.expectedBirthDate
              ? Timestamp.fromDate(
                  toLocalDateStart(new Date(info.expectedBirthDate))
                )
              : null,
            actualBirthDate: info.actualBirthDate
              ? Timestamp.fromDate(
                  toLocalDateStart(new Date(info.actualBirthDate))
                )
              : null
          })
        )
      }

      if (hasProp('comments')) {
        const commentToFirestore = (comment: Comment) => ({
          ...comment,
          createdAt: comment.createdAt
            ? Timestamp.fromDate(new Date(comment.createdAt))
            : Timestamp.now()
        })

        updateData.comments = updates.comments?.map(commentToFirestore) ?? []
      }

      dispatch(
        setBreedingRecords(
          serializeObj(
            breedingRecords.map((record) =>
              record.id === id
                ? {
                    ...record,
                    ...updates,
                    updatedAt: new Date() // Update the modification date
                  }
                : record
            )
          )
        )
      )

      await updateDoc(docRef, updateData)
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
      await deleteDoc(doc(db, 'breedingRecords', id))
      dispatch(
        setBreedingRecords(
          serializeObj(breedingRecords.filter((record) => record.id !== id))
        )
      )
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
        record.maleId === animalId
    )
  }

  // Obtener embarazos activos
  const getActivePregnancies = () => {
    return breedingRecords.filter((record) =>
      record.femaleBreedingInfo?.some(
        (info) => !!info.pregnancyConfirmedDate && !info.actualBirthDate
      )
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
    const activePregnancies = breedingRecords.reduce(
      (total, record) =>
        total +
        (record.femaleBreedingInfo?.filter(
          (info) => !!info.pregnancyConfirmedDate && !info.actualBirthDate
        ).length || 0),
      0
    )
    const upcomingBirths = getUpcomingBirths().length

    const totalOffspring = breedingRecords.reduce(
      (total, record) =>
        total +
        (record.femaleBreedingInfo?.reduce(
          (femaleTotal, info) => femaleTotal + (info.offspring?.length || 0),
          0
        ) || 0),
      0
    )

    return {
      totalBreedings: breedingRecords.length,
      activePregnancies,
      upcomingBirths,
      totalOffspring
    }
  }

  // ============== Births Window (past due / upcoming) ==============
  // Cache simple por "days" + firma de datos para evitar recálculos pesados
  const windowsCache = useRef<
    Map<
      number,
      { signature: string; value: ReturnType<typeof buildBirthsWindow> }
    >
  >(new Map())
  const summariesCache = useRef<
    Map<
      number,
      { signature: string; value: ReturnType<typeof buildBirthsWindowSummary> }
    >
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
                f.expectedBirthDate
                  ? toDate(f.expectedBirthDate)?.getTime()
                  : 0,
                f.actualBirthDate ? toDate(f.actualBirthDate)?.getTime() : 0,
                f.pregnancyConfirmedDate
                  ? toDate(f.pregnancyConfirmedDate)?.getTime()
                  : 0
              ].join(':')
            )
            .join('|')
        ].join('#')
      )
      .join(';')
  }

  const normalizeDate = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate())

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
        const diffDays = Math.round(
          (expected.getTime() - now.getTime()) / msDay
        )
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

  const buildBirthsWindowSummary = (
    window: ReturnType<typeof buildBirthsWindow>
  ) => {
    return {
      pastDueCount: window.pastDue.length,
      upcomingCount: window.upcoming.length,
      windowDays: window.days
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
      orderBy('breedingDate', 'desc')
    )

    onSnapshot(q, (snapshot) => {
      const records: BreedingRecord[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        records.push({
          id: doc.id,
          breedingId: data.breedingId || '', // Campo agregado para compatibilidad
          farmerId: data.farmerId,
          maleId: data.maleId,
          breedingDate: toLocalDateStart(data.breedingDate.toDate()),
          femaleBreedingInfo:
            data.femaleBreedingInfo?.map(
              (info: {
                animalNumber: string
                pregnancyConfirmedDate?: Timestamp
                expectedBirthDate?: Timestamp
                actualBirthDate?: Timestamp
                offspring?: string[]
              }) => ({
                ...info,
                pregnancyConfirmedDate: info.pregnancyConfirmedDate
                  ? toLocalDateStart(info.pregnancyConfirmedDate.toDate())
                  : undefined,
                expectedBirthDate: info.expectedBirthDate
                  ? toLocalDateStart(info.expectedBirthDate.toDate())
                  : undefined,
                actualBirthDate: info.actualBirthDate
                  ? toLocalDateStart(info.actualBirthDate.toDate())
                  : undefined
              })
            ) || [],
          notes: data.notes || '',
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          ...data
        })
      })
      dispatch(setBreedingRecords(serializeObj(records)))
    })
  }

  const onAddComment = async (breedingId: string, comment: NewCommentInput) => {
    if (!user) throw new Error('Usuario no autenticado')

    const record = breedingRecords.find((b) => b.id === breedingId)
    if (!record) throw new Error('Registro de monta no encontrado')

    const newComment = {
      id: `cmt-${Date.now()}`, // ID temporal, idealmente generado por el backend
      content: comment.content,
      urgency: comment.urgency || 'none',
      createdAt: new Date(),
      createdBy: user.id
    }

    const updatedComments = [newComment, ...(record.comments || [])]

    await updateBreedingRecord(breedingId, { comments: updatedComments })
    return newComment
  }
  const handleUpdateCommentUrgency = async (
    breedingId: string,
    commentId: string,
    newLevel: NewCommentInput['urgency']
  ) => {
    const record = breedingRecords.find((b) => b.id === breedingId)
    if (!record) throw new Error('Registro de monta no encontrado')

    const updatedComments = record.comments?.map((comment) =>
      comment.id === commentId ? { ...comment, urgency: newLevel } : comment
    )

    await updateBreedingRecord(breedingId, { comments: updatedComments })

    setBreedingRecords(
      serializeObj(
        breedingRecords.map((r) =>
          r.id === breedingId ? { ...r, comments: updatedComments || [] } : r
        )
      )
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
    handleUpdateCommentUrgency
  }
}
