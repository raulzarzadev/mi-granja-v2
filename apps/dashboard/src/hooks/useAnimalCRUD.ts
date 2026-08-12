'use client'

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { useCallback, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectAnimalsWithComputedStage } from '@/features/animals/animalsSelectors'
import { setAnimals } from '@/features/animals/animalsSlice'
import { setError } from '@/features/auth/authSlice'
import { serializeObj } from '@/features/libs/serializeObj'
import { RootState } from '@/features/store'
import { useAdminActions } from '@/lib/adminActions'
import {
  trackAnimalCreated,
  trackAnimalDeleted,
  trackAnimalUpdated,
  trackRecordCreated,
} from '@/lib/analytics/track'
import { computeAnimalStage, isActiveCalf } from '@/lib/animal-utils'
import { batchUpdateAnimals } from '@/lib/batchUpdateAnimals'
import { db } from '@/lib/firebase'
import {
  Animal,
  type AnimalMilkRecord,
  AnimalRecord,
  AnimalStatus,
  type AnimalWeightRecord,
  WeanNextStage,
} from '@/types/animals'

function latestWeightGrams(records: AnimalRecord[]): number | null {
  const latest = records
    .filter(
      (record): record is AnimalWeightRecord =>
        record.type === 'weight' &&
        typeof record.weightGrams === 'number' &&
        record.weightGrams > 0,
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
  return latest?.weightGrams ?? null
}

/**
 * Hook personalizado para el manejo de animales
 * Gestiona CRUD operations con Firestore y estado global con Redux
 */

export const useAnimalCRUD = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.auth)
  const { currentFarm } = useSelector((state: RootState) => state.farm)
  const { wrapWithAdminMetadata } = useAdminActions()
  // Animales con `computedStage` pre-calculado (usa breedingRecords + lista completa)
  const animals = useSelector(selectAnimalsWithComputedStage)

  const [isLoading, setIsLoading] = useState(false)

  const create = async (
    animalData: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>,
  ) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }
    if (!currentFarm?.id) {
      dispatch(setError('Selecciona o crea una granja antes de crear animales'))
      throw new Error('No hay granja seleccionada')
    }

    setIsLoading(true)
    try {
      const now = new Date()
      let newAnimal = {
        ...animalData,
        farmerId: user.id,
        farmId: currentFarm.id,
        createdAt: now,
        updatedAt: now,
      }

      // El historial unificado es la fuente de verdad del peso.
      const initialWeight =
        typeof newAnimal.weight === 'number' && newAnimal.weight > 0 ? newAnimal.weight : null
      const hasInitialWeightRecord = newAnimal.records?.some((record) => record.type === 'weight')
      if (initialWeight && !hasInitialWeightRecord) {
        const weightKg = (initialWeight / 1000).toFixed(1)
        const weightRecord: AnimalRecord = {
          id: crypto.randomUUID(),
          type: 'weight',
          category: 'general',
          title: `${weightKg} kg`,
          weightGrams: initialWeight,
          date: now,
          createdAt: now,
          createdBy: user.id,
        }
        newAnimal = {
          ...newAnimal,
          records: [...(newAnimal.records || []), weightRecord],
        }
      }

      // Añadir metadata de admin si se está haciendo impersonación
      newAnimal = wrapWithAdminMetadata(newAnimal, 'Creación de animal')

      const docRef = await addDoc(collection(db, 'animals'), newAnimal)
      trackAnimalCreated({ species: newAnimal.type, breed: newAnimal.breed })
      return docRef.id
    } catch (error) {
      console.error('Error creating animal:', error, { animalData })
      const errorMessage = error instanceof Error ? error.message : 'Error al crear el animal'
      dispatch(setError(errorMessage))
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Actualizar animal existente
  const update = async (animalId: string, updateData: Partial<Animal>) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    console.log({ updateData })
    setIsLoading(true)
    try {
      const animalRef = doc(db, 'animals', animalId)
      const now = new Date()
      let updatedData: Partial<Animal> & { updatedAt: Date } = {
        ...updateData,
        updatedAt: now,
      }

      // Si cambia el peso resumido, agregar el evento al historial unificado.
      const hasWeightInUpdate = typeof updateData.weight === 'number' && updateData.weight > 0
      const callerAlreadyPushedHistory = updateData.records !== undefined
      if (hasWeightInUpdate && !callerAlreadyPushedHistory) {
        const existing = animals.find((a) => a.id === animalId)
        if (existing && existing.weight !== updateData.weight) {
          const newWeight = updateData.weight as number
          const weightKg = (newWeight / 1000).toFixed(1)
          const weightRecord: AnimalRecord = {
            id: crypto.randomUUID(),
            type: 'weight',
            category: 'general',
            title: `${weightKg} kg`,
            weightGrams: newWeight,
            date: now,
            createdAt: now,
            createdBy: user.id,
          }
          updatedData = {
            ...updatedData,
            records: [...(existing.records || []), weightRecord],
          }
        }
      }

      // Añadir metadata de admin si se está haciendo impersonación
      updatedData = wrapWithAdminMetadata(updatedData, 'Actualización de animal')

      await updateDoc(animalRef, updatedData)
      const fieldsChanged = Object.keys(updateData)
      trackAnimalUpdated({
        field_changed: fieldsChanged[0],
        fields_changed: fieldsChanged,
      })
    } catch (error) {
      console.error('Error actualizando animal:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error actualizando animal'
      dispatch(setError(errorMessage))
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Eliminar animal
  const remove = async (animalId: string) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    setIsLoading(true)
    try {
      const animal = animals.find((a) => a.id === animalId)
      await deleteDoc(doc(db, 'animals', animalId))
      trackAnimalDeleted({ species: animal?.type })
    } catch (error) {
      console.error('Error deleting animal:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar el animal'
      dispatch(setError(errorMessage))
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Marcar destete (wean)
  // engorda → stage directo a 'engorda'
  // reproductor → stage a 'juvenil' (luego pasa a reproductor)
  const wean = async (
    animalId: string,
    opts?: {
      weanDate?: Date
      stageDecision?: WeanNextStage
      notes?: string
    },
  ) => {
    const nextStage: Animal['stage'] = opts?.stageDecision === 'engorda' ? 'engorda' : 'juvenil'
    const updateData: Partial<Animal> = {
      isWeaned: true,
      weanedAt: opts?.weanDate || new Date(),
      stage: nextStage,
    }
    if (opts?.stageDecision) {
      updateData.weaningDestination = opts.stageDecision
    }
    if (opts?.notes) updateData.notes = opts?.notes
    await update(animalId, updateData)

    // Si fue la última cría sin destetar, cerrar sólo la lactancia destinada a crías.
    // Las hembras de leche o doble propósito continúan lactando después del destete.
    const cria = animals.find((animal) => animal.id === animalId)
    if (!cria?.motherId) return
    const mother = animals.find(
      (animal) => animal.id === cria.motherId || animal.animalNumber === cria.motherId,
    )
    if (!mother) return
    const hasOtherUnweanedOffspring = animals.some(
      (animal) =>
        animal.id !== animalId &&
        (animal.motherId === mother.id || animal.motherId === mother.animalNumber) &&
        isActiveCalf(animal),
    )
    if (hasOtherUnweanedOffspring) return

    const weanedMotherAt = opts?.weanDate || new Date()
    const keepsMilking = mother.lactationPurpose === 'dairy' || mother.lactationPurpose === 'dual'
    await update(mother.id, {
      weanedMotherAt,
      ...(keepsMilking
        ? { lactationStatus: 'active' }
        : {
            lactationStatus: 'dry',
            birthedAt: null,
            driedAt: weanedMotherAt,
          }),
    })
  }

  // Buscar animales por ID
  const get = (animalId: string) => {
    return new Promise<Animal | null>((resolve, reject) => {
      if (!user?.id) {
        dispatch(setError('Usuario no autenticado'))
        return resolve(null)
      }

      const animalRef = doc(db, 'animals', animalId)
      getDoc(animalRef)
        .then((docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data() as Animal
            resolve({
              ...data,
              id: docSnapshot.id,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            })
          } else {
            resolve(null)
          }
        })
        .catch((error) => {
          console.error('Error fetching animal:', error)
          const errorMessage = error instanceof Error ? error.message : 'Error al obtener el animal'
          dispatch(setError(errorMessage))
          reject(error)
        })
    })
  }
  /**
   * Listener en tiempo real para animales de la granja.
   * Retorna función unsubscribe para limpiar el listener.
   */
  const getFarmAnimals = (): (() => void) | undefined => {
    if (!currentFarm?.id) return undefined

    const q = query(
      collection(db, 'animals'),
      where('farmId', '==', currentFarm.id),
      orderBy('createdAt', 'desc'),
    )

    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          return { id: d.id, ...d.data() } as Animal
        })
        dispatch(setAnimals(serializeObj(list)))
      },
      (error) => {
        console.error('Animals listener error:', error)
        dispatch(setError('Error sincronizando animales'))
      },
    )
  }

  /**
   * Query one-time para animales por status (muerto, vendido, perdido).
   * No afecta el store global — retorna resultados directamente.
   */
  const queryAnimalsByStatus = useCallback(
    async (status: AnimalStatus): Promise<Animal[]> => {
      if (!currentFarm?.id) return []
      const q = query(
        collection(db, 'animals'),
        where('farmId', '==', currentFarm.id),
        where('status', '==', status),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(q)
      return serializeObj(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Animal[])
    },
    [currentFarm?.id],
  )

  const animalsStats = () => {
    const stats = {
      total: animals.length,
      byType: {} as Record<string, number>,
      byStage: {} as Record<string, number>,
      byGender: {} as Record<string, number>,
    }

    animals.forEach((animal) => {
      // Por tipo
      stats.byType[animal.type] = (stats.byType[animal.type] || 0) + 1

      // Por etapa
      stats.byStage[animal.stage] = (stats.byStage[animal.stage] || 0) + 1

      // Por género
      stats.byGender[animal.gender] = (stats.byGender[animal.gender] || 0) + 1
    })

    return stats
  }

  const animalsFiltered = (
    filters: {
      type?: string
      breed?: string
      stage?: string
      gender?: string
      search?: string
      includeInactive?: boolean
      status?: AnimalStatus
    },
    baseList?: Animal[],
  ) => {
    const list = baseList ?? animals
    return list.filter((animal) => {
      const status: AnimalStatus = animal.status || 'activo'
      // Si se especifica un status, filtrar por ese status y no aplicar la exclusión de inactivos
      if (filters.status) {
        if (status !== filters.status) return false
      } else {
        if (!filters.includeInactive && status !== 'activo') return false
      }
      if (filters.type && animal.type !== filters.type) return false
      if (filters.breed && animal.breed !== filters.breed) return false
      if (filters.stage && computeAnimalStage(animal) !== filters.stage) return false
      if (filters.gender && animal.gender !== filters.gender) return false
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (
          !(
            animal.animalNumber.toLowerCase().includes(searchLower) ||
            animal.id.toLowerCase().includes(searchLower) ||
            animal.name?.toLowerCase().includes(searchLower) ||
            animal.breed?.toLowerCase().includes(searchLower) ||
            animal.notes?.toLowerCase().includes(searchLower)
          )
        )
          return false
      }
      return true
    })
  }

  // Marcar estado del animal (muerto, vendido, perdido, activo)
  const markStatus = async (
    animalId: string,
    data: {
      status: Exclude<AnimalStatus, 'activo'> | 'activo'
      statusAt?: Date
      statusNotes?: string
      soldInfo?: Animal['soldInfo']
      lostInfo?: Animal['lostInfo']
    },
  ) => {
    const effectiveStatusAt = data.statusAt || new Date()
    const updateData: Partial<Animal> = {
      status: data.status,
      statusAt: effectiveStatusAt,
    }

    if (data.statusNotes) updateData.statusNotes = data.statusNotes
    if (data.soldInfo) updateData.soldInfo = data.soldInfo
    if (data.lostInfo) updateData.lostInfo = data.lostInfo
    await update(animalId, updateData)
  }

  // Marcar como encontrado si estaba perdido
  const markFound = async (animalId: string) => {
    try {
      await markStatus(animalId, {
        status: 'activo',
        statusNotes: 'animal encontrado',
      })
    } catch {
      console.log('No se pudo marcar como encontrado el animal:', animalId)
    }
  }

  // === FUNCIONES DE HISTORIAL CLÍNICO (LEGACY) ===

  // Helper para limpiar campos undefined
  const cleanUndefinedFields = <T extends Record<string, any>>(obj: T): T => {
    const cleaned = {} as T
    Object.keys(obj).forEach((key) => {
      if (obj[key] !== undefined) {
        cleaned[key as keyof T] = obj[key]
      }
    })
    return cleaned
  }

  // (Eliminadas en favor del sistema unificado de registros)

  // === FUNCIONES DE EVENTOS DE SALUD (LEGACY) ===
  // Eliminadas en favor del sistema unificado de registros

  // === SISTEMA UNIFICADO DE REGISTROS ===

  // Agregar registro unificado
  const addRecord = async (
    animalId: string,
    recordData: Omit<AnimalRecord, 'id' | 'createdAt' | 'createdBy'>,
  ) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    const animal = animals.find((a) => a.id === animalId)
    if (!animal) {
      dispatch(setError('Animal no encontrado'))
      return
    }

    const cleanedRecordData = cleanUndefinedFields(recordData)

    const newRecord: AnimalRecord = cleanUndefinedFields({
      ...cleanedRecordData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      createdBy: user.id,
    })

    const updatedRecords = [...(animal.records || []), newRecord]

    await update(animalId, { records: updatedRecords })
    trackRecordCreated({
      record_type: newRecord.type,
      category: newRecord.category,
    })
    console.log('Registro agregado al animal:', animalId)
  }

  // Actualizar registro
  const updateRecord = async (
    animalId: string,
    recordId: string,
    updateData: Partial<AnimalRecord>,
  ) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    const animal = animals.find((a) => a.id === animalId)
    if (!animal || !animal.records) {
      dispatch(setError('Animal o registros no encontrados'))
      return
    }

    const cleanedUpdateData = cleanUndefinedFields(updateData)

    const updatedRecords = animal.records.map((record) =>
      record.id === recordId
        ? cleanUndefinedFields({
            ...record,
            ...cleanedUpdateData,
            updatedAt: new Date(),
          })
        : record,
    )

    await update(animalId, { records: updatedRecords })
    console.log('Registro actualizado:', recordId)
  }

  // Eliminar registro
  const removeRecord = async (animalId: string, recordId: string) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    const animal = animals.find((a) => a.id === animalId)
    if (!animal || !animal.records) {
      dispatch(setError('Animal o registros no encontrados'))
      return
    }

    const removedRecord = animal.records.find((record) => record.id === recordId)
    const updatedRecords = animal.records.filter((record) => record.id !== recordId)

    await update(animalId, {
      records: updatedRecords,
      ...(removedRecord?.type === 'weight' ? { weight: latestWeightGrams(updatedRecords) } : {}),
    })
    console.log('Registro eliminado:', recordId)
  }

  // Resolver caso clínico
  const resolveRecord = async (animalId: string, recordId: string, treatment?: string) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    const updateData: Partial<AnimalRecord> = {
      isResolved: true,
      resolvedDate: new Date(),
      ...(treatment ? { treatment } : {}),
    }

    await updateRecord(animalId, recordId, updateData)
    console.log('Caso clínico resuelto:', recordId)
  }

  // Reabrir caso clínico
  const reopenRecord = async (animalId: string, recordId: string) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    const animal = animals.find((a) => a.id === animalId)
    if (!animal || !animal.records) {
      dispatch(setError('Animal o registros no encontrados'))
      return
    }

    const updatedRecords = animal.records.map((record) => {
      if (record.id === recordId) {
        const { resolvedDate: _resolvedDate, ...recordWithoutResolvedDate } = record
        return cleanUndefinedFields({
          ...recordWithoutResolvedDate,
          isResolved: false,
          updatedAt: new Date(),
        })
      }
      return record
    })

    await update(animalId, { records: updatedRecords })
    console.log('Caso clínico reabierto:', recordId)
  }

  // Agregar registro masivo (para vacunas/tratamientos)
  const addBulkRecord = async (
    animalIds: string[],
    recordData: Omit<
      AnimalRecord,
      'id' | 'createdAt' | 'createdBy' | 'appliedToAnimals' | 'isBulkApplication'
    >,
    opts?: { onProgress?: (current: number, total: number) => void },
  ) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    if (animalIds.length === 0) {
      dispatch(setError('No se han seleccionado animales'))
      return
    }

    const cleanedRecordData = cleanUndefinedFields(recordData)

    const newRecord: AnimalRecord = cleanUndefinedFields({
      ...cleanedRecordData,
      id: crypto.randomUUID(),
      appliedToAnimals: animalIds,
      isBulkApplication: true,
      createdAt: new Date(),
      createdBy: user.id,
    })

    const existingRecordsById = new Map<string, AnimalRecord[]>()
    for (const id of animalIds) {
      const animal = animals.find((a) => a.id === id)
      if (animal) existingRecordsById.set(id, animal.records || [])
    }

    await batchUpdateAnimals(
      animalIds.filter((id) => existingRecordsById.has(id)),
      ({ id }) => ({
        records: [...(existingRecordsById.get(id) || []), newRecord],
      }),
      { onProgress: opts?.onProgress },
    )
    console.log('Registro masivo aplicado a:', animalIds.length, 'animales')
  }

  // Obtener próximos vencimientos de registros de salud
  const getUpcomingHealthRecords = (daysAhead: number = 30) => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead)

    const upcoming: Array<{
      animal: Animal
      record: AnimalRecord
      daysUntilDue: number
    }> = []

    animals.forEach((animal) => {
      if (animal.records) {
        animal.records.forEach((record) => {
          if (record.nextDueDate && record.type === 'health') {
            const dueDate = new Date(record.nextDueDate)
            if (dueDate <= cutoffDate) {
              const daysUntilDue = Math.ceil(
                (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              )
              upcoming.push({
                animal,
                record,
                daysUntilDue,
              })
            }
          }
        })
      }
    })

    return upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue)
  }

  // Buscar animal en Firestore por coincidencia exacta (animalNumber, name o doc ID)
  // Ignora el status — trae cualquier animal de la granja
  const searchExact = useCallback(
    async (term: string): Promise<Animal[]> => {
      if (!currentFarm?.id || !term.trim()) return []

      const trimmed = term.trim()
      const results: Animal[] = []
      const seenIds = new Set<string>()

      // 1. Buscar por doc ID directo
      try {
        const docSnap = await getDoc(doc(db, 'animals', trimmed))
        if (docSnap.exists()) {
          const data = docSnap.data()
          if (data.farmId === currentFarm.id) {
            const animal = serializeObj({ id: docSnap.id, ...data } as Animal)
            results.push(animal)
            seenIds.add(animal.id)
          }
        }
      } catch {
        // ID invalido, ignorar
      }

      // 2. Buscar por animalNumber exacto
      try {
        const q = query(
          collection(db, 'animals'),
          where('farmId', '==', currentFarm.id),
          where('animalNumber', '==', trimmed),
        )
        const snap = await getDocs(q)
        for (const d of snap.docs) {
          if (!seenIds.has(d.id)) {
            results.push(serializeObj({ id: d.id, ...d.data() } as Animal))
            seenIds.add(d.id)
          }
        }
      } catch (e) {
        console.error('searchExact animalNumber error:', e)
      }

      // 3. Buscar por name exacto
      try {
        const q = query(
          collection(db, 'animals'),
          where('farmId', '==', currentFarm.id),
          where('name', '==', trimmed),
        )
        const snap = await getDocs(q)
        for (const d of snap.docs) {
          if (!seenIds.has(d.id)) {
            results.push(serializeObj({ id: d.id, ...d.data() } as Animal))
            seenIds.add(d.id)
          }
        }
      } catch (e) {
        console.error('searchExact name error:', e)
      }

      return results
    },
    [currentFarm?.id],
  )

  // Agregar entrada de peso al historial del animal
  const addWeightEntry = async (
    animalId: string,
    entry: { date: Date; weight: number; notes?: string },
  ) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    const animal = animals.find((a) => a.id === animalId)
    if (!animal) {
      dispatch(setError('Animal no encontrado'))
      return
    }

    // El pesaje vive únicamente en records[].
    const weightKg = (entry.weight / 1000).toFixed(1)
    const newRecord = {
      id: crypto.randomUUID(),
      type: 'weight' as const,
      category: 'general' as const,
      title: `${weightKg} kg`,
      weightGrams: entry.weight,
      date: entry.date,
      createdAt: new Date(),
      createdBy: user.id,
      ...(entry.notes ? { notes: entry.notes } : {}),
    }
    const updatedRecords = [...(animal.records || []), newRecord]

    await update(animalId, {
      weight: entry.weight,
      records: updatedRecords,
    })
    console.log('Peso registrado para animal:', animalId, entry.weight, 'g')
  }

  // Actualizar un registro de peso dentro del historial unificado.
  const updateWeightRecord = async (
    animalId: string,
    recordId: string,
    newEntry: { date: Date; weight: number; notes?: string },
  ) => {
    const animal = animals.find((a) => a.id === animalId)
    if (!animal) return

    const updatedRecords = (animal.records || []).map((record) => {
      if (record.id === recordId && record.type === 'weight') {
        return {
          ...record,
          date: newEntry.date,
          weightGrams: newEntry.weight,
          title: `${(newEntry.weight / 1000).toFixed(1)} kg`,
          ...(newEntry.notes ? { notes: newEntry.notes } : {}),
          updatedAt: new Date(),
        }
      }
      return record
    })

    await update(animalId, {
      weight: latestWeightGrams(updatedRecords),
      records: updatedRecords,
    })
  }

  const addMilkEntry = async (
    animalId: string,
    entry: Pick<AnimalMilkRecord, 'date' | 'amountMl' | 'session' | 'notes'>,
  ) => {
    if (!user?.id) throw new Error('Usuario no autenticado')
    const animal = animals.find((candidate) => candidate.id === animalId)
    if (!animal) throw new Error('Animal no encontrado')
    if (animal.gender !== 'hembra') throw new Error('Sólo se puede registrar leche en hembras')
    if (!Number.isFinite(entry.amountMl) || entry.amountMl <= 0) {
      throw new Error('La cantidad de leche debe ser mayor que cero')
    }
    if (Number.isNaN(entry.date.getTime())) {
      throw new Error('Selecciona una fecha válida')
    }
    const milkEntryDay = new Date(entry.date)
    const today = new Date()
    milkEntryDay.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    if (milkEntryDay.getTime() > today.getTime()) {
      throw new Error('La fecha del ordeño no puede estar en el futuro')
    }

    const amountMl = Math.round(entry.amountMl)
    const newRecord: AnimalMilkRecord = {
      id: crypto.randomUUID(),
      type: 'milk',
      category: 'general',
      title: `Ordeño · ${(amountMl / 1000).toLocaleString('es-MX', { maximumFractionDigits: 3 })} L`,
      date: entry.date,
      amountMl,
      session: entry.session,
      ...(entry.notes ? { notes: entry.notes } : {}),
      createdAt: new Date(),
      createdBy: user.id,
    }
    const nextPurpose =
      animal.lactationPurpose === 'offspring' ? 'dual' : (animal.lactationPurpose ?? 'dairy')

    await update(animalId, {
      records: [...(animal.records || []), newRecord],
      lactationStatus: 'active',
      lactationPurpose: nextPurpose,
      driedAt: null,
    })
    trackRecordCreated({ record_type: 'milk', category: 'general' })
  }

  const endLactation = async (animalId: string, endedAt = new Date()) => {
    if (!user?.id) throw new Error('Usuario no autenticado')
    const animal = animals.find((candidate) => candidate.id === animalId)
    if (!animal) throw new Error('Animal no encontrado')
    if (animal.gender !== 'hembra') throw new Error('Sólo las hembras pueden tener lactancia')
    const hasUnweanedOffspring = animals.some(
      (candidate) =>
        (candidate.motherId === animal.id || candidate.motherId === animal.animalNumber) &&
        isActiveCalf(candidate),
    )
    if (hasUnweanedOffspring) {
      throw new Error('Primero desteta las crías activas antes de finalizar la lactancia.')
    }

    await update(animalId, {
      lactationStatus: 'dry',
      driedAt: endedAt,
      birthedAt: null,
    })
  }

  // Asignar (o quitar) el área física actual de un animal.
  // areaId null/'' => sin área. No-op si ya está en esa área.
  const assignArea = async (animalId: string, areaId: string | null) => {
    const nextAreaId = areaId || null
    const animal = animals.find((a) => a.id === animalId)
    if (animal && (animal.currentAreaId ?? null) === nextAreaId) return
    await update(animalId, {
      currentAreaId: nextAreaId,
      currentAreaAssignedAt: nextAreaId ? new Date() : null,
    })
  }

  return {
    animals,
    isLoading,
    create,
    update,
    remove,
    assignArea,
    get,
    getFarmAnimals,
    queryAnimalsByStatus,
    animalsStats,
    animalsFiltered,
    wean,
    markStatus,
    markFound,
    addRecord,
    updateRecord,
    removeRecord,
    resolveRecord,
    reopenRecord,
    addBulkRecord,
    addWeightEntry,
    updateWeightRecord,
    addMilkEntry,
    endLactation,
    getUpcomingHealthRecords,
    searchExact,
  }
}

export type { WeanNextStage } from '@/types/animals'
