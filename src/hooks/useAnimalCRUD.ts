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
import { Animal, AnimalStatus, NoteEntry, ClinicalEntry } from '@/types/animals'
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

  // === FUNCIONES DE NOTAS ===

  // Agregar nota a un animal
  const addNote = async (animalId: string, noteText: string) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    const animal = animals.find((a) => a.id === animalId)
    if (!animal) {
      dispatch(setError('Animal no encontrado'))
      return
    }

    const newNote: NoteEntry = {
      id: crypto.randomUUID(),
      text: noteText.trim(),
      createdAt: new Date(),
      createdBy: user.id
    }

    const updatedNotesLog = [...(animal.notesLog || []), newNote]

    await update(animalId, { notesLog: updatedNotesLog })
    console.log('Nota agregada al animal:', animalId)
  }

  // Actualizar nota existente
  const updateNote = async (
    animalId: string,
    noteId: string,
    newText: string
  ) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    const animal = animals.find((a) => a.id === animalId)
    if (!animal || !animal.notesLog) {
      dispatch(setError('Animal o notas no encontradas'))
      return
    }

    const updatedNotesLog = animal.notesLog.map((note) =>
      note.id === noteId
        ? { ...note, text: newText.trim(), updatedAt: new Date() }
        : note
    )

    await update(animalId, { notesLog: updatedNotesLog })
    console.log('Nota actualizada:', noteId)
  }

  // Eliminar nota
  const removeNote = async (animalId: string, noteId: string) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    const animal = animals.find((a) => a.id === animalId)
    if (!animal || !animal.notesLog) {
      dispatch(setError('Animal o notas no encontradas'))
      return
    }

    const updatedNotesLog = animal.notesLog.filter((note) => note.id !== noteId)

    await update(animalId, { notesLog: updatedNotesLog })
    console.log('Nota eliminada:', noteId)
  }

  // === FUNCIONES DE HISTORIAL CLÍNICO ===

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

  // Agregar entrada al historial clínico
  const addClinicalEntry = async (
    animalId: string,
    entryData: Omit<
      ClinicalEntry,
      'id' | 'createdAt' | 'createdBy' | 'isResolved'
    >
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

    // Limpiar campos undefined del entryData
    const cleanedEntryData = cleanUndefinedFields(entryData)

    const newEntry: ClinicalEntry = cleanUndefinedFields({
      ...cleanedEntryData,
      id: crypto.randomUUID(),
      isResolved: false,
      createdAt: new Date(),
      createdBy: user.id
    })

    const updatedClinicalHistory = [...(animal.clinicalHistory || []), newEntry]

    await update(animalId, { clinicalHistory: updatedClinicalHistory })
    console.log('Entrada clínica agregada al animal:', animalId)
  }

  // Resolver entrada clínica (marcar como resuelta)
  const resolveClinicalEntry = async (
    animalId: string,
    entryId: string,
    resolvedDate?: Date
  ) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    const animal = animals.find((a) => a.id === animalId)
    if (!animal || !animal.clinicalHistory) {
      dispatch(setError('Animal o historial clínico no encontrado'))
      return
    }

    const updatedClinicalHistory = animal.clinicalHistory.map((entry) =>
      entry.id === entryId
        ? cleanUndefinedFields({
            ...entry,
            isResolved: true,
            resolvedDate: resolvedDate || new Date(),
            updatedAt: new Date()
          })
        : entry
    )

    await update(animalId, { clinicalHistory: updatedClinicalHistory })
    console.log('Entrada clínica resuelta:', entryId)
  }

  // Reactivar entrada clínica (desmarcar como resuelta)
  const reopenClinicalEntry = async (animalId: string, entryId: string) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    const animal = animals.find((a) => a.id === animalId)
    if (!animal || !animal.clinicalHistory) {
      dispatch(setError('Animal o historial clínico no encontrado'))
      return
    }

    const updatedClinicalHistory = animal.clinicalHistory.map((entry) => {
      if (entry.id === entryId) {
        const updatedEntry = {
          ...entry,
          isResolved: false,
          updatedAt: new Date()
        }
        // Eliminar resolvedDate del objeto completamente
        delete (updatedEntry as any).resolvedDate
        return cleanUndefinedFields(updatedEntry)
      }
      return entry
    })

    await update(animalId, { clinicalHistory: updatedClinicalHistory })
    console.log('Entrada clínica reabierta:', entryId)
  }

  // Actualizar entrada clínica
  const updateClinicalEntry = async (
    animalId: string,
    entryId: string,
    updateData: Partial<ClinicalEntry>
  ) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    const animal = animals.find((a) => a.id === animalId)
    if (!animal || !animal.clinicalHistory) {
      dispatch(setError('Animal o historial clínico no encontrado'))
      return
    }

    // Limpiar campos undefined del updateData
    const cleanedUpdateData = cleanUndefinedFields(updateData)

    const updatedClinicalHistory = animal.clinicalHistory.map((entry) =>
      entry.id === entryId
        ? cleanUndefinedFields({
            ...entry,
            ...cleanedUpdateData,
            updatedAt: new Date()
          })
        : entry
    )

    await update(animalId, { clinicalHistory: updatedClinicalHistory })
    console.log('Entrada clínica actualizada:', entryId)
  }

  // Eliminar entrada clínica
  const removeClinicalEntry = async (animalId: string, entryId: string) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    const animal = animals.find((a) => a.id === animalId)
    if (!animal || !animal.clinicalHistory) {
      dispatch(setError('Animal o historial clínico no encontrado'))
      return
    }

    const updatedClinicalHistory = animal.clinicalHistory.filter(
      (entry) => entry.id !== entryId
    )

    await update(animalId, { clinicalHistory: updatedClinicalHistory })
    console.log('Entrada clínica eliminada:', entryId)
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
    // Funciones de notas
    addNote,
    updateNote,
    removeNote,
    // Funciones de historial clínico
    addClinicalEntry,
    resolveClinicalEntry,
    reopenClinicalEntry,
    updateClinicalEntry,
    removeClinicalEntry
  }
}
