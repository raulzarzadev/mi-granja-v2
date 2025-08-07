'use client'

import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'

/**
 * Hook personalizado para el manejo de animales
 */
/**
 *
 * @deprecated use `useAnimalCRUD` en su lugar
 */
export const useAnimals = () => {
  const { animals, isLoading, error } = useSelector(
    (state: RootState) => state.animals
  )
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
          animal.animalNumber.toLowerCase().includes(searchLower) ||
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
    getStats,
    filterAnimals
  }
}
