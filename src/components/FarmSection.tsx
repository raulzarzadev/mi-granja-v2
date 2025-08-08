'use client'

import React, { useState } from 'react'
import { useFarmAreas } from '@/hooks/useFarmAreas'
import { useFarmCollaborators } from '@/hooks/useFarmCollaborators'
import LoadingSpinner from '@/components/LoadingSpinner'
import { FARM_AREA_TYPES } from '@/types/farm'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
// import ModalCreateFarm from './ModalCreateFarm'
import ModalCreateArea from './ModalCreateArea'
import ModalCreateFarm from './ModalCreateFarm'
import AreaCard from './AreaCard'
import ModalInviteCollaborator from './ModalInviteCollaborator'
import CollaboratorCard from './CollaboratorCard'
import { formatDate, toDate } from '@/lib/dates'
import { useMyInvitations } from '@/hooks/useMyInvitations'

/**
 * Sección principal de gestión de granja
 * Permite crear granja, gestionar áreas y colaboradores
 */
const FarmSection: React.FC = () => {
  const {
    farms,
    currentFarm,
    isLoading: farmsLoading,
    switchFarm,
    loadAndSwitchFarm
  } = useFarmCRUD()

  const { areas, isLoading: areasLoading, getAreaStats } = useFarmAreas()

  const {
    collaborators,
    invitations,
    isLoading: collaboratorsLoading,
    getCollaboratorStats,
    cancelInvitation,
    revokeInvitation,
    deleteInvitation,
    updateCollaborator
  } = useFarmCollaborators(currentFarm?.id)

  const [activeSubTab, setActiveSubTab] = useState<
    'overview' | 'areas' | 'collaborators'
  >('overview')

  const areaStats = getAreaStats()
  const collaboratorStats = getCollaboratorStats()

  // Invitaciones del usuario actual para elegir granja si no tiene propias
  const myInv = useMyInvitations()

  if (farmsLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
        <span className="ml-3 text-gray-600">
          Cargando información de la granja...
        </span>
      </div>
    )
  }

  // Si no hay granjas, mostrar formulario para crear la primera
  if (farms.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          {myInv.isLoading ? (
            <div className="flex items-center">
              <LoadingSpinner />
              <span className="ml-3 text-gray-600">
                Cargando invitaciones...
              </span>
            </div>
          ) : myInv.getPending().length === 0 &&
            myInv.getAccepted().length === 0 ? (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                No tienes invitaciones por ahora.
              </p>
              <div className="flex justify-center">
                <ModalCreateFarm />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Aceptadas: acceso directo */}
              {myInv.getAccepted().map((inv) => (
                <div key={inv.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 truncate">
                      {inv.email}
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                      Aceptada
                    </span>
                  </div>
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
              {/* Pendientes: links para aceptar/rechazar */}
              {myInv.getPending().map((inv) => (
                <div
                  key={inv.id}
                  className="border rounded-lg p-4 bg-orange-50 border-orange-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 truncate">
                      {inv.email}
                    </span>
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                      Pendiente
                    </span>
                  </div>
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
              {/* CTA crear granja propia */}
              <div className="border rounded-lg p-4 flex flex-col items-center justify-center">
                <p className="text-sm text-gray-600 mb-3">
                  ¿Quieres crear tu propia granja?
                </p>
                <ModalCreateFarm />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con información de la granja actual */}
      {currentFarm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentFarm.name}
              </h2>
              {currentFarm.description && (
                <p className="text-gray-600 mt-1">{currentFarm.description}</p>
              )}
              {currentFarm.location?.city && (
                <p className="text-sm text-gray-500 mt-1">
                  📍 {currentFarm.location.city}
                  {currentFarm.location.state &&
                    `, ${currentFarm.location.state}`}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {farms.length > 1 && (
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={currentFarm.id}
                  onChange={(e) => {
                    switchFarm(e.target.value)
                  }}
                >
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Navegación de sub-tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeSubTab === 'overview'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              📊 Resumen
            </button>
            <button
              onClick={() => setActiveSubTab('areas')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeSubTab === 'areas'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              🏗️ Áreas ({areaStats.active})
            </button>
            <button
              onClick={() => setActiveSubTab('collaborators')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeSubTab === 'collaborators'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              👥 Equipo ({collaboratorStats.total})
              {collaboratorStats.pending > 0 && (
                <span className="ml-1 bg-orange-100 text-orange-800 text-xs px-1.5 py-0.5 rounded-full">
                  {collaboratorStats.pending}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Contenido según sub-tab activo */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Estadísticas generales */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🏗️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Áreas Totales
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {areaStats.total}
                </p>
                <p className="text-xs text-gray-500">
                  {areaStats.active} activas, {areaStats.inactive} inactivas
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Colaboradores
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {collaboratorStats.total}
                </p>
                {collaboratorStats.pending > 0 && (
                  <p className="text-xs text-orange-600">
                    {collaboratorStats.pending} invitaciones pendientes
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Áreas por tipo */}
          {Object.entries(areaStats.byType)
            .slice(0, 2)
            .map(([type, count]) => {
              const typeInfo = FARM_AREA_TYPES.find((t) => t.value === type)
              return (
                <div key={type} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">{typeInfo?.icon || '📍'}</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">
                        {typeInfo?.label || type}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {count}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {activeSubTab === 'areas' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Áreas de la Granja
              </h3>
              <ModalCreateArea />
            </div>

            {areasLoading ? (
              <div className="flex justify-center items-center py-8">
                <LoadingSpinner />
                <span className="ml-3 text-gray-600">Cargando áreas...</span>
              </div>
            ) : areas.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">🏗️</span>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  No hay áreas creadas
                </h4>
                <p className="text-gray-600 mb-4">
                  Crea áreas para organizar mejor tu granja
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {areas.map((area) => (
                  <AreaCard key={area.id} area={area} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'collaborators' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Equipo de Trabajo
              </h3>
              <ModalInviteCollaborator />
            </div>

            {collaboratorsLoading ? (
              <div className="flex justify-center items-center py-8">
                <LoadingSpinner />
                <span className="ml-3 text-gray-600">Cargando equipo...</span>
              </div>
            ) : collaborators.length === 0 && invitations.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">👥</span>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Trabaja en equipo
                </h4>
                <p className="text-gray-600 mb-4">
                  Invita colaboradores para gestionar la granja juntos
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Invitaciones pendientes */}
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
                            <span className="font-medium text-gray-900">
                              {invitation.email}
                            </span>
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                              Pendiente
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            Rol: {invitation.role}
                          </p>
                          <p className="text-xs text-gray-500">
                            Expira: {formatDate(toDate(invitation.expiresAt))}
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button
                              className="text-xs px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                              title="Marcar como rechazada (si el invitado la declina)"
                              onClick={async () => {
                                if (
                                  confirm(
                                    `¿Marcar como rechazada la invitación a ${invitation.email}?`
                                  )
                                ) {
                                  try {
                                    await cancelInvitation(invitation.id)
                                  } catch (e) {
                                    console.error(e)
                                  }
                                }
                              }}
                            >
                              Cancelar
                            </button>
                            <button
                              className="text-xs px-3 py-1 rounded-md border border-amber-300 text-amber-800 hover:bg-amber-50"
                              onClick={async () => {
                                if (
                                  confirm(
                                    `¿Revocar la invitación a ${invitation.email}? No podrá usarse más.`
                                  )
                                ) {
                                  try {
                                    await revokeInvitation(invitation.id)
                                  } catch (e) {
                                    console.error(e)
                                  }
                                }
                              }}
                            >
                              Revocar
                            </button>
                            <button
                              className="text-xs px-3 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                              onClick={async () => {
                                if (
                                  confirm(
                                    `¿Eliminar definitivamente la invitación a ${invitation.email}? Esta acción no se puede deshacer.`
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
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colaboradores activos */}
                {collaborators.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">
                      Colaboradores Activos ({collaborators.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {collaborators.map((collaborator) => (
                        <CollaboratorCard
                          key={collaborator.id}
                          collaborator={collaborator}
                          onRevoke={async (id) => {
                            if (
                              confirm(
                                '¿Revocar acceso de este colaborador? Podrás reactivarlo más adelante.'
                              )
                            ) {
                              try {
                                await updateCollaborator(id, {
                                  isActive: false
                                })
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
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FarmSection
