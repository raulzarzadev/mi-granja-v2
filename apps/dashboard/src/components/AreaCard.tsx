'use client'

import React from 'react'
import { FarmArea, FARM_AREA_TYPES } from '@/types/farm'
import { useFarmAreasCRUD } from '@/hooks/useFarmAreasCRUD'

interface AreaCardProps {
  area: FarmArea
}

/**
 * Tarjeta para mostrar información de un área de la granja
 */
const AreaCard: React.FC<AreaCardProps> = ({ area }) => {
  const { toggleAreaStatus } = useFarmAreasCRUD()
  const areaType = FARM_AREA_TYPES.find((type) => type.value === area.type)

  const handleToggleStatus = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      await toggleAreaStatus(area.id)
    } catch (error) {
      console.error('Error toggling area status:', error)
    }
  }

  return (
    <div
      className={`bg-white rounded-lg border-2 p-4 transition-all hover:shadow-md ${
        area.isActive ? 'border-green-200' : 'border-gray-200 opacity-75'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{areaType?.icon || '📍'}</span>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">{area.name}</h4>
            <p className="text-sm text-gray-500">
              {areaType?.label || area.type}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleStatus}
          className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
            area.isActive
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {area.isActive ? 'Activa' : 'Inactiva'}
        </button>
      </div>

      {area.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {area.description}
        </p>
      )}

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          {area.capacity && (
            <span className="flex items-center gap-1">
              📊 Capacidad: {area.capacity}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {area.notes && (
            <span title={area.notes} className="cursor-help">
              📝
            </span>
          )}
        </div>
      </div>

      {area.notes && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 line-clamp-2" title={area.notes}>
            📝 {area.notes}
          </p>
        </div>
      )}
    </div>
  )
}

export default AreaCard
