'use client'

import { useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '@/features/store'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Farm, FarmArea, FarmCollaborator } from '@/types/farm'
import {
  setLoading,
  setError,
  setFarms,
  addFarm,
  updateFarm as updateFarmState,
  removeFarm,
  setCurrentFarm,
  addAreaToFarm,
  updateAreaInFarm,
  removeAreaFromFarm,
  addCollaboratorToFarm,
  updateCollaboratorInFarm,
  removeCollaboratorFromFarm
} from '@/features/farm/farmSlice'
import { serializeObj } from '@/features/libs/serializeObj'

export const useFarmCRUD = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { farms, currentFarm, isLoading, error } = useSelector(
    (state: RootState) => state.farm
  )
  // Cargar granjas del usuario
  const loadUserFarms = async () => {
    if (!user) {
      dispatch(setFarms([]))
      return
    }

    dispatch(setLoading(true))

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
        areas: doc.data().areas || [],
        collaborators: doc.data().collaborators || [],
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Farm[]

      dispatch(serializeObj(setFarms(ownerFarms)))
    } catch (err) {
      console.error('Error loading farms:', err)
      dispatch(setError('Error al cargar las granjas'))
    } finally {
      dispatch(setLoading(false))
    }
  }

  // Crear nueva granja
  const createFarm = async (
    farmData: Omit<
      Farm,
      'id' | 'ownerId' | 'areas' | 'collaborators' | 'createdAt' | 'updatedAt'
    >
  ) => {
    if (!user) throw new Error('Usuario no autenticado')

    const newFarmData = {
      ...farmData,
      ownerId: user.id,
      areas: [],
      collaborators: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    try {
      const docRef = await addDoc(collection(db, 'farms'), newFarmData)
      const createdFarm: Farm = {
        id: docRef.id,
        ...farmData,
        ownerId: user.id,
        areas: [],
        collaborators: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      dispatch(serializeObj(addFarm(createdFarm)))
      return createdFarm
    } catch (error) {
      console.error('Error creating farm:', error)
      dispatch(setError('Error al crear la granja'))
      throw error
    }
  }

  // Actualizar granja
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
      dispatch(
        serializeObj(
          updateFarmState({
            id: farmId,
            updates: { ...updates, updatedAt: new Date() }
          })
        )
      )
    } catch (error) {
      console.error('Error updating farm:', error)
      dispatch(setError('Error al actualizar la granja'))
      throw error
    }
  }

  // Eliminar granja
  const deleteFarm = async (farmId: string) => {
    try {
      await deleteDoc(doc(db, 'farms', farmId))
      dispatch(serializeObj(removeFarm(farmId)))
    } catch (error) {
      console.error('Error deleting farm:', error)
      dispatch(setError('Error al eliminar la granja'))
      throw error
    }
  }

  // Cambiar granja actual
  const switchFarm = (farmId: string) => {
    dispatch(setCurrentFarm(farmId))
  }

  // OPERACIONES DE ÁREAS

  // Crear nueva área
  const createArea = async (
    farmId: string,
    areaData: Omit<FarmArea, 'id' | 'farmId' | 'createdAt' | 'updatedAt'>
  ) => {
    const newArea: FarmArea = {
      id: `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      farmId,
      ...areaData,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    try {
      const farmRef = doc(db, 'farms', farmId)
      await updateDoc(farmRef, {
        areas: arrayUnion(newArea),
        updatedAt: Timestamp.now()
      })

      dispatch(serializeObj(addAreaToFarm({ farmId, area: newArea })))
      return newArea
    } catch (error) {
      console.error('Error creating area:', error)
      dispatch(setError('Error al crear el área'))
      throw error
    }
  }

  // Actualizar área
  const updateArea = async (
    farmId: string,
    areaId: string,
    updates: Partial<FarmArea>
  ) => {
    try {
      const farm = farms.find((f) => f.id === farmId)
      if (!farm) throw new Error('Granja no encontrada')

      const areaIndex = farm.areas.findIndex((a) => a.id === areaId)
      if (areaIndex === -1) throw new Error('Área no encontrada')

      const updatedAreas = [...farm.areas]
      updatedAreas[areaIndex] = {
        ...updatedAreas[areaIndex],
        ...updates,
        updatedAt: new Date()
      }

      const farmRef = doc(db, 'farms', farmId)
      await updateDoc(farmRef, {
        areas: updatedAreas,
        updatedAt: Timestamp.now()
      })

      dispatch(
        updateAreaInFarm({
          farmId,
          areaId,
          updates: { ...updates, updatedAt: new Date() }
        })
      )
    } catch (error) {
      console.error('Error updating area:', error)
      dispatch(setError('Error al actualizar el área'))
      throw error
    }
  }

  // Eliminar área
  const deleteArea = async (farmId: string, areaId: string) => {
    try {
      const farm = farms.find((f) => f.id === farmId)
      if (!farm) throw new Error('Granja no encontrada')

      const areaToRemove = farm.areas.find((a) => a.id === areaId)
      if (!areaToRemove) throw new Error('Área no encontrada')

      const farmRef = doc(db, 'farms', farmId)
      await updateDoc(farmRef, {
        areas: arrayRemove(areaToRemove),
        updatedAt: Timestamp.now()
      })

      dispatch(removeAreaFromFarm({ farmId, areaId }))
    } catch (error) {
      console.error('Error deleting area:', error)
      dispatch(setError('Error al eliminar el área'))
      throw error
    }
  }

  // OPERACIONES DE COLABORADORES

  // Agregar colaborador
  const addCollaborator = async (
    farmId: string,
    collaboratorData: Omit<
      FarmCollaborator,
      'id' | 'farmId' | 'createdAt' | 'updatedAt'
    >
  ) => {
    const newCollaborator: FarmCollaborator = {
      id: `collaborator_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      farmId,
      ...collaboratorData,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    try {
      const farmRef = doc(db, 'farms', farmId)
      await updateDoc(farmRef, {
        collaborators: arrayUnion(newCollaborator),
        updatedAt: Timestamp.now()
      })

      dispatch(addCollaboratorToFarm({ farmId, collaborator: newCollaborator }))
      return newCollaborator
    } catch (error) {
      console.error('Error adding collaborator:', error)
      dispatch(setError('Error al agregar colaborador'))
      throw error
    }
  }

  // Actualizar colaborador
  const updateCollaborator = async (
    farmId: string,
    collaboratorId: string,
    updates: Partial<FarmCollaborator>
  ) => {
    try {
      const farm = farms.find((f) => f.id === farmId)
      if (!farm?.collaborators)
        throw new Error('Granja o colaboradores no encontrados')

      const collaboratorIndex = farm.collaborators.findIndex(
        (c) => c.id === collaboratorId
      )
      if (collaboratorIndex === -1) throw new Error('Colaborador no encontrado')

      const updatedCollaborators = [...farm.collaborators]
      updatedCollaborators[collaboratorIndex] = {
        ...updatedCollaborators[collaboratorIndex],
        ...updates,
        updatedAt: new Date()
      }

      const farmRef = doc(db, 'farms', farmId)
      await updateDoc(farmRef, {
        collaborators: updatedCollaborators,
        updatedAt: Timestamp.now()
      })

      dispatch(
        updateCollaboratorInFarm({
          farmId,
          collaboratorId,
          updates: { ...updates, updatedAt: new Date() }
        })
      )
    } catch (error) {
      console.error('Error updating collaborator:', error)
      dispatch(setError('Error al actualizar colaborador'))
      throw error
    }
  }

  // Eliminar colaborador
  const removeCollaborator = async (farmId: string, collaboratorId: string) => {
    try {
      const farm = farms.find((f) => f.id === farmId)
      if (!farm?.collaborators)
        throw new Error('Granja o colaboradores no encontrados')

      const collaboratorToRemove = farm.collaborators.find(
        (c) => c.id === collaboratorId
      )
      if (!collaboratorToRemove) throw new Error('Colaborador no encontrado')

      const farmRef = doc(db, 'farms', farmId)
      await updateDoc(farmRef, {
        collaborators: arrayRemove(collaboratorToRemove),
        updatedAt: Timestamp.now()
      })

      dispatch(removeCollaboratorFromFarm({ farmId, collaboratorId }))
    } catch (error) {
      console.error('Error removing collaborator:', error)
      dispatch(setError('Error al eliminar colaborador'))
      throw error
    }
  }

  // Funciones de utilidad para estadísticas
  const getAreaStats = (farmId?: string) => {
    const targetFarm = farmId ? farms.find((f) => f.id === farmId) : currentFarm
    if (!targetFarm) return { total: 0, active: 0, inactive: 0, byType: {} }

    const areas = targetFarm.areas
    const stats = {
      total: areas.length,
      active: areas.filter((a) => a.isActive).length,
      inactive: areas.filter((a) => !a.isActive).length,
      byType: {} as Record<string, number>
    }

    areas.forEach((area) => {
      stats.byType[area.type] = (stats.byType[area.type] || 0) + 1
    })

    return stats
  }

  const getCollaboratorStats = (farmId?: string) => {
    const targetFarm = farmId ? farms.find((f) => f.id === farmId) : currentFarm
    if (!targetFarm?.collaborators) return { total: 0, active: 0, byRole: {} }

    const collaborators = targetFarm.collaborators
    const activeCollaborators = collaborators.filter((c) => c.isActive)

    const stats = {
      total: activeCollaborators.length,
      active: activeCollaborators.length,
      byRole: {} as Record<string, number>
    }

    activeCollaborators.forEach((collaborator) => {
      stats.byRole[collaborator.role] =
        (stats.byRole[collaborator.role] || 0) + 1
    })

    return stats
  }

  return {
    // Estado
    farms,
    currentFarm,
    isLoading,
    error,

    // Operaciones de granja
    createFarm,
    updateFarm,
    deleteFarm,
    switchFarm,

    loadUserFarms,

    // Operaciones de áreas
    createArea,
    updateArea,
    deleteArea,

    // Operaciones de colaboradores
    addCollaborator,
    updateCollaborator,
    removeCollaborator,

    // Utilidades
    getAreaStats,
    getCollaboratorStats
  }
}
