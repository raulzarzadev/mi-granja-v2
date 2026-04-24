'use client'

import React, { useState } from 'react'
import InventoryTab from '@/components/InventoryTab'
import LoadingSpinner from '@/components/LoadingSpinner'
import SalesTab from '@/components/SalesTab'
import StatisticsTab from '@/components/StatisticsTab'
import Tabs from '@/components/Tabs'
import { useFarmAreasCRUD } from '@/hooks/useFarmAreasCRUD'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useFarmMembers } from '@/hooks/useFarmMembers'
import { useMyInvitations } from '@/hooks/useMyInvitations'
import { formatDate, toDate } from '@/lib/dates'
import { FarmCollaborator } from '@/types/collaborators'
import { FARM_AREA_TYPES, FarmInvitation } from '@/types/farm'
import AreaCard from './AreaCard'
import BackupSection from './BackupSection'
import BreedingConfigTab from './BreedingConfigTab'
import MigrationBanner from './billing/MigrationBanner'
import CollaboratorCard from './CollaboratorCard'
import ModalCreateArea from './ModalCreateArea'
import ModalCreateFarm from './ModalCreateFarm'
import ModalEditCollaborator from './ModalEditCollaborator'
import ModalInviteCollaborator from './ModalInviteCollaborator'

const FarmSection: React.FC = () => {
  const { farms, currentFarm, isLoading: farmsLoading, loadAndSwitchFarm } = useFarmCRUD()

  const { areas, isLoading: areasLoading, getAreaStats } = useFarmAreasCRUD()

  const {
    collaborators,
    invitations,
    isLoading: collaboratorsLoading,
    getCollaboratorStats,
    revokeInvitation,
    deleteInvitation,
    updateCollaborator,
    hasPermissions,
  } = useFarmMembers(currentFarm?.id)

  const activeColaborators = collaborators.filter((c) => c.isActive)

  const [editingCollaborator, setEditingCollaborator] = useState<FarmCollaborator | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const canRevokeInvitations = hasPermissions('collaborators', 'update')
  const canDeleteInvitations = hasPermissions('collaborators', 'delete')

  const areaStats = getAreaStats()
  const collaboratorStats = getCollaboratorStats()

  const myInv = useMyInvitations()
  const { resendInvitation } = useFarmMembers(currentFarm?.id)

  const handleResendInvitation = async ({ invitation }: { invitation: FarmInvitation }) => {
    await resendInvitation({ invitationId: invitation.id })
  }

  if (farmsLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
        <span className="ml-3 text-gray-600">Cargando informacion de la granja...</span>
      </div>
    )
  }

  if (farms.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Invitaciones</h2>
          {myInv.isLoading ? (
            <div className="flex items-center">
              <LoadingSpinner />
              <span className="ml-3 text-gray-600">Cargando invitaciones...</span>
            </div>
          ) : myInv.getPending().length === 0 && myInv.getAccepted().length === 0 ? (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">No tienes invitaciones por ahora.</p>
              <div className="flex justify-center">
                <ModalCreateFarm />
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {myInv.getAccepted().map((inv) => (
                <div key={inv.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 truncate">{inv.email}</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                      Aceptada
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mb-1 select-all break-all">
                    ID: {inv.id}
                  </p>
                  {inv.farmName && (
                    <p className="text-xs text-gray-500 mb-1">
                      Granja: <span className="font-medium">{inv.farmName}</span>
                    </p>
                  )}
                  <p className="text-sm text-gray-600">Rol: {inv.role}</p>
                  <div className="mt-3">
                    <button
                      className="text-sm text-blue-600 hover:underline"
                      onClick={async () => {
                        try {
                          await loadAndSwitchFarm(inv.farmId)
                        } catch (e) {
                          console.error(e)
                          alert('No se pudo cambiar a la granja')
                        }
                      }}
                    >
                      Ver esta granja
                    </button>
                  </div>
                </div>
              ))}
              {myInv.getPending().map((inv) => (
                <div key={inv.id} className="border rounded-lg p-4 bg-orange-50 border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 truncate">{inv.email}</span>
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                      Pendiente
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mb-1 select-all break-all">
                    ID: {inv.id}
                  </p>
                  {inv.farmName && (
                    <p className="text-xs text-gray-500 mb-1">
                      Granja: <span className="font-medium">{inv.farmName}</span>
                    </p>
                  )}
                  <p className="text-sm text-gray-600">Rol: {inv.role}</p>
                  <p className="text-xs text-gray-500">
                    Expira: {formatDate(toDate(inv.expiresAt))}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {inv.token && (
                      <a
                        className="text-xs px-3 py-1 rounded-md bg-green-600 text-white hover:bg-green-700"
                        href={myInv.getConfirmUrl(inv.token, 'accept')}
                      >
                        Aceptar
                      </a>
                    )}
                    {inv.token && (
                      <a
                        className="text-xs px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
                        href={myInv.getConfirmUrl(inv.token, 'reject')}
                      >
                        Rechazar
                      </a>
                    )}
                  </div>
                </div>
              ))}
              <div className="border rounded-lg p-4 flex flex-col items-center justify-center">
                <p className="text-sm text-gray-600 mb-3">Quieres crear tu propia granja?</p>
                <ModalCreateFarm />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const farmTabs = [
    {
      label: '📊 Resumen',
      content: (
        <div className="space-y-4">
          {currentFarm?.description && (
            <p className="text-gray-600 text-sm">{currentFarm.description}</p>
          )}
          {currentFarm?.location?.city && (
            <p className="text-sm text-gray-500">
              📍 {currentFarm.location.city}
              {currentFarm.location.state && `, ${currentFarm.location.state}`}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
              <span className="text-2xl">🏗️</span>
              <div>
                <p className="text-sm font-medium text-gray-500">Areas</p>
                <p className="text-xl font-bold text-gray-900">{areaStats.total}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div>
                <p className="text-sm font-medium text-gray-500">Equipo</p>
                <p className="text-xl font-bold text-gray-900">
                  {collaboratorStats.total}
                  {collaboratorStats.pending > 0 && (
                    <span className="text-sm font-normal text-orange-600 ml-1">
                      +{collaboratorStats.pending}
                    </span>
                  )}
                </p>
              </div>
            </div>
            {Object.entries(areaStats.byType)
              .slice(0, 2)
              .map(([type, count]) => {
                const typeInfo = FARM_AREA_TYPES.find((t) => t.value === type)
                return (
                  <div
                    key={type}
                    className="bg-white rounded-lg shadow p-4 flex items-center gap-3"
                  >
                    <span className="text-2xl">{typeInfo?.icon || '📍'}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{typeInfo?.label || type}</p>
                      <p className="text-xl font-bold text-gray-900">{count}</p>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      ),
    },
    {
      label: '📊 Estadísticas',
      content: <StatisticsTab />,
    },
    {
      label: '💲 Ventas',
      content: <SalesTab />,
    },
    {
      label: '💰 Gastos',
      content: <InventoryTab />,
    },
    {
      label: '🏗️ Areas',
      badgeCount: areaStats.active,
      content: (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Areas de la Granja</h3>
            <ModalCreateArea />
          </div>
          {areasLoading ? (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner />
              <span className="ml-3 text-gray-600">Cargando areas...</span>
            </div>
          ) : areas.length === 0 ? (
            <div className="text-center py-6">
              <span className="text-3xl mb-2 block">🏗️</span>
              <p className="text-gray-600 text-sm">Crea areas para organizar mejor tu granja</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {areas.map((area) => (
                <AreaCard key={area.id} area={area} />
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      label: '👥 Equipo',
      badgeCount: collaboratorStats.pending,
      content: (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Equipo de Trabajo</h3>
            <ModalInviteCollaborator />
          </div>
          {collaboratorsLoading ? (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner />
              <span className="ml-3 text-gray-600">Cargando equipo...</span>
            </div>
          ) : collaborators.length === 0 && invitations.length === 0 ? (
            <div className="text-center py-6">
              <span className="text-3xl mb-2 block">👥</span>
              <p className="text-gray-600 text-sm">
                Invita colaboradores para gestionar la granja juntos
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {invitations.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Invitaciones Pendientes ({invitations.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {invitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="border border-orange-200 bg-orange-50 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{invitation.email}</span>
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                            Pendiente
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Rol: {invitation.role}</p>
                        <p className="text-xs text-gray-500">
                          Expira: {formatDate(toDate(invitation.expiresAt))}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            className="text-xs px-3 py-1 rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={async () => {
                              if (confirm(`Reenviar invitacion a ${invitation.email}?`)) {
                                try {
                                  handleResendInvitation({ invitation })
                                } catch (e) {
                                  console.error(e)
                                }
                              }
                            }}
                          >
                            Reenviar
                          </button>
                          {canRevokeInvitations && (
                            <button
                              className="text-xs px-3 py-1 rounded-md border border-amber-300 text-amber-800 hover:bg-amber-50"
                              onClick={async () => {
                                if (
                                  !confirm(
                                    `Revocar la invitacion a ${invitation.email}? No podra usarse mas.`,
                                  )
                                )
                                  return
                                try {
                                  await revokeInvitation(invitation.id)
                                } catch (e) {
                                  console.error(e)
                                }
                              }}
                            >
                              Revocar
                            </button>
                          )}
                          {canDeleteInvitations && (
                            <button
                              className="text-xs px-3 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                              onClick={async () => {
                                if (
                                  confirm(
                                    `Eliminar definitivamente la invitacion a ${invitation.email}? Esta accion no se puede deshacer.`,
                                  )
                                ) {
                                  try {
                                    await deleteInvitation(invitation.id)
                                  } catch (e) {
                                    console.error(e)
                                  }
                                }
                              }}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeColaborators.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Colaboradores Activos ({activeColaborators.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeColaborators.map((collaborator) => (
                      <CollaboratorCard
                        key={collaborator.id}
                        collaborator={collaborator}
                        onEdit={(collab) => {
                          setEditingCollaborator(collab)
                          setIsEditModalOpen(true)
                        }}
                        onRevoke={async (id) => {
                          if (
                            confirm(
                              'Revocar acceso de este colaborador? Podras reactivarlo mas adelante.',
                            )
                          ) {
                            try {
                              await updateCollaborator(id, { isActive: false })
                            } catch (e) {
                              console.error(e)
                            }
                          }
                        }}
                        onReactivate={async (id) => {
                          try {
                            await updateCollaborator(id, { isActive: true })
                          } catch (e) {
                            console.error(e)
                          }
                        }}
                        onDelete={
                          canDeleteInvitations
                            ? async (id) => {
                                if (
                                  confirm(
                                    'Eliminar definitivamente este colaborador? Esto borrara la invitacion / registro asociado.',
                                  )
                                ) {
                                  try {
                                    await deleteInvitation(id)
                                  } catch (e) {
                                    console.error(e)
                                  }
                                }
                              }
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      label: '💾 Respaldos',
      content: <BackupSection />,
    },
    {
      label: '⚙️ Configuración',
      content: <BreedingConfigTab />,
    },
  ]

  return (
    <div className="space-y-6">

      <MigrationBanner />

      {currentFarm && <Tabs tabs={farmTabs} tabsId="farm-tabs" />}

      <ModalEditCollaborator
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingCollaborator(null)
        }}
        collaborator={editingCollaborator}
        farmId={currentFarm?.id}
      />
    </div>
  )
}

export default FarmSection
