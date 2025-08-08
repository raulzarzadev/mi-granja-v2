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
import { Animal } from '@/types/animals'
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

      dispatch(updateAnimal({ id: animalId, data: updateData }))

      console.log('Animal actualizado:', animalId)
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

  // animasl stats =

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

  const animalsFiltered = (filters: {
    type?: string
    stage?: string
    gender?: string
    search?: string
  }) => {
    return animals.filter((animal) => {
      if (filters.type && animal.type !== filters.type) return false
      if (filters.stage && animal.stage !== filters.stage) return false
      if (filters.gender && animal.gender !== filters.gender) return false
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        return (
          animal.animalNumber.toLowerCase().includes(searchLower) ||
          animal.notes?.toLowerCase().includes(searchLower) ||
          false
        )
      }
      return true
    })
  }

  // Migrar animales al nuevo esquema de animalNumber

  return {
    isLoading,
    animals,
    animalsFiltered,
    animalsStats,
    create,
    update,
    remove,
    get,
    getUserAnimals
  }
}
