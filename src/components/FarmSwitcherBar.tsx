'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import ModalCreateFarm from './ModalCreateFarm'
import ModalEditFarm from './ModalEditFarm'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'

const FarmSwitcherBar: React.FC = () => {
  const { farms, currentFarm, switchFarm } = useFarmCRUD()

  const { user } = useSelector((s: RootState) => s.auth)
  const [selectedInvitationId, setSelectedInvitationId] = useState<
    string | null
  >(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value
      if (val === '__create__') {
        setShowCreateModal(true)
        return
      }

      switchFarm(val)
    },
    [switchFarm]
  )

  const selectValue = useMemo(() => {
    if (selectedInvitationId) return 'inv_pending_' + selectedInvitationId
    return currentFarm?.id || ''
  }, [selectedInvitationId, currentFarm])

  if (farms.length === 0) return null

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white min-w-[240px]"
            value={selectValue}
            onChange={handleSelectChange}
            aria-label="Seleccionar granja o invitación"
          >
            {farms.length > 0 && (
              <optgroup label="Mis Granjas">
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </optgroup>
            )}

            <option value="__create__">➕ Crear nueva granja</option>
          </select>
          {currentFarm && user?.id === currentFarm.ownerId && (
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3 py-2 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
            >
              ✏️ Editar
            </button>
          )}
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
        <ModalEditFarm
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          showTrigger={false}
          farm={currentFarm || (undefined as any)}
          onUpdated={() => {
            setShowEditModal(false)
          }}
        />
      </div>
    </div>
  )
}

export default FarmSwitcherBar
