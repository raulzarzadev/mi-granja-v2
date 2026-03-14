'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { useBilling } from '@/hooks/useBilling'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useFarmMembers } from '@/hooks/useFarmMembers'
import { useMyInvitations } from '@/hooks/useMyInvitations'
import { Farm } from '@/types/farm'
import FarmAvatar from './FarmAvatar'
import MyRole from './MyRole'
import ModalCreateFarm from './ModalCreateFarm'
import ModalEditFarm from './ModalEditFarm'

const FarmSwitcherBar: React.FC = () => {
  const { currentFarm, switchFarm, loadUserFarms, myFarms, invitationFarms } = useFarmCRUD()

  const myInv = useMyInvitations()
  const { acceptInvitation } = useFarmMembers(undefined)
  const { usage, canCreateFarm } = useBilling()

  const { user } = useSelector((s: RootState) => s.auth)
  const billingPlanType = useSelector((s: RootState) => s.billing.planType)
  const [selectedInvitationId, setSelectedInvitationId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const pendingInvs = myInv.getPending()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const allFarms = useMemo(() => {
    const owned = (myFarms || []).map((f: Farm) => ({ ...f, _type: 'owned' as const }))
    const invited = (invitationFarms || []).map((f: Farm) => ({ ...f, _type: 'invited' as const }))
    return [...owned, ...invited]
  }, [myFarms, invitationFarms])

  const handleFarmSelect = useCallback(
    (farm: Farm & { _type: string }) => {
      if (farm._type === 'invited' && farm.invitationMeta?.status === 'pending') {
        setSelectedInvitationId(farm.invitationMeta!.invitationId)
      } else {
        switchFarm(farm.id)
        setSelectedInvitationId(null)
      }
      setDropdownOpen(false)
    },
    [switchFarm],
  )

  const availablePlaces = usage ? usage.totalPlaces - usage.usedPlaces : 0
  const isPro = billingPlanType === 'pro'

  if (allFarms.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Farm switcher dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((p) => !p)}
            className={`flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg text-sm transition-colors border ${
              dropdownOpen
                ? 'border-green-400 bg-green-50 ring-1 ring-green-200'
                : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <FarmAvatar
              name={currentFarm?.name || 'G'}
              photoURL={currentFarm?.photoURL}
              size="sm"
            />
            <span className="font-medium text-gray-900 truncate max-w-[180px]">
              {currentFarm?.name || 'Seleccionar granja'}
            </span>
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-80 overflow-y-auto">
              {myFarms?.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                    Mis Granjas
                  </p>
                  {myFarms.map((farm: Farm) => (
                    <button
                      key={farm.id}
                      onClick={() => handleFarmSelect({ ...farm, _type: 'owned' })}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                        currentFarm?.id === farm.id ? 'bg-green-50 text-green-700' : 'text-gray-700'
                      }`}
                    >
                      {currentFarm?.id === farm.id ? (
                        <svg
                          className="h-4 w-4 text-green-600 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <span className="w-4" />
                      )}
                      <span className="truncate">{farm.name}</span>
                      <MyRole farm={farm} />
                    </button>
                  ))}
                </>
              )}

              {invitationFarms?.length > 0 && (
                <>
                  <div className="border-t border-gray-100 my-1" />
                  <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                    Invitaciones
                  </p>
                  {invitationFarms.map((farm: Farm) => {
                    const pending = farm.invitationMeta?.status === 'pending'
                    const isSelected = !pending && currentFarm?.id === farm.id
                    return (
                      <button
                        key={farm.id}
                        onClick={() => handleFarmSelect({ ...farm, _type: 'invited' })}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-green-50 text-green-700' : 'text-gray-700'
                        }`}
                      >
                        {isSelected ? (
                          <svg
                            className="h-4 w-4 text-green-600 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <span className="w-4" />
                        )}
                        <span className="truncate">{farm.name}</span>
                        <MyRole farm={farm} />
                        {pending && (
                          <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded font-medium">
                            Pendiente
                          </span>
                        )}
                      </button>
                    )
                  })}
                </>
              )}

              {/* Nueva granja - dentro del dropdown */}
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => {
                  setDropdownOpen(false)
                  if (!canCreateFarm()) {
                    alert(
                      'Has alcanzado el limite de granjas. Contacta al administrador para obtener mas lugares.',
                    )
                    return
                  }
                  setShowCreateModal(true)
                }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-green-700 hover:bg-green-50 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>Nueva granja</span>
              </button>
            </div>
          )}
        </div>

        {/* Editar granja (icon) */}
        {currentFarm && user?.id === currentFarm.ownerId && (
          <button
            onClick={() => setShowEditModal(true)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            title="Editar granja"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
        )}

        {/* Badge de plan y lugares - empujado a la derecha */}
        {usage && (
          <span
            className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border ${
              usage.usedPlaces > usage.totalPlaces
                ? 'bg-red-50 text-red-700 border-red-200'
                : isPro
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-500 border-gray-200'
            }`}
          >
            <span className="font-semibold">{isPro ? 'Pro' : 'Free'}</span>
            <span className="opacity-30">|</span>
            <span>
              {availablePlaces} {availablePlaces === 1 ? 'lugar disponible' : 'lugares disponibles'}
            </span>
          </span>
        )}
      </div>

      {/* Banner de invitacion pendiente */}
      {selectedInvitationId && (
        <div className="flex items-center flex-wrap gap-2 text-xs bg-orange-50 border border-orange-200 px-3 py-2 rounded-md mt-3">
          <span className="text-orange-700 font-medium">Invitacion pendiente</span>
          <button
            className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
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
                alert('No se pudo aceptar la invitacion')
              }
            }}
          >
            Aceptar
          </button>
          <button
            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
            onClick={async () => {
              const inv = pendingInvs.find((i) => i.id === selectedInvitationId)
              if (!inv) return
              try {
                await myInv.rejectInvitation(inv.id)
                setSelectedInvitationId(null)
                await loadUserFarms()
              } catch (e) {
                console.error(e)
                alert('No se pudo rechazar la invitacion')
              }
            }}
          >
            Rechazar
          </button>
          <button
            className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
            onClick={() => setSelectedInvitationId(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Modals */}
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
  )
}

export default FarmSwitcherBar
