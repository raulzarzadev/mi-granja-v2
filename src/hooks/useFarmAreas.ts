'use client'

import { useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { FarmArea } from '@/types/farm'
import { useFarmCRUD } from './useFarmCRUD'

export const useFarmAreas = () => {
  const { updateFarm, currentFarm } = useFarmCRUD()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const areas = currentFarm?.areas || []

  const createArea = async (
    farmId: string,
    areaData: Omit<FarmArea, 'id' | 'farmId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!farmId) throw new Error('ID de granja requerido')
    setIsLoading(true)

    const newArea = {
      ...areaData,
      id: crypto.randomUUID(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      farmId
    }

    try {
      // Actualizar granja con nueva área
      const currentFarmAreas = currentFarm?.areas || []

      updateFarm(farmId, {
        areas: [...currentFarmAreas, newArea]
      })

      return newArea
    } catch (error) {
      console.error('Error creating farm area:', error)
      setError('Error al crear el área')
      throw new Error('Error al crear el área')
    } finally {
      setIsLoading(false)
    }
  }

  const updateArea = async ({
    areaId,
    farmId,
    updates
  }: {
    areaId: string
    farmId: string
    updates: Partial<Omit<FarmArea, 'id' | 'farmId' | 'createdAt'>>
  }) => {
    setIsLoading(true)
    try {
      const currentAreas = currentFarm?.areas || []
      const areaIndex = currentAreas.findIndex((a) => a.id === areaId)
      if (areaIndex === -1) {
        throw new Error('Área no encontrada')
      }
      const updatedArea = {
        ...currentAreas[areaIndex],
        ...updates,
        updatedAt: Timestamp.now()
      }
      const updatedAreas = [...currentAreas]
      updatedAreas[areaIndex] = updatedArea
      await updateFarm(farmId, { areas: updatedAreas })
      return updatedArea
    } catch (error) {
      console.error('Error updating farm area:', error)
      throw new Error('Error al actualizar el área')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteArea = async ({
    farmId,
    areaId
  }: {
    farmId: string
    areaId: string
  }) => {
    try {
      setIsLoading(true)
      const currentAreas = currentFarm?.areas || []
      const areaIndex = currentAreas.findIndex((a) => a.id === areaId)
      if (areaIndex === -1) {
        throw new Error('Área no encontrada')
      }
      const updatedAreas = currentAreas.filter((a) => a.id !== areaId)
      await updateFarm(farmId, { areas: updatedAreas })
    } catch (error) {
      console.error('Error deleting farm area:', error)
      throw new Error('Error al eliminar el área')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleAreaStatus = async (areaId: string) => {
    const area = areas.find((a) => a.id === areaId)
    if (area) {
      await updateArea({
        areaId,
        farmId: currentFarm?.id || '',
        updates: { isActive: !area.isActive }
      })
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
