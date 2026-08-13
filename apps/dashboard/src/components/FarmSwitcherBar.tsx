'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useAppFeedback } from '@/components/AppFeedbackProvider'
import { RootState } from '@/features/store'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useFarmMembers } from '@/hooks/useFarmMembers'
import { useMyInvitations } from '@/hooks/useMyInvitations'
import { Farm } from '@/types/farm'
import Button from './buttons/Button'
import FarmAvatar from './FarmAvatar'
import ModalCreateFarm from './ModalCreateFarm'
import ModalEditFarm from './ModalEditFarm'
import MyRole from './MyRole'

const FarmSwitcherBar = ({
  children,
  trailingAction,
}: {
  children?: ReactNode
  trailingAction?: ReactNode
}) => {
  const { confirmAction, notify } = useAppFeedback()
  const {
    currentFarm,
    switchFarm,
    loadUserFarms,
    myFarms,
    invitationFarms,
    deletedFarms,
    restoreFarm,
    hardDeleteFarm,
  } = useFarmCRUD()
  const [isRestoring, setIsRestoring] = useState<string | null>(null)
  const [isHardDeleting, setIsHardDeleting] = useState<string | null>(null)
  const [deletedFarmsHidden, setDeletedFarmsHidden] = useState(false)

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
      <div className="mb-2 flex flex-col gap-2">
        <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(240px,1fr)_auto_minmax(180px,1fr)]">
          {/* Farm switcher dropdown */}
          <div className="flex min-w-0 items-center gap-2 md:justify-self-start">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((p) => !p)}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-sm transition-colors ${
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
                <div className="grid gap-1 text-left">
                  <span className="max-w-[180px] truncate font-medium text-gray-900">
                    {currentFarm?.name || 'Seleccionar granja'}
                  </span>
                  {currentFarm && <MyRole farm={currentFarm} />}
                </div>
                <svg
                  className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
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
                <div className="absolute top-full left-0 z-50 mt-1 max-h-80 w-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {myFarms?.length > 0 && (
                    <>
                      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Mis Granjas
                      </p>
                      {myFarms.map((farm: Farm) => (
                        <button
                          key={farm.id}
                          onClick={() => handleFarmSelect({ ...farm, _type: 'owned' })}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                            currentFarm?.id === farm.id
                              ? 'bg-green-50 text-green-700'
                              : 'text-gray-700'
                          }`}
                        >
                          {currentFarm?.id === farm.id ? (
                            <svg
                              className="h-4 w-4 flex-shrink-0 text-green-600"
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
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <svg
                          className="h-4 w-4 flex-shrink-0 text-gray-400"
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
                      <div className="my-1 border-t border-gray-100" />
                      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Invitaciones
                      </p>
                      {invitationFarms.map((farm: Farm) => {
                        const pending = farm.invitationMeta?.status === 'pending'
                        const isSelected = !pending && currentFarm?.id === farm.id
                        return (
                          <button
                            key={farm.id}
                            onClick={() => handleFarmSelect({ ...farm, _type: 'invited' })}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                              isSelected ? 'bg-green-50 text-green-700' : 'text-gray-700'
                            }`}
                          >
                            {isSelected ? (
                              <svg
                                className="h-4 w-4 flex-shrink-0 text-green-600"
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
                              <span className="ml-auto rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-600">
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
                className="!h-9 !w-9 shrink-0 rounded-full border border-blue-200 bg-blue-50 text-blue-700 shadow-none hover:bg-blue-100"
              />
            )}
          </div>

          {trailingAction && (
            <div className="flex shrink-0 justify-start md:justify-center md:justify-self-center">
              {trailingAction}
            </div>
          )}
          {children && <div className="min-w-0 md:justify-self-end">{children}</div>}
        </div>
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
                  notify('No se pudo aceptar la invitación')
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
                  notify('No se pudo rechazar la invitación')
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
        {deletedFarms.length > 0 && deletedFarmsHidden && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setDeletedFarmsHidden(false)}
              className="min-h-10 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              Mostrar granjas por eliminar ({deletedFarms.length})
            </button>
          </div>
        )}
        {deletedFarms.length > 0 && !deletedFarmsHidden && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-red-800">Granjas marcadas para eliminación</p>
              <button
                type="button"
                aria-label="Ocultar granjas marcadas para eliminación"
                title="Ocultar"
                onClick={() => setDeletedFarmsHidden(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                ×
              </button>
            </div>
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
                  className="flex flex-col gap-3 rounded-md border border-red-100 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{farm.name}</p>
                    <p className="text-xs text-red-600">
                      Eliminada el {deletedDate.toLocaleDateString('es-MX')} ·{' '}
                      {daysLeft > 0 ? `${daysLeft} dias para recuperar` : 'Eliminacion pendiente'}
                    </p>
                  </div>
                  <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                    <Button
                      size="sm"
                      variant="outline"
                      color="error"
                      className="min-h-11 w-full sm:w-auto"
                      disabled={isHardDeleting === farm.id || isRestoring === farm.id}
                      onClick={async () => {
                        const confirmed = await confirmAction({
                          title: 'Eliminar granja definitivamente',
                          message: `Se eliminarán permanentemente ${farm.name}, sus animales, registros, reproducciones, ventas, recordatorios e invitaciones. Esta acción no se puede deshacer.`,
                          confirmLabel: 'Eliminar definitivamente',
                          cancelLabel: 'Conservar granja',
                          danger: true,
                        })
                        if (!confirmed) return

                        setIsHardDeleting(farm.id)
                        try {
                          await hardDeleteFarm(farm.id)
                          notify('La granja y sus datos se eliminaron permanentemente', 'success')
                        } catch (error) {
                          notify(
                            error instanceof Error
                              ? error.message
                              : 'No se pudo eliminar la granja permanentemente',
                          )
                        } finally {
                          setIsHardDeleting(null)
                        }
                      }}
                    >
                      {isHardDeleting === farm.id ? 'Eliminando...' : 'Eliminar definitivamente'}
                    </Button>
                    <Button
                      size="sm"
                      variant="filled"
                      color="success"
                      className="min-h-11 w-full sm:w-auto"
                      disabled={isRestoring === farm.id || isHardDeleting === farm.id}
                      onClick={async () => {
                        setIsRestoring(farm.id)
                        try {
                          await restoreFarm(farm.id)
                          notify('La granja fue recuperada', 'success')
                        } catch (error) {
                          notify(
                            error instanceof Error
                              ? error.message
                              : 'No se pudo recuperar la granja',
                          )
                        } finally {
                          setIsRestoring(null)
                        }
                      }}
                    >
                      {isRestoring === farm.id ? 'Restaurando...' : 'Recuperar'}
                    </Button>
                  </div>
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
