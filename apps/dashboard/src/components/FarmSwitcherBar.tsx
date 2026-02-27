'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useFarmMembers } from '@/hooks/useFarmMembers'
import { useMyInvitations } from '@/hooks/useMyInvitations'
import { collaborator_roles_label, FarmCollaborator } from '@/types/collaborators'
import { Farm } from '@/types/farm'
import ModalCreateFarm from './ModalCreateFarm'
import ModalEditFarm from './ModalEditFarm'

const FarmSwitcherBar: React.FC = () => {
  const { currentFarm, switchFarm, loadUserFarms, myFarms, invitationFarms } = useFarmCRUD()

  const myInv = useMyInvitations()
  const { acceptInvitation } = useFarmMembers(undefined)

  const { user } = useSelector((s: RootState) => s.auth)
  const [selectedInvitationId, setSelectedInvitationId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const pendingInvs = myInv.getPending()
  const [acceptedRole, setAcceptedRole] = useState<FarmCollaborator['role'] | null>(null)

  useEffect(() => {
    if (currentFarm && user && currentFarm.ownerId !== user.id) {
      const list = myInv.getAccepted()
      const inv = list.find((i) => i.farmId === currentFarm.id)
      const nextRole = inv ? inv.role : null
      setAcceptedRole((prev) => (prev === nextRole ? prev : nextRole))
    } else {
      setAcceptedRole((prev) => (prev === null ? prev : null))
    }
    // Dependencias reducidas para evitar bucles por referencias nuevas en cada render
  }, [currentFarm?.id, user?.id])

  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value
      if (val === '__create__') {
        setShowCreateModal(true)
        return
      }
      if (val.startsWith('inv_pending_')) {
        setSelectedInvitationId(val.replace('inv_pending_', ''))
        return
      }
      switchFarm(val)
    },
    [switchFarm],
  )

  const selectValue = useMemo(() => {
    if (selectedInvitationId) return 'inv_pending_' + selectedInvitationId
    return currentFarm?.id || ''
  }, [selectedInvitationId, currentFarm])

  if ((myFarms?.length || 0) + (invitationFarms?.length || 0) === 0) return null
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white min-w-[260px]"
            value={selectValue}
            onChange={handleSelectChange}
            aria-label="Seleccionar granja o invitación"
          >
            {myFarms?.length > 0 && (
              <optgroup label="Mis Granjas">
                {myFarms.map((farm: Farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </optgroup>
            )}
            {invitationFarms?.length > 0 && (
              <optgroup label="Invitaciones y Accesos">
                {invitationFarms.map((farm: Farm) => {
                  const pending = farm.invitationMeta?.status === 'pending'
                  const value = pending
                    ? 'inv_pending_' + farm.invitationMeta!.invitationId
                    : farm.id
                  return (
                    <option key={farm.id} value={value}>
                      {pending ? '⏳' : '✅'} {farm.name}
                      {farm.invitationMeta?.role &&
                        ' (' + collaborator_roles_label[farm.invitationMeta.role] + ')'}{' '}
                      {pending && '— pendiente'}
                    </option>
                  )
                })}
              </optgroup>
            )}
            {/* Eliminado optgroup duplicado de pendientes; ya se listan en Invitaciones y Accesos */}

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
          {currentFarm && acceptedRole && user?.id !== currentFarm.ownerId && (
            <span className="px-2 py-1 text-[10px] uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200 rounded">
              Invitado como: {collaborator_roles_label[acceptedRole] || acceptedRole}
            </span>
          )}
        </div>

        {selectedInvitationId && (
          <div className="flex items-center flex-wrap gap-2 text-xs bg-orange-50 border border-orange-200 px-3 py-2 rounded-md">
            <span className="text-orange-700 font-medium">Invitación pendiente</span>
            <button
              className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={async () => {
                const inv = pendingInvs.find((i) => i.id === selectedInvitationId)
                if (!inv || !user?.id) return
                try {
                  await acceptInvitation(inv.id, user.id)
                  setSelectedInvitationId(null)
                  await loadUserFarms()
                  switchFarm(inv.farmId)
                  myInv.refresh()
                } catch (e) {
                  console.error(e)
                  alert('No se pudo aceptar la invitación')
                }
              }}
            >
              Aceptar
            </button>
            <button
              className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              onClick={async () => {
                const inv = pendingInvs.find((i) => i.id === selectedInvitationId)
                if (!inv) return
                try {
                  await myInv.rejectInvitation(inv.id)
                  setSelectedInvitationId(null)
                  await loadUserFarms()
                } catch (e) {
                  console.error(e)
                  alert('No se pudo rechazar la invitación')
                }
              }}
            >
              Rechazar
            </button>
            <button
              className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={() => setSelectedInvitationId(null)}
            >
              Cerrar
            </button>
          </div>
        )}

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
