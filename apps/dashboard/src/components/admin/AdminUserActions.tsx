'use client'

import { addDoc, collection, doc, updateDoc } from 'firebase/firestore'
import React, { useState } from 'react'
import { db } from '@/lib/firebase'
import { User } from '@/types'

interface AdminUserActionsProps {
  user: User
  onClose: () => void
}

export default function AdminUserActions({ user, onClose }: AdminUserActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [newRole, setNewRole] = useState('')

  const handleAddRole = async () => {
    if (!newRole || user.roles.includes(newRole as 'admin' | 'farmer' | 'vet')) return

    setIsLoading(true)
    try {
      const updatedRoles = [...user.roles, newRole as 'admin' | 'farmer' | 'vet']
      await updateDoc(doc(db, 'users', user.id), {
        roles: updatedRoles,
        updatedAt: new Date(),
      })

      // Registrar la acción
      await addDoc(collection(db, 'adminActions'), {
        type: 'role_added',
        targetUserId: user.id,
        targetUserEmail: user.email,
        newRole: newRole,
        timestamp: new Date(),
        adminNote: `Rol ${newRole} agregado por admin`,
      })

      setNewRole('')
      alert('Rol agregado exitosamente')
    } catch (error) {
      console.error('Error adding role:', error)
      alert('Error al agregar rol')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveRole = async (roleToRemove: string) => {
    if (user.roles.length <= 1) {
      alert('El usuario debe tener al menos un rol')
      return
    }

    setIsLoading(true)
    try {
      const updatedRoles = user.roles.filter((role) => role !== roleToRemove)
      await updateDoc(doc(db, 'users', user.id), {
        roles: updatedRoles,
        updatedAt: new Date(),
      })

      // Registrar la acción
      await addDoc(collection(db, 'adminActions'), {
        type: 'role_removed',
        targetUserId: user.id,
        targetUserEmail: user.email,
        removedRole: roleToRemove,
        timestamp: new Date(),
        adminNote: `Rol ${roleToRemove} removido por admin`,
      })

      alert('Rol removido exitosamente')
    } catch (error) {
      console.error('Error removing role:', error)
      alert('Error al remover rol')
    } finally {
      setIsLoading(false)
    }
  }

  const suspendUser = async () => {
    if (!confirm(`¿Estás seguro de suspender al usuario ${user.email}?`)) return

    setIsLoading(true)
    try {
      await updateDoc(doc(db, 'users', user.id), {
        suspended: true,
        suspendedAt: new Date(),
        updatedAt: new Date(),
      })

      // Registrar la acción
      await addDoc(collection(db, 'adminActions'), {
        type: 'user_suspended',
        targetUserId: user.id,
        targetUserEmail: user.email,
        timestamp: new Date(),
        adminNote: `Usuario suspendido por admin`,
      })

      alert('Usuario suspendido exitosamente')
      onClose()
    } catch (error) {
      console.error('Error suspending user:', error)
      alert('Error al suspender usuario')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Acciones para {user.email}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Información del usuario */}
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600">Granja: {user.farmName || 'Sin nombre'}</p>
              <p className="text-sm text-gray-600">Roles actuales: {user.roles.join(', ')}</p>
            </div>

            {/* Gestión de roles */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Gestionar Roles</h4>

              {/* Roles actuales */}
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-1">Roles actuales:</p>
                <div className="flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {role}
                      <button
                        onClick={() => handleRemoveRole(role)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                        disabled={isLoading}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Agregar nuevo rol */}
              <div className="flex gap-2">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar rol</option>
                  <option value="admin">Admin</option>
                  <option value="vet">Veterinario</option>
                  <option value="farmer">Granjero</option>
                </select>
                <button
                  onClick={handleAddRole}
                  disabled={!newRole || isLoading}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Acciones peligrosas */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-red-700 mb-2">Acciones Administrativas</h4>
              <button
                onClick={suspendUser}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Procesando...' : 'Suspender Usuario'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
