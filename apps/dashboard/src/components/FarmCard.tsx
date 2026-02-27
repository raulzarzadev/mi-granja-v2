'use client'

import React from 'react'
import { formatDate, toDate } from '@/lib/dates'
import { Farm } from '@/types/farm'

interface FarmCardProps {
  farm: Farm
}

/**
 * Tarjeta para mostrar información de una granja
 */
const FarmCard: React.FC<FarmCardProps> = ({ farm }) => {
  return (
    <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚜</span>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">{farm.name}</h4>
            {farm.location?.city && (
              <p className="text-sm text-gray-500">
                📍 {farm.location.city}
                {farm.location.state && `, ${farm.location.state}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {farm.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{farm.description}</p>
      )}

      <div className="text-xs text-gray-500">Creada: {formatDate(toDate(farm.createdAt))}</div>
    </div>
  )
}

export default FarmCard
