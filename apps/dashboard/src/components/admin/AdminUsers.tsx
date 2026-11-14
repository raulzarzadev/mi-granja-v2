'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import React, { useState } from 'react'
import { EmojiIcon } from '@/components/Icon/emoji-icons'
import LoadingSpinner from '@/components/LoadingSpinner'
import { type AdminUser, useAdminUsers } from '@/hooks/admin/useAdminUsers'
import { animal_icon, animals_types_labels } from '@/types/animals'
import AdminUserActions from './AdminUserActions'
import AdminUserPlanModal from './AdminUserPlanModal'
import AiUserHistory from './AiUserHistory'

export default function AdminUsers() {
  const { users, isLoading, error, refreshUsers } = useAdminUsers()
  const [aiUser, setAiUser] = useState<AdminUser | null>(null)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [planUser, setPlanUser] = useState<AdminUser | null>(null)
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error al cargar usuarios: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion de Usuarios</h1>
          <p className="text-gray-600 mt-1">Administra los usuarios y sus permisos</p>
        </div>
        <div className="text-sm text-gray-500">Total: {users.length} usuarios</div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Granja
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Roles
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha de Registro
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const isExpanded = expandedUserId === user.id
              return (
                <React.Fragment key={user.id}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-gray-400 transition-transform text-xs ${isExpanded ? 'rotate-90' : ''}`}
                        >
                          &#9654;
                        </span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">
                            {user.farms.length} {user.farms.length === 1 ? 'granja' : 'granjas'} ·{' '}
                            {user.totalAnimals} animales
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.farmName || 'Sin nombre'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              role === 'admin'
                                ? 'bg-red-100 text-red-800'
                                : role === 'vet'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                            }`}
                          >
                            <EmojiIcon
                              emoji={
                                role === 'admin'
                                  ? '👑'
                                  : role === 'vet'
                                    ? '🩺'
                                    : role === 'farmer'
                                      ? '🌾'
                                      : null
                              }
                            />
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.planType === 'pro'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {user.planType === 'pro' ? 'Pro' : 'Free'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <span className="font-medium capitalize text-gray-900">{user.tierId}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(user.createdAt, 'PP', { locale: es })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setAiUser(user)
                        }}
                        className="min-h-11 cursor-pointer rounded-lg px-3 text-green-700 hover:bg-green-50"
                      >
                        Uso de IA
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedUser(user)
                        }}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Gestionar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setPlanUser(user)
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        Gestionar Plan
                      </button>
                    </td>
                  </tr>

                  {/* Desglose de granjas expandido */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="px-0 py-0">
                        <div className="bg-gray-50 border-t border-b border-gray-200 px-8 py-4">
                          {user.farms.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">Sin granjas registradas</p>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Granjas del usuario
                              </p>
                              {user.farms.map((farm) => {
                                const farmAnimals = user.animalsByFarm.get(farm.id) || []
                                const totalFarmAnimals = farmAnimals.reduce(
                                  (s, a) => s + a.count,
                                  0,
                                )
                                return (
                                  <div
                                    key={farm.id}
                                    className="bg-white rounded-lg border border-gray-200 p-4"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-900">
                                          {farm.name}
                                        </h4>
                                        <p className="text-xs text-gray-500">
                                          Creada {format(farm.createdAt, 'PP', { locale: es })}
                                          {farm.collaborators.length > 0 && (
                                            <>
                                              {' '}
                                              · {farm.collaborators.length}{' '}
                                              {farm.collaborators.length === 1
                                                ? 'colaborador'
                                                : 'colaboradores'}
                                            </>
                                          )}
                                        </p>
                                      </div>
                                      <span className="text-sm font-medium text-gray-700">
                                        {totalFarmAnimals}{' '}
                                        {totalFarmAnimals === 1 ? 'animal' : 'animales'}
                                      </span>
                                    </div>

                                    {/* Animales por especie */}
                                    {farmAnimals.length > 0 ? (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {farmAnimals.map((summary) => (
                                          <span
                                            key={summary.type}
                                            className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 text-xs font-medium text-gray-700"
                                          >
                                            <span>
                                              <EmojiIcon emoji={animal_icon[summary.type]} />
                                            </span>
                                            <span>{animals_types_labels[summary.type]}</span>
                                            <span className="bg-gray-200 rounded-full px-1.5 text-gray-900 font-semibold">
                                              {summary.count}
                                            </span>
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-400 mt-1 italic">
                                        Sin animales
                                      </p>
                                    )}

                                    {/* Colaboradores */}
                                    {farm.collaborators.length > 0 && (
                                      <div className="mt-3 pt-2 border-t border-gray-100">
                                        <p className="text-xs text-gray-500 mb-1">Colaboradores:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {farm.collaborators.map((collab, idx) => (
                                            <span
                                              key={collab.userId || idx}
                                              className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 text-xs"
                                            >
                                              {collab.email || collab.userId || 'Desconocido'}
                                              {collab.role && (
                                                <span className="text-blue-400">
                                                  ({collab.role})
                                                </span>
                                              )}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {aiUser && (
        <AiUserHistory
          key={aiUser.id}
          userId={aiUser.id}
          name={aiUser.email}
          onClose={() => setAiUser(null)}
        />
      )}
      {/* Modal de acciones de usuario */}
      {selectedUser && (
        <AdminUserActions user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {planUser && (
        <AdminUserPlanModal
          key={planUser.id}
          userId={planUser.id}
          email={planUser.email}
          onClose={() => setPlanUser(null)}
          onSaved={refreshUsers}
        />
      )}
    </div>
  )
}
