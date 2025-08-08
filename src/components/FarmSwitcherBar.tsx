'use client'

import React from 'react'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import ModalCreateFarm from './ModalCreateFarm'

const FarmSwitcherBar: React.FC = () => {
  const { farms, currentFarm, switchFarm } = useFarmCRUD()

  if (farms.length === 0) return null

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Granja actual:</span>
          <select
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            value={currentFarm?.id || ''}
            onChange={(e) => switchFarm(e.target.value)}
            aria-label="Seleccionar granja"
          >
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
        </div>

        {/* Mostrar CTA para crear otra granja cuando ya existe al menos una */}
        {farms.length >= 1 && (
          <div className="shrink-0">
            <ModalCreateFarm />
          </div>
        )}
      </div>
    </div>
  )
}

export default FarmSwitcherBar
