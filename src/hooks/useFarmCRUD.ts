'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Farm } from '@/types/farm'

export const useFarmCRUD = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [farms, setFarms] = useState<Farm[]>([])
  const [currentFarm, setCurrentFarm] = useState<Farm | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUserFarms = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      // Granjas donde es propietario
      const ownerQuery = query(
        collection(db, 'farms'),
        where('ownerId', '==', user.id)
      )
      const ownerSnapshot = await getDocs(ownerQuery)
      const ownerFarms = ownerSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Farm[]

      // TODO: También obtener granjas donde es colaborador
      // const collaboratorQuery = query(
      //   collection(db, 'farmCollaborators'),
      //   where('userId', '==', user.id),
      //   where('isActive', '==', true)
      // )

      setFarms(ownerFarms)

      // Establecer granja actual si el usuario tiene una seleccionada
      if (user.currentFarmId && ownerFarms.length > 0) {
        const currentFarmData = ownerFarms.find(
          (f) => f.id === user.currentFarmId
        )
        setCurrentFarm(currentFarmData || ownerFarms[0])
      } else if (ownerFarms.length > 0) {
        setCurrentFarm(ownerFarms[0])
      }
    } catch (err) {
      console.error('Error loading farms:', err)
      setError('Error al cargar las granjas')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Cargar granjas del usuario
  useEffect(() => {
    if (!user) {
      setFarms([])
      setCurrentFarm(null)
      setIsLoading(false)
      return
    }

    loadUserFarms()
  }, [user, loadUserFarms])

  const createFarm = async (
    farmData: Omit<Farm, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!user) throw new Error('Usuario no autenticado')

    const newFarm = {
      ...farmData,
      ownerId: user.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    try {
      const docRef = await addDoc(collection(db, 'farms'), newFarm)
      const createdFarm = {
        id: docRef.id,
        ...farmData,
        ownerId: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      setFarms((prev) => [...prev, createdFarm])

      // Si es la primera granja, establecerla como actual
      if (farms.length === 0) {
        setCurrentFarm(createdFarm)
      }

      return createdFarm
    } catch (error) {
      console.error('Error creating farm:', error)
      throw new Error('Error al crear la granja')
    }
  }

  const updateFarm = async (
    farmId: string,
    updates: Partial<Omit<Farm, 'id' | 'ownerId' | 'createdAt'>>
  ) => {
    try {
      const farmRef = doc(db, 'farms', farmId)
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      }

      await updateDoc(farmRef, updateData)

      setFarms((prev) =>
        prev.map((farm) =>
          farm.id === farmId
            ? { ...farm, ...updates, updatedAt: new Date() }
            : farm
        )
      )

      if (currentFarm?.id === farmId) {
        setCurrentFarm((prev) =>
          prev ? { ...prev, ...updates, updatedAt: new Date() } : null
        )
      }
    } catch (error) {
      console.error('Error updating farm:', error)
      throw new Error('Error al actualizar la granja')
    }
  }

  const deleteFarm = async (farmId: string) => {
    try {
      await deleteDoc(doc(db, 'farms', farmId))

      setFarms((prev) => prev.filter((farm) => farm.id !== farmId))

      if (currentFarm?.id === farmId) {
        const remainingFarms = farms.filter((farm) => farm.id !== farmId)
        setCurrentFarm(remainingFarms.length > 0 ? remainingFarms[0] : null)
      }
    } catch (error) {
      console.error('Error deleting farm:', error)
      throw new Error('Error al eliminar la granja')
    }
  }

  const switchFarm = async (farmId: string) => {
    const farm = farms.find((f) => f.id === farmId)
    if (farm) {
      setCurrentFarm(farm)

      // TODO: Actualizar currentFarmId en el perfil del usuario
      // await updateUserProfile({ currentFarmId: farmId })
    }
  }

  const getFarmById = async (farmId: string): Promise<Farm | null> => {
    try {
      const farmDoc = await getDoc(doc(db, 'farms', farmId))
      if (farmDoc.exists()) {
        return {
          id: farmDoc.id,
          ...farmDoc.data(),
          createdAt: farmDoc.data().createdAt?.toDate() || new Date(),
          updatedAt: farmDoc.data().updatedAt?.toDate() || new Date()
        } as Farm
      }
      return null
    } catch (error) {
      console.error('Error getting farm:', error)
      return null
    }
  }

  return {
    farms,
    currentFarm,
    isLoading,
    error,
    createFarm,
    updateFarm,
    deleteFarm,
    switchFarm,
    getFarmById,
    refreshFarms: loadUserFarms
  }
}
