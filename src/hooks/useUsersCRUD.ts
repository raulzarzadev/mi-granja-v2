import { db } from '@/lib/firebase'
import { User } from '@/types'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  QueryConstraint,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore'
import { useState } from 'react'

export const useUsersCRUD = () => {
  const [loading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = async (userId: string) => {
    if (!userId) {
      throw new Error('User ID is required')
    }
    setIsLoading(true)
    try {
      await deleteDoc(doc(db, 'users', userId))
      console.log('User deleted:', userId)
    } catch (error) {
      console.error('Error deleting user:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Error al eliminar el usuario'
      setError(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }
  const get = async (userId: string) => {
    if (!userId) {
      throw new Error('User ID is required')
    }
    setIsLoading(true)
    try {
      const userRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userRef)
      if (userDoc.exists()) {
        return userDoc.data() as User
      } else {
        throw new Error('User not found')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Error al obtener el usuario'
      setError(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }
  const find = async (filters: QueryConstraint[] = []) => {
    // if (!filters || filters.length === 0) {
    //   throw new Error('Filters are required for find method')
    // }
    setIsLoading(true)
    try {
      const usersQuery = query(collection(db, 'users'), ...filters)
      const querySnapshot = await getDocs(usersQuery)

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as User[]
    } catch (error) {
      console.error('Error finding users:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Error al buscar usuarios'
      setError(errorMessage)

      throw error
    } finally {
      setIsLoading(false)
    }
  }
  const update = async (userId: string, data: Partial<User>) => {
    if (!userId) {
      throw new Error('User ID is required')
    }
    setIsLoading(true)
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, data)
      console.log('User updated:', userId)
    } catch (error) {
      console.error('Error updating user:', error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error al actualizar el usuario'
      setError(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }
  const create = async (data: User) => {
    if (!data.email) {
      throw new Error('User email is required')
    }
    setIsLoading(true)
    try {
      const userExists = await get(data.id)
      if (userExists) {
        throw new Error('User already exists')
      }
      // Aquí podrías agregar lógica para validar el email, roles, etc.
      data.createdAt = serverTimestamp() as any // Asegurar que createdAt sea un timestamp
      data.roles = data.roles || [] // Asegurarse de que roles sea un array if not provided
      data.farmName = data.farmName || '' // Asegurar que farmName esté definido
      data.id = data.id || crypto.randomUUID() // Generar un ID único si no se proporciona
      data.email = data.email.toLowerCase() // Normalizar el email a minúsculas
      // Crear el documento del usuario en Firestore

      const userRef = doc(db, 'users', data.id)
      await setDoc(userRef, data)
      console.log('User created:', data.id)
    } catch (error) {
      console.error('Error creating user:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Error al crear el usuario'
      setError(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    remove,
    get,
    find,
    update,
    create,
    loading,
    error
  }
}
