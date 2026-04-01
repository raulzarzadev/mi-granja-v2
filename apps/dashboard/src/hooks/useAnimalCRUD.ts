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
import { setAnimals } from '@/features/animals/animalsSlice'
import { setError } from '@/features/auth/authSlice'
import { serializeObj } from '@/features/libs/serializeObj'
import { RootState } from '@/features/store'
import { useAdminActions } from '@/lib/adminActions'
import { db } from '@/lib/firebase'
import { computeAnimalStage } from '@/lib/animal-utils'
import { Animal, AnimalRecord, AnimalStatus, WeanNextStage } from '@/types/animals'

/**
 * Hook personalizado para el manejo de animales
 * Gestiona CRUD operations con Firestore y estado global con Redux
 */

export const useAnimalCRUD = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.auth)
  const { animals } = useSelector((state: RootState) => state.animals)
  const { currentFarm } = useSelector((state: RootState) => state.farm)
  const { wrapWithAdminMetadata } = useAdminActions()

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

      // Añadir metadata de admin si se está haciendo impersonación
      newAnimal = wrapWithAdminMetadata(newAnimal, 'Creación de animal')

      const docRef = await addDoc(collection(db, 'animals'), newAnimal)
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
      let updatedData = {
        ...updateData,
        updatedAt: new Date(),
      }

      // Añadir metadata de admin si se está haciendo impersonación
      updatedData = wrapWithAdminMetadata(updatedData, 'Actualización de animal')

      await updateDoc(animalRef, updatedData)
    } catch (error) {
      console.error('Error actualizando animal:', error)
      dispatch(setError('Error actualizando animal'))
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
      await deleteDoc(doc(db, 'animals', animalId))
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
          const animal = { id: d.id, ...d.data() } as Animal
          return { ...animal, stage: computeAnimalStage(animal) }
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
  const queryAnimalsByStatus = async (status: AnimalStatus): Promise<Animal[]> => {
    if (!currentFarm?.id) return []
    const q = query(
      collection(db, 'animals'),
      where('farmId', '==', currentFarm.id),
      where('status', '==', status),
      orderBy('createdAt', 'desc'),
    )
    const snapshot = await getDocs(q)
    return serializeObj(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Animal[])
  }

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

    const updatedRecords = animal.records.filter((record) => record.id !== recordId)

    await update(animalId, { records: updatedRecords })
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

    // Aplicar el registro a todos los animales seleccionados
    const updatePromises = animalIds.map(async (animalId) => {
      const animal = animals.find((a) => a.id === animalId)
      if (animal) {
        const updatedRecords = [...(animal.records || []), newRecord]
        await update(animalId, { records: updatedRecords })
      }
    })

    await Promise.all(updatePromises)
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

    const newEntry = {
      date: entry.date,
      weight: entry.weight,
      ...(entry.notes ? { notes: entry.notes } : {}),
    }

    const updatedWeightRecords = [...(animal.weightRecords || []), newEntry]

    // También crear un AnimalRecord de tipo 'weight' para que aparezca en la tabla de registros
    const weightKg = (entry.weight / 1000).toFixed(1)
    const newRecord = {
      id: crypto.randomUUID(),
      type: 'weight' as const,
      category: 'general' as const,
      title: `${weightKg} kg`,
      date: entry.date,
      createdAt: new Date(),
      createdBy: user.id,
      ...(entry.notes ? { notes: entry.notes } : {}),
    }
    const updatedRecords = [...(animal.records || []), newRecord]

    await update(animalId, {
      weight: entry.weight,
      weightRecords: updatedWeightRecords,
      records: updatedRecords,
    })
    console.log('Peso registrado para animal:', animalId, entry.weight, 'g')
  }

  // Actualizar una entrada de peso existente en weightRecords (match por fecha original)
  const updateWeightRecord = async (
    animalId: string,
    originalDate: Date | string | number,
    newEntry: { date: Date; weight: number; notes?: string },
  ) => {
    const animal = animals.find((a) => a.id === animalId)
    if (!animal) return

    const origTime = new Date(originalDate).getTime()
    const updatedWeightRecords = (animal.weightRecords || []).map((wr) => {
      if (new Date(wr.date).getTime() === origTime) {
        return {
          date: newEntry.date,
          weight: newEntry.weight,
          ...(newEntry.notes ? { notes: newEntry.notes } : {}),
        }
      }
      return wr
    })

    // Actualizar weight al peso más reciente por fecha
    const sorted = [...updatedWeightRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    const latestWeight = sorted[0]?.weight

    await update(animalId, {
      ...(latestWeight !== undefined ? { weight: latestWeight } : {}),
      weightRecords: updatedWeightRecords,
    })
  }

  return {
    animals,
    isLoading,
    create,
    update,
    remove,
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
    getUpcomingHealthRecords,
    searchExact,
  }
}

export type { WeanNextStage } from '@/types/animals'
