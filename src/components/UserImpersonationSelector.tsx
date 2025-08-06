'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUsersCRUD } from '@/hooks/useUsersCRUD'
import { User } from '@/types'

interface UserImpersonationSelectorProps {
  onClose: () => void
}

const UserImpersonationSelector: React.FC<UserImpersonationSelectorProps> = ({
  onClose
}) => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { user, impersonatingUser, startImpersonation, stopImpersonation } =
    useAuth()

  const { find } = useUsersCRUD()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await find()
      setUsers(response)
    } catch (error) {
      console.error('Error al cargar usuarios:', { error })
    } finally {
      setLoading(false)
    }
  }, [find])

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleImpersonate = async (targetUser: User) => {
    try {
      const response = users.find((u) => u.id === targetUser.id)
      const token = crypto.randomUUID() // Simulación de token, reemplazar con lógica real

      if (response && user) {
        startImpersonation(user, response, token)
      }
      onClose()
    } catch (error) {
      console.error('Error al suplantar usuario:', error)
    }
  }

  const handleStopImpersonation = () => {
    stopImpersonation()
    onClose()
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.farmName &&
        u.farmName.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return <div className="text-center py-4">Cargando usuarios...</div>
  }

  return (
    <div className="bg-white text-gray-900 rounded-lg shadow-lg p-4 max-w-md mx-auto">
      {impersonatingUser && (
        <div className="bg-yellow-100 border border-yellow-400 rounded p-3 mb-4">
          <p className="text-sm">
            <strong>Actuando como:</strong>{' '}
            {impersonatingUser.farmName || impersonatingUser.email}
          </p>
          <button
            onClick={handleStopImpersonation}
            className="mt-2 bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
          >
            Volver a mi cuenta
          </button>
        </div>
      )}

      <input
        type="text"
        placeholder="Buscar por email o nombre de granja..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded mb-4"
      />

      <div className="max-h-60 overflow-y-auto">
        {filteredUsers.map((targetUser) => (
          <div
            key={targetUser.id}
            className="flex justify-between items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => handleImpersonate(targetUser)}
          >
            <div>
              <p className="font-medium">
                {targetUser.farmName || 'Sin nombre'}
              </p>
              <p className="text-sm text-gray-600">{targetUser.email}</p>
            </div>
            <div className="text-right">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  targetUser.isActive ? 'bg-green-500' : 'bg-gray-400'
                }`}
              ></span>
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <p className="text-center text-gray-500 py-4">
          No se encontraron usuarios
        </p>
      )}
    </div>
  )
}

export default UserImpersonationSelector
