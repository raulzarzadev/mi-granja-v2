'use client'

import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { useBilling } from '@/hooks/useBilling'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useFarmMembers } from '@/hooks/useFarmMembers'
import { useMyInvitations } from '@/hooks/useMyInvitations'
import { Farm } from '@/types/farm'
import Button from './buttons/Button'
import FarmAvatar from './FarmAvatar'
import ModalCreateFarm from './ModalCreateFarm'
import ModalEditFarm from './ModalEditFarm'
import MyRole from './MyRole'

const FarmSwitcherBar = ({ children }: { children?: ReactNode }) => {
  const {
    currentFarm,
    switchFarm,
    loadUserFarms,
    myFarms,
    invitationFarms,
    deletedFarms,
    restoreFarm,
  } = useFarmCRUD()
  const [isRestoring, setIsRestoring] = useState<string | null>(null)

  const myInv = useMyInvitations()
  const { acceptInvitation } = useFarmMembers(undefined)

  const { user } = useSelector((s: RootState) => s.auth)
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

  if (allFarms.length === 0) return null

  return (
    <div className="w-full">
      <div className="grid gap-4 mb-2 justify-between md:flex content-center ">
        {/* Farm switcher dropdown */}
        <div className="flex gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((p) => !p)}
              className={`flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg text-sm transition-colors  ${
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
              <div className="grid gap-1">
                <span className="font-medium text-gray-900 truncate max-w-[180px]">
                  {currentFarm?.name || 'Seleccionar granja'}
                </span>
                {currentFarm && <MyRole farm={currentFarm} />}
              </div>
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
                          currentFarm?.id === farm.id
                            ? 'bg-green-50 text-green-700'
                            : 'text-gray-700'
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
                    {/* Button create new farm. show modal. Show disclaimer in the modal to limit if current plan is not enough  */}
                    <button
                      onClick={() => {
                        setShowCreateModal(true)
                        setDropdownOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors text-gray-700"
                    >
                      <svg
                        className="h-4 w-4 text-gray-400 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Nueva granja</span>
                    </button>
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
              </div>
            )}
          </div>

          {/* Editar granja (icon) */}
          {currentFarm && user?.id === currentFarm.ownerId && (
            <Button
              size="icon"
              variant="ghost"
              color="primary"
              icon="edit"
              onClick={() => setShowEditModal(true)}
              title="Editar granja"
              className="!h-8 !w-8"
            />
          )}
        </div>
        {/* Children */}
        {children}
        {/* Nueva granja */}
        {/*   TODO agregar este boton mas arriba */}
        {/* <div className="flex gap-2">
          <Button
            size="xs"
            variant="outline"
            color="success"
            icon="add"
            onClick={() => setShowCreateModal(true)}
          >
            Nueva granja
          </Button>
        </div> */}

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

        {/* Banner granjas eliminadas */}
        {deletedFarms.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3 space-y-2">
            <p className="text-sm font-medium text-red-800">Granjas marcadas para eliminacion</p>
            {deletedFarms.map((farm) => {
              const deletedDate =
                farm.deletedAt instanceof Date ? farm.deletedAt : new Date(farm.deletedAt as any)
              const scheduledDate =
                farm.scheduledDeletionAt instanceof Date
                  ? farm.scheduledDeletionAt
                  : new Date(farm.scheduledDeletionAt as any)
              const daysLeft = Math.max(
                0,
                Math.ceil((scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
              )
              return (
                <div
                  key={farm.id}
                  className="flex items-center justify-between bg-white rounded-md border border-red-100 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{farm.name}</p>
                    <p className="text-xs text-red-600">
                      Eliminada el {deletedDate.toLocaleDateString('es-MX')} ·{' '}
                      {daysLeft > 0 ? `${daysLeft} dias para recuperar` : 'Eliminacion pendiente'}
                    </p>
                  </div>
                  <Button
                    size="xs"
                    variant="filled"
                    color="success"
                    disabled={isRestoring === farm.id}
                    onClick={async () => {
                      setIsRestoring(farm.id)
                      try {
                        await restoreFarm(farm.id)
                      } catch (e) {
                        console.error(e)
                      } finally {
                        setIsRestoring(null)
                      }
                    }}
                  >
                    {isRestoring === farm.id ? 'Restaurando...' : 'Recuperar'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

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

export const PlanBanner = () => {
  const { usage } = useBilling()
  const billingPlanType = useSelector((s: RootState) => s.billing.planType)

  const isPro = billingPlanType === 'pro'
  return (
    <div>
      {/* Indicador de plan y uso */}
      {usage && (
        /*
          //TODO: Al hacer click en este   boton. debera abrir un modal con el detalle del plan y uso.
          // así como un boton -> form para solicitar cambio de plan.
          */
        <div className="ml-auto flex items-center gap-2">
          <div
            className={`inline-flex flex-col items-end px-3 py-1.5 text-xs rounded-lg border ${
              usage.usedPlaces > usage.totalPlaces
                ? 'bg-red-50 text-red-700 border-red-200'
                : isPro
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-500 border-gray-200'
            }`}
          >
            {isPro ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">Pro</span>
                  <span className="opacity-30">|</span>
                  <span>
                    {usage.usedPlaces}/{usage.totalPlaces} lugares ocupados
                  </span>
                </div>
                {/*n
                  <div className="flex items-center gap-2 text-[10px] opacity-70">
                    <span>
                      {usage.farmCount} {usage.farmCount === 1 ? 'granja' : 'granjas'}
                    </span>
                    <span>·</span>
                    <span>
                      {usage.collaboratorCount}{' '}
                      {usage.collaboratorCount === 1 ? 'colaborador' : 'colaboradores'}
                    </span>
                  </div> */}
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">Free</span>
                <span className="opacity-30">|</span>
                <span>1 lugar gratis</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
