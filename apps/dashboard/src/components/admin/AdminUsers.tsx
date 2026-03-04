'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import React, { useState } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useAdminUsers } from '@/hooks/admin/useAdminUsers'
import { auth } from '@/lib/firebase'
import { calculateMonthlyTotal, formatMXN, type PlanType } from '@/types/billing'
import { User } from '@/types'
import AdminUserActions from './AdminUserActions'

interface PlanForm {
  planType: PlanType
  farmQuantity: number
  collaboratorQuantity: number
}

export default function AdminUsers() {
  const { users, isLoading, error, refreshUsers } = useAdminUsers()
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [planUser, setPlanUser] = useState<User | null>(null)
  const [planForm, setPlanForm] = useState<PlanForm>({ planType: 'pro', farmQuantity: 0, collaboratorQuantity: 0 })
  const [isSavingPlan, setIsSavingPlan] = useState(false)

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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
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
                        {role === 'admin' && '👑'}
                        {role === 'vet' && '🩺'}
                        {role === 'farmer' && '🌾'}
                        {role}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.planType === 'pro' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {user.planType || 'free'}
                  </span>
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
                    onClick={() => {
                      setPlanUser(user)
                      setPlanForm({
                        planType: user.planType || 'pro',
                        farmQuantity: 0,
                        collaboratorQuantity: 0,
                      })
                    }}
                    className="text-green-600 hover:text-green-900"
                  >
                    Asignar Plan
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

      {/* Modal de asignación de plan */}
      {planUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Asignar Plan</h3>
            <p className="text-sm text-gray-500 mb-4">{planUser.email}</p>
            <p className="text-xs text-gray-400 mb-4">
              Plan actual: <span className="font-medium">{planUser.planType || 'free'}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de plan</label>
                <select
                  value={planForm.planType}
                  onChange={(e) => setPlanForm((f) => ({
                    ...f,
                    planType: e.target.value as PlanType,
                    farmQuantity: e.target.value === 'free' ? 0 : f.farmQuantity,
                    collaboratorQuantity: e.target.value === 'free' ? 0 : f.collaboratorQuantity,
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                </select>
              </div>

              {planForm.planType === 'pro' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Granjas adicionales
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={planForm.farmQuantity}
                      onChange={(e) => setPlanForm((f) => ({ ...f, farmQuantity: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Total granjas permitidas: {planForm.farmQuantity + 1} (1 incluida + {planForm.farmQuantity} adicionales)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Colaboradores
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={planForm.collaboratorQuantity}
                      onChange={(e) => setPlanForm((f) => ({ ...f, collaboratorQuantity: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-sm text-gray-700">
                      Monto mensual estimado:{' '}
                      <span className="font-bold text-green-700">
                        {formatMXN(calculateMonthlyTotal(planForm.farmQuantity, planForm.collaboratorQuantity))}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Asignacion manual — se registra con $0 MXN
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setPlanUser(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isSavingPlan}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
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
                        planType: planForm.planType,
                        farmQuantity: planForm.farmQuantity,
                        collaboratorQuantity: planForm.collaboratorQuantity,
                      }),
                    })

                    if (res.ok) {
                      setPlanUser(null)
                      await refreshUsers()
                    } else {
                      const data = await res.json()
                      alert(data.error || 'Error al asignar plan')
                    }
                  } catch (err) {
                    console.error('Error asignando plan:', err)
                    alert('Error al asignar el plan')
                  } finally {
                    setIsSavingPlan(false)
                  }
                }}
                disabled={isSavingPlan}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isSavingPlan ? 'Guardando...' : 'Asignar Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
