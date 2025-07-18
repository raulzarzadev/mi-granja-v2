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
import { addAnimal, updateAnimal } from '@/features/animals/animalsSlice'
import { serializeObj } from '@/features/libs/serializeObj'
import { Animal } from '@/types/animals'

/**
 * Hook personalizado para el manejo de animales
 * Gestiona CRUD operations con Firestore y estado global con Redux
 */
export const useAnimalCRUD = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.auth)

  const [isLoading, setIsLoading] = useState(false)

  const create = async (
    animalData: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    setIsLoading(true)
    try {
      const now = new Date()
      const newAnimal = {
        ...animalData,
        farmerId: user.id,
        createdAt: now,
        updatedAt: now
      }

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
  const update = async (animalNumber: string, updateData: Partial<Animal>) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    setIsLoading(true)
    try {
      const animalRef = doc(db, 'animals', animalNumber)
      const updatedData = {
        ...updateData,
        updatedAt: new Date()
      }

      // Usar la nueva acción para actualizaciones parciales
      dispatch(updateAnimal({ id: animalNumber, data: updateData }))

      await updateDoc(animalRef, updatedData)

      // No necesitamos dispatch aquí porque el listener en tiempo real se encargará
      console.log('Animal actualizado:', animalNumber)
    } catch (error) {
      console.error('Error updating animal:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Error al actualizar el animal'
      dispatch(setError(errorMessage))
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Eliminar animal
  const remove = async (animalNumber: string) => {
    if (!user?.id) {
      dispatch(setError('Usuario no autenticado'))
      return
    }

    setIsLoading(true)
    try {
      await deleteDoc(doc(db, 'animals', animalNumber))

      // No necesitamos dispatch aquí porque el listener en tiempo real se encargará
      console.log('Animal eliminado:', animalNumber)
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
  const get = (animalNumber: string) => {
    return new Promise<Animal | null>((resolve, reject) => {
      if (!user?.id) {
        dispatch(setError('Usuario no autenticado'))
        return resolve(null)
      }

      const animalRef = doc(db, 'animals', animalNumber)
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

      const q = query(
        collection(db, 'animals'),
        where('farmerId', '==', user.id),
        orderBy('createdAt', 'desc')
      )

      try {
        const querySnapshot = await getDocs(q)
        const animals = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Animal[]

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

  return {
    isLoading,
    create,
    update,
    remove,
    get,
    getUserAnimals
  }
}
