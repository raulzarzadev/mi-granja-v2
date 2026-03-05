'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import React, { useCallback, useState } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useAdminUsers, type AdminUser } from '@/hooks/admin/useAdminUsers'
import { auth } from '@/lib/firebase'
import AdminUserActions from './AdminUserActions'

interface UserPlanData {
  places: number
  planType: string
  actualFarmCount: number
  actualCollaboratorCount: number
  usedPlaces: number
}

export default function AdminUsers() {
  const { users, isLoading, error, refreshUsers } = useAdminUsers()
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [planUser, setPlanUser] = useState<AdminUser | null>(null)
  const [planData, setPlanData] = useState<UserPlanData | null>(null)
  const [placesInput, setPlacesInput] = useState(0)
  const [isSavingPlan, setIsSavingPlan] = useState(false)
  const [isLoadingPlan, setIsLoadingPlan] = useState(false)

  const loadPlanData = useCallback(async (userId: string) => {
    setIsLoadingPlan(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) return

      const res = await fetch(`/api/admin/billing?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data: UserPlanData = await res.json()
        setPlanData(data)
        setPlacesInput(data.places)
      }
    } catch (err) {
      console.error('Error cargando plan:', err)
    } finally {
      setIsLoadingPlan(false)
    }
  }, [])

  const openPlanModal = useCallback((user: AdminUser) => {
    setPlanUser(user)
    setPlanData(null)
    setPlacesInput(0)
    loadPlanData(user.id)
  }, [loadPlanData])

  const handleSavePlan = async () => {
    if (!planUser) return
    setIsSavingPlan(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) return

      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: planUser.id,
          places: placesInput,
        }),
      })

      if (res.ok) {
        setPlanUser(null)
        await refreshUsers()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al guardar')
      }
    } catch (err) {
      console.error('Error guardando plan:', err)
      alert('Error al guardar el plan')
    } finally {
      setIsSavingPlan(false)
    }
  }

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
                Lugares
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
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.email}</div>
                    <div className="text-sm text-gray-500">ID: {user.id}</div>
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
                        {role === 'admin' && '\uD83D\uDC51'}
                        {role === 'vet' && '\uD83E\uDE7A'}
                        {role === 'farmer' && '\uD83C\uDF3E'}
                        {role}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.planType === 'pro' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {user.planType === 'pro' ? 'Pro' : 'Free'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                  {user.places > 0 ? (
                    <span className="font-medium text-gray-900">{user.places}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(user.createdAt, 'PP', { locale: es })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    Gestionar
                  </button>
                  <button
                    onClick={() => openPlanModal(user)}
                    className="text-green-600 hover:text-green-900"
                  >
                    Gestionar Plan
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de acciones de usuario */}
      {selectedUser && (
        <AdminUserActions user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {/* Modal de gestion de plan */}
      {planUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Gestionar Plan</h3>
            <p className="text-sm text-gray-500 mb-4">{planUser.email}</p>

            {isLoadingPlan ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Uso actual */}
                {planData && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Uso actual</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Granjas:</span>
                        <span className="font-medium text-gray-900">{planData.actualFarmCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Colaboradores:</span>
                        <span className="font-medium text-gray-900">{planData.actualCollaboratorCount}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="text-gray-500">Lugares en uso:</span>
                      <span className={`font-bold ${planData.usedPlaces > planData.places ? 'text-red-600' : 'text-gray-900'}`}>
                        {planData.usedPlaces} de {planData.places}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      1 granja incluida gratis. Cada granja extra o colaborador usa 1 lugar.
                    </p>
                  </div>
                )}

                {/* Asignar lugares */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lugares asignados
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={placesInput}
                    onChange={(e) => setPlacesInput(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {placesInput === 0
                      ? 'Plan Free: 1 granja, sin colaboradores'
                      : `Plan Pro: el usuario puede usar ${placesInput} ${placesInput === 1 ? 'lugar' : 'lugares'} para granjas extra o colaboradores`}
                  </p>
                </div>

                {/* Preview */}
                <div className={`rounded-md p-3 ${placesInput > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${placesInput > 0 ? 'text-green-800' : 'text-gray-600'}`}>
                    {placesInput > 0 ? `Pro — ${placesInput} ${placesInput === 1 ? 'lugar' : 'lugares'}` : 'Free — sin lugares extra'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setPlanUser(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isSavingPlan}
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePlan}
                disabled={isSavingPlan || isLoadingPlan}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isSavingPlan ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
