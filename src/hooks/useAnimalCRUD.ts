'use client'

import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  getDocs
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { RootState } from '@/features/store'
import { setError } from '@/features/auth/authSlice'
import {
  addAnimal,
  updateAnimal,
  removeAnimal,
  setAnimals
} from '@/features/animals/animalsSlice'
import { serializeObj } from '@/features/libs/serializeObj'
import { Animal, AnimalStatus, AnimalRecord } from '@/types/animals'
import { useAdminActions } from '@/lib/adminActions'

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
    animalData: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
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
        updatedAt: now
      }

      // Añadir metadata de admin si se está haciendo impersonación
      newAnimal = wrapWithAdminMetadata(newAnimal, 'Creación de animal')

      const docRef = await addDoc(collection(db, 'animals'), newAnimal)

      dispatch(addAnimal(serializeObj({ id: docRef.id, ...newAnimal })))
      console.log('Animal creado con ID:', docRef.id)

      return docRef.id
    } catch (error) {
      console.error('Error creating animal:', error, { animalData })
      const errorMessage =
        error instanceof Error ? error.message : 'Error al crear el animal'
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
        updatedAt: new Date()
      }

      // Añadir metadata de admin si se está haciendo impersonación
      updatedData = wrapWithAdminMetadata(
        updatedData,
        'Actualización de animal'
      )

      await updateDoc(animalRef, updatedData)
      // Actualizar Redux con datos serializados
      dispatch(
        updateAnimal({
          id: animalId,
          data: serializeObj(updatedData)
        })
      )

      console.log('Animal actualizado:', animalId, updatedData)
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
      dispatch(removeAnimal(animalId)) // Actualizar estado global
      console.log('Animal eliminado:', animalId)
    } catch (error) {
      console.error('Error deleting animal:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Error al eliminar el animal'
      dispatch(setError(errorMessage))
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Marcar destete (wean)
  const wean = async (
    animalId: string,
    opts?: { stageDecision?: 'engorda' | 'reproductor'; notes?: string }
  ) => {
    const stageMap: Record<string, Animal['stage'] | undefined> = {
      engorda: 'engorda',
      reproductor: 'reproductor'
    }
    const updateData: Partial<Animal> = {
      isWeaned: true,
      weanedAt: new Date(),
      weaningNotes: opts?.notes
    }
    if (opts?.stageDecision) {
      const nextStage = stageMap[opts.stageDecision]
      if (nextStage) updateData.stage = nextStage
    }
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
              updatedAt: data.updatedAt
            })
          } else {
            resolve(null)
          }
        })
        .catch((error) => {
          console.error('Error fetching animal:', error)
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Error al obtener el animal'
          dispatch(setError(errorMessage))
          reject(error)
        })
    })
  }
  /**
   * @deprecated  you should get animals by farm
   */
  const getUserAnimals = () => {
    return new Promise<Animal[]>(async (resolve, reject) => {
      if (!user?.id) {
        dispatch(setError('Usuario no autenticado'))
        return resolve([])
      }

      const constraints = [where('farmerId', '==', user.id)]
      if (currentFarm?.id)
        constraints.push(where('farmId', '==', currentFarm.id))
      const q = query(
        collection(db, 'animals'),
        ...constraints,
        orderBy('createdAt', 'desc')
      )

      try {
        const querySnapshot = await getDocs(q)
        const animals = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Animal[]
        dispatch(setAnimals(serializeObj(animals)))
        resolve(animals)
      } catch (error) {
        console.error('Error fetching user animals:', error)
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Error al obtener los animales del usuario'
        dispatch(setError(errorMessage))
        reject(error)
      }
    })
  }

  const getFarmAnimals = (opts?: { status?: AnimalStatus }) => {
    return new Promise<Animal[]>(async (resolve, reject) => {
      if (!user?.id) {
        dispatch(setError('Usuario no autenticado'))
        return resolve([])
      }

      const constraints = [] as any[]
      if (currentFarm?.id)
        constraints.push(where('farmId', '==', currentFarm.id))
      if (opts?.status) constraints.push(where('status', '==', opts.status))
      const q = query(
        collection(db, 'animals'),
        ...constraints,
        orderBy('createdAt', 'desc')
      )

      try {
        const querySnapshot = await getDocs(q)
        const animals = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Animal[]

        if (opts?.status) {
          // Cuando filtramos por estado, devolvemos resultados sin mutar el store global
          resolve(serializeObj(animals))
        } else {
          dispatch(setAnimals(serializeObj(animals)))
          resolve(animals)
        }
      } catch (error) {
        console.error('Error fetching farm animals:', error)
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Error al obtener los animales de la granja'
        dispatch(setError(errorMessage))
        reject(error)
      }
    })
  }

  const animalsStats = () => {
    const stats = {
      total: animals.length,
      byType: {} as Record<string, number>,
      byStage: {} as Record<string, number>,
      byGender: {} as Record<string, number>
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
      stage?: string
      gender?: string
      search?: string
      includeInactive?: boolean
      status?: AnimalStatus
    },
    baseList?: Animal[]
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
      if (filters.stage && animal.stage !== filters.stage) return false
      if (filters.gender && animal.gender !== filters.gender) return false
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (
          !(
            animal.animalNumber.toLowerCase().includes(searchLower) ||
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
    }
  ) => {
    const effectiveStatusAt = data.statusAt || new Date()
    const updateData: Partial<Animal> = {
      status: data.status,
      statusAt: effectiveStatusAt
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
        statusNotes: 'animal encontrado'
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
    recordData: Omit<AnimalRecord, 'id' | 'createdAt' | 'createdBy'>
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
      createdBy: user.id
    })

    const updatedRecords = [...(animal.records || []), newRecord]

    await update(animalId, { records: updatedRecords })
    console.log('Registro agregado al animal:', animalId)
  }

  // Actualizar registro
  const updateRecord = async (
    animalId: string,
    recordId: string,
    updateData: Partial<AnimalRecord>
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
            updatedAt: new Date()
          })
        : record
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

    const updatedRecords = animal.records.filter(
      (record) => record.id !== recordId
    )

    await update(animalId, { records: updatedRecords })
    console.log('Registro eliminado:', recordId)
  }

  // Resolver caso clínico
  const resolveRecord = async (
    animalId: string,
    recordId: string,
    treatment?: string
  ) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    const updateData: Partial<AnimalRecord> = {
      isResolved: true,
      resolvedDate: new Date(),
      ...(treatment ? { treatment } : {})
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
        const { resolvedDate: _resolvedDate, ...recordWithoutResolvedDate } =
          record
        return cleanUndefinedFields({
          ...recordWithoutResolvedDate,
          isResolved: false,
          updatedAt: new Date()
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
      | 'id'
      | 'createdAt'
      | 'createdBy'
      | 'appliedToAnimals'
      | 'isBulkApplication'
    >
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
      createdBy: user.id
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
                (dueDate.getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24)
              )
              upcoming.push({
                animal,
                record,
                daysUntilDue
              })
            }
          }
        })
      }
    })

    return upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue)
  }

  // Migrar animales al nuevo esquema de animalNumber

  return {
    animals,
    isLoading,
    create,
    update,
    remove,
    get,
    getUserAnimals,
    getFarmAnimals,
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
    getUpcomingHealthRecords
  }
}
