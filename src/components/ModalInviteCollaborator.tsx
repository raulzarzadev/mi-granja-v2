'use client'

import React, { useState } from 'react'
import { Modal } from './Modal'
import { useModal } from '@/hooks/useModal'
import { useFarmCollaborators } from '@/hooks/useFarmCollaborators'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { COLLABORATOR_ROLES, DEFAULT_PERMISSIONS } from '@/types/farm'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'

/**
 * Modal para invitar colaboradores a la granja
 */
const ModalInviteCollaborator: React.FC = () => {
  const { isOpen, openModal, closeModal } = useModal()
  const { user } = useSelector((state: RootState) => state.auth)
  const { currentFarm } = useFarmCRUD()
  const { inviteCollaborator } = useFarmCollaborators(currentFarm?.id)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    role: 'caretaker' as const,
    notes: ''
  })

  const selectedRole = COLLABORATOR_ROLES.find(
    (role) => role.value === formData.role
  )
  const selectedPermissions = DEFAULT_PERMISSIONS[formData.role]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email.trim() || !user?.id) {
      return
    }

    setIsLoading(true)
    try {
      await inviteCollaborator(formData.email.trim(), formData.role, user.id)

      // Limpiar formulario
      setFormData({
        email: '',
        role: 'caretaker',
        notes: ''
      })

      closeModal()
    } catch (error) {
      console.error('Error inviting collaborator:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <>
      <button
        onClick={openModal}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
      >
        <span>✉️</span>
        Invitar Colaborador
      </button>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title="Invitar Colaborador"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="collaboratorEmail"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Correo Electrónico *
            </label>
            <input
              id="collaboratorEmail"
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="colaborador@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Rol */}
          <div>
            <label
              htmlFor="collaboratorRole"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Rol en la Granja *
            </label>
            <select
              id="collaboratorRole"
              required
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {COLLABORATOR_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.icon} {role.label}
                </option>
              ))}
            </select>

            {selectedRole && (
              <p className="text-sm text-gray-600 mt-2">
                {selectedRole.description}
              </p>
            )}
          </div>

          {/* Vista previa de permisos */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Permisos incluidos con este rol:
            </h4>
            <div className="space-y-2">
              {selectedPermissions.map((permission, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700 capitalize">
                    {permission.module}
                  </span>
                  <div className="flex gap-1">
                    {permission.actions.map((action) => (
                      <span
                        key={action}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">
              📧 Proceso de invitación
            </h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Se enviará una invitación por correo electrónico</li>
              <li>• La invitación expirará en 7 días</li>
              <li>• El colaborador debe crear una cuenta para aceptar</li>
            </ul>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={closeModal}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.email.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <span>✉️</span>
                  Enviar Invitación
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export default ModalInviteCollaborator
