'use client'

import { deleteDoc, doc, Timestamp, updateDoc } from 'firebase/firestore'
import { useState } from 'react'
import { db } from '@/lib/firebase'
import { FarmArea } from '@/types/farm'
import { useFarmCRUD } from './useFarmCRUD'

export const useFarmAreasCRUD = () => {
  const { updateFarm, currentFarm } = useFarmCRUD()
  const [areas, setAreas] = useState<FarmArea[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createArea = async (
    farmId: string,
    areaData: Omit<FarmArea, 'id' | 'farmId' | 'createdAt' | 'updatedAt'>,
  ) => {
    if (!farmId) throw new Error('ID de granja requerido')

    setIsLoading(true)
    setError(null)
    const newArea = {
      ...areaData,
      farmId,
      id: crypto.randomUUID(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }

    const farmAreas = currentFarm?.areas || []

    try {
      updateFarm(farmId, { areas: [...farmAreas, newArea] })
      setIsLoading(false)
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
    updates: Partial<Omit<FarmArea, 'id' | 'farmId' | 'createdAt'>>,
  ) => {
    try {
      const areaRef = doc(db, 'farmAreas', areaId)
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
      }

      await updateDoc(areaRef, updateData)

      setAreas((prev) =>
        prev
          .map((area) =>
            area.id === areaId ? { ...area, ...updates, updatedAt: new Date() } : area,
          )
          .sort((a, b) => a.name.localeCompare(b.name)),
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
  const getAreasByType = (type: FarmArea['type']) => areas.filter((area) => area.type === type)

  const getAreaStats = () => {
    const stats = {
      total: areas.length,
      active: areas.filter((a) => a.isActive).length,
      inactive: areas.filter((a) => !a.isActive).length,
      byType: {} as Record<string, number>,
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
    getAreaStats,
  }
}
