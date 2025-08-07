'use client'

import { useState } from 'react'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { FarmArea } from '@/types/farm'
import { useFarms } from './useFarms'
import { useFarmCRUD } from './useFarmCRUD'

export const useFarmAreas = () => {
  const { farms } = useFarms()
  const { updateFarm } = useFarmCRUD()
  const [areas, setAreas] = useState<FarmArea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const createArea = async (
    farmId: string,
    areaData: Omit<FarmArea, 'id' | 'farmId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!farmId) throw new Error('ID de granja requerido')

    const newArea = {
      ...areaData,
      farmId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    try {
      const docRef = await addDoc(collection(db, 'farmAreas'), newArea)
      const createdArea = {
        id: docRef.id,
        ...newArea,
        createdAt: new Date(newArea.createdAt.toMillis()),
        updatedAt: new Date(newArea.updatedAt.toMillis())
      }

      setAreas((prev) =>
        [...prev, createdArea].sort((a, b) => a.name.localeCompare(b.name))
      )

      // Actualizar granja con nueva área
      const updatedFarm = farms.find((f) => f.id === farmId)
      if (updatedFarm) {
        updateFarm(farmId, {
          areas: [...(updatedFarm.areas || []), createdArea]
        })
      }

      return createdArea
    } catch (error) {
      console.error('Error creating farm area:', error)
      setError('Error al crear el área')
      throw new Error('Error al crear el área')
    } finally {
      setIsLoading(false)
    }
  }

  const updateArea = async (
    areaId: string,
    updates: Partial<Omit<FarmArea, 'id' | 'farmId' | 'createdAt'>>
  ) => {
    try {
      const areaRef = doc(db, 'farmAreas', areaId)
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      }

      await updateDoc(areaRef, updateData)

      setAreas((prev) =>
        prev
          .map((area) =>
            area.id === areaId
              ? { ...area, ...updates, updatedAt: new Date() }
              : area
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    } catch (error) {
      console.error('Error updating farm area:', error)
      throw new Error('Error al actualizar el área')
    }
  }

  const deleteArea = async (areaId: string) => {
    try {
      await deleteDoc(doc(db, 'farmAreas', areaId))
      setAreas((prev) => prev.filter((area) => area.id !== areaId))
    } catch (error) {
      console.error('Error deleting farm area:', error)
      throw new Error('Error al eliminar el área')
    }
  }

  const toggleAreaStatus = async (areaId: string) => {
    const area = areas.find((a) => a.id === areaId)
    if (area) {
      await updateArea(areaId, { isActive: !area.isActive })
    }
  }

  const getActiveAreas = () => areas.filter((area) => area.isActive)
  const getAreasByType = (type: FarmArea['type']) =>
    areas.filter((area) => area.type === type)

  const getAreaStats = () => {
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

  return {
    areas,
    isLoading,
    error,
    createArea,
    updateArea,
    deleteArea,
    toggleAreaStatus,
    getActiveAreas,
    getAreasByType,
    getAreaStats
  }
}
