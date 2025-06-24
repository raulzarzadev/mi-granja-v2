'use client'

import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  orderBy
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { RootState } from '@/features/store'
import {
  setAnimals,
  setLoading,
  setError
} from '@/features/animals/animalsSlice'
import { Animal } from '@/types'
import { serializeObj } from '@/features/libs/serializeObj'

/**
 * Hook personalizado para el manejo de animales
 * Gestiona CRUD operations con Firestore y estado global con Redux
 */
export const useAnimals = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.auth)
  const { animals, isLoading, error } = useSelector(
    (state: RootState) => state.animals
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Suscribirse a los animales del usuario en tiempo real
  useEffect(() => {
    if (!user?.id) return

    dispatch(setLoading(true))

    const animalsRef = collection(db, 'animals')
    const q = query(
      animalsRef,
      where('farmerId', '==', user.id),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const animalsList: Animal[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          animalsList.push({
            id: doc.id,
            farmerId: data.farmerId,
            animalId: data.animalId,
            type: data.type,
            stage: data.stage,
            weight: data.weight,
            age: data.age,
            birthDate: data.birthDate?.toDate(),
            gender: data.gender,
            motherId: data.motherId,
            fatherId: data.fatherId,
            notes: data.notes,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          })
        })
        const serializedAnimals = serializeObj(animalsList)
        dispatch(setAnimals(serializedAnimals))
        dispatch(setLoading(false))
      },
      (error) => {
        console.error('Error fetching animals:', error)
        dispatch(setError('Error al cargar los animales'))
        dispatch(setLoading(false))
      }
    )

    return () => unsubscribe()
  }, [user?.id, dispatch])

  // Crear nuevo animal
  const createAnimal = async (
    animalData: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    setIsSubmitting(true)
    try {
      const now = new Date()
      const newAnimal = {
        ...animalData,
        farmerId: user.id,
        createdAt: now,
        updatedAt: now
      }

      const docRef = await addDoc(collection(db, 'animals'), newAnimal)

      // No necesitamos dispatch aquí porque el listener en tiempo real se encargará
      console.log('Animal creado con ID:', docRef.id)

      return docRef.id
    } catch (error) {
      console.error('Error creating animal:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Error al crear el animal'
      dispatch(setError(errorMessage))
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Actualizar animal existente
  const updateAnimalData = async (
    animalId: string,
    updateData: Partial<Animal>
  ) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    setIsSubmitting(true)
    try {
      const animalRef = doc(db, 'animals', animalId)
      const updatedData = {
        ...updateData,
        updatedAt: new Date()
      }

      await updateDoc(animalRef, updatedData)

      // No necesitamos dispatch aquí porque el listener en tiempo real se encargará
      console.log('Animal actualizado:', animalId)
    } catch (error) {
      console.error('Error updating animal:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Error al actualizar el animal'
      dispatch(setError(errorMessage))
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Eliminar animal
  const deleteAnimal = async (animalId: string) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    setIsSubmitting(true)
    try {
      await deleteDoc(doc(db, 'animals', animalId))

      // No necesitamos dispatch aquí porque el listener en tiempo real se encargará
      console.log('Animal eliminado:', animalId)
    } catch (error) {
      console.error('Error deleting animal:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Error al eliminar el animal'
      dispatch(setError(errorMessage))
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Obtener estadísticas básicas
  const getStats = () => {
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

  // Buscar animales por ID
  const findAnimalById = (animalId: string) => {
    return animals.find((animal) => animal.animalId === animalId)
  }

  // Filtrar animales
  const filterAnimals = (filters: {
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
          animal.animalId.toLowerCase().includes(searchLower) ||
          animal.notes?.toLowerCase().includes(searchLower) ||
          false
        )
      }
      return true
    })
  }

  return {
    animals,
    isLoading,
    error,
    isSubmitting,
    createAnimal,
    updateAnimal: updateAnimalData,
    deleteAnimal,
    getStats,
    findAnimalById,
    filterAnimals
  }
}
