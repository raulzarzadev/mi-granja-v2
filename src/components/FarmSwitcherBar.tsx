'use client'

import React, { useState, useCallback } from 'react'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import ModalCreateFarm from './ModalCreateFarm'

const FarmSwitcherBar: React.FC = () => {
  const { farms, currentFarm, switchFarm } = useFarmCRUD()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value
      if (val === '__create__') {
        // Abrir modal de creación y no cambiar la granja actual
        setShowCreateModal(true)
        return
      }
      switchFarm(val)
    },
    [switchFarm]
  )

  if (farms.length === 0) return null

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <select
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            value={currentFarm?.id || ''}
            onChange={handleSelectChange}
            aria-label="Seleccionar granja"
          >
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
            <option value="__create__">Crear nueva granja</option>
          </select>
        </div>

        {/* Mostrar CTA para crear otra granja cuando ya existe al menos una */}
        <ModalCreateFarm
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          showTrigger={false}
          onCreated={(farm) => {
            setShowCreateModal(false)
            switchFarm(farm.id)
          }}
        />
      </div>
    </div>
  )
}

export default FarmSwitcherBar
