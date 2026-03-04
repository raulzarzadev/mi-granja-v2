'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { calculateMonthlyTotal, formatMXN, type PlanType } from '@/types/billing'

interface SubscriptionSummary {
  userId: string
  email: string
  planType: string
  status: string
  monthlyAmount: number
  farmQuantity: number
  collaboratorQuantity: number
  actualFarmCount: number
  actualCollaboratorCount: number
  maxFarms: number
  maxCollaborators: number
}

interface BillingStats {
  totalSubscriptions: number
  activeSubscriptions: number
  pastDueSubscriptions: number
  canceledSubscriptions: number
  mrr: number
}

interface EditForm {
  planType: PlanType
  farmQuantity: number
  collaboratorQuantity: number
}

const AdminBilling: React.FC = () => {
  const [stats, setStats] = useState<BillingStats | null>(null)
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<SubscriptionSummary | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ planType: 'free', farmQuantity: 0, collaboratorQuantity: 0 })
  const [isSaving, setIsSaving] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) return

      const res = await fetch('/api/admin/billing', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
        setSubscriptions(data.subscriptions)
      }
    } catch (error) {
      console.error('Error cargando datos de billing admin:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openEditModal = (sub: SubscriptionSummary) => {
    setEditingUser(sub)
    setEditForm({
      planType: sub.planType as PlanType,
      farmQuantity: sub.farmQuantity,
      collaboratorQuantity: sub.collaboratorQuantity,
    })
  }

  const handleSave = async () => {
    if (!editingUser) return
    setIsSaving(true)
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
          userId: editingUser.userId,
          planType: editForm.planType,
          farmQuantity: editForm.farmQuantity,
          collaboratorQuantity: editForm.collaboratorQuantity,
        }),
      })

      if (res.ok) {
        setEditingUser(null)
        await loadData()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al guardar')
      }
    } catch (error) {
      console.error('Error guardando plan:', error)
      alert('Error al guardar el plan')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Billing & Suscripciones</h2>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4 text-center">
            <p className="text-3xl font-bold text-green-700">{formatMXN(stats.mrr)}</p>
            <p className="text-xs text-gray-500 mt-1">MRR (Ingresos Mensuales)</p>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <p className="text-3xl font-bold text-blue-700">{stats.activeSubscriptions}</p>
            <p className="text-xs text-gray-500 mt-1">Suscripciones Activas</p>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.pastDueSubscriptions}</p>
            <p className="text-xs text-gray-500 mt-1">Past Due</p>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{stats.canceledSubscriptions}</p>
            <p className="text-xs text-gray-500 mt-1">Canceladas</p>
          </div>
        </div>
      )}

      {/* Subscriptions table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Plan</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Granjas</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Colab.</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Monto/mes</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {subscriptions.map((sub) => {
              const farmsExceed = sub.actualFarmCount > sub.maxFarms
              const collabsExceed = sub.actualCollaboratorCount > sub.maxCollaborators
              return (
                <tr key={sub.userId}>
                  <td className="px-4 py-3 text-gray-900">{sub.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      sub.planType === 'pro' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {sub.planType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      sub.status === 'active' ? 'bg-green-100 text-green-700' :
                      sub.status === 'past_due' ? 'bg-yellow-100 text-yellow-700' :
                      sub.status === 'none' ? 'bg-gray-100 text-gray-500' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${farmsExceed ? 'text-red-600' : ''}`}>
                    {sub.actualFarmCount}/{sub.maxFarms}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${collabsExceed ? 'text-red-600' : ''}`}>
                    {sub.actualCollaboratorCount}/{sub.maxCollaborators}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatMXN(sub.monthlyAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openEditModal(sub)}
                      className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                    >
                      Editar Plan
                    </button>
                  </td>
                </tr>
              )
            })}
            {subscriptions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No hay usuarios registrados aun.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Editar Plan</h3>
            <p className="text-sm text-gray-500 mb-4">{editingUser.email}</p>

            <div className="space-y-4">
              {/* Plan Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de plan</label>
                <select
                  value={editForm.planType}
                  onChange={(e) => setEditForm((f) => ({
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

              {editForm.planType === 'pro' && (
                <>
                  {/* Farm Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Granjas adicionales (farmQuantity)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.farmQuantity}
                      onChange={(e) => setEditForm((f) => ({ ...f, farmQuantity: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Total granjas permitidas: {editForm.farmQuantity + 1} (1 incluida + {editForm.farmQuantity} adicionales)
                    </p>
                  </div>

                  {/* Collaborator Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Colaboradores (collaboratorQuantity)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.collaboratorQuantity}
                      onChange={(e) => setEditForm((f) => ({ ...f, collaboratorQuantity: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  {/* Estimated monthly */}
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-sm text-gray-700">
                      Monto mensual estimado:{' '}
                      <span className="font-bold text-green-700">
                        {formatMXN(calculateMonthlyTotal(editForm.farmQuantity, editForm.collaboratorQuantity))}
                      </span>
                    </p>
                  </div>
                </>
              )}

              {/* Uso actual */}
              <div className="bg-blue-50 rounded-md p-3 text-sm text-blue-800">
                Uso actual: {editingUser.actualFarmCount} granjas, {editingUser.actualCollaboratorCount} colaboradores
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminBilling
