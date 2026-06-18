'use client'

import { useMemo } from 'react'
import { FarmArea } from '@/types/farm'
import { useFarmCRUD } from './useFarmCRUD'

export const useFarmAreasCRUD = () => {
  const {
    currentFarm,
    isLoading,
    error,
    createArea: createFarmArea,
    updateArea: updateFarmArea,
    deleteArea: deleteFarmArea,
  } = useFarmCRUD()

  const areas = useMemo(
    () => [...(currentFarm?.areas || [])].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [currentFarm?.areas],
  )

  const createArea = async (
    farmId: string,
    areaData: Omit<FarmArea, 'id' | 'farmId' | 'createdAt' | 'updatedAt'>,
  ) => {
    if (!farmId) throw new Error('ID de granja requerido')
    return createFarmArea(farmId, areaData)
  }

  const updateArea = async (
    areaId: string,
    updates: Partial<Omit<FarmArea, 'id' | 'farmId' | 'createdAt'>>,
  ) => {
    if (!currentFarm?.id) throw new Error('Selecciona una granja primero')
    return updateFarmArea(currentFarm.id, areaId, updates)
  }

  const deleteArea = async (areaId: string) => {
    if (!currentFarm?.id) throw new Error('Selecciona una granja primero')
    return deleteFarmArea(currentFarm.id, areaId)
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
