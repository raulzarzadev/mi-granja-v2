'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { useFarmMembers } from '@/hooks/useFarmMembers'
import { FarmCollaborator } from '@/types/collaborators'
import { DEFAULT_PERMISSIONS } from '@/types/collaborators'
import { COLLABORATOR_ROLES } from '@/types/collaborators'
import { formatDate, toDate } from '@/lib/dates'

interface ModalEditCollaboratorProps {
  isOpen: boolean
  onClose: () => void
  collaborator: FarmCollaborator | null
  farmId?: string
}

/**
 * Modal para editar información de un colaborador
 */
const ModalEditCollaborator: React.FC<ModalEditCollaboratorProps> = ({
  isOpen,
  onClose,
  collaborator,
  farmId
}) => {
  const { updateCollaborator } = useFarmMembers(farmId)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    role: collaborator?.role || ('caretaker' as const),
    notes: collaborator?.notes || ''
  })

  // Actualizar formData cuando cambia el collaborator
  useEffect(() => {
    if (collaborator) {
      setFormData({
        role: collaborator.role as typeof formData.role,
        notes: collaborator.notes || ''
      })
    }
  }, [collaborator])

  const selectedRole = COLLABORATOR_ROLES.find(
    (role) => role.value === formData.role
  )
  const selectedPermissions = DEFAULT_PERMISSIONS[formData.role]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!collaborator) {
      return
    }

    setIsLoading(true)
    try {
      await updateCollaborator(collaborator.id, {
        role: formData.role,
        notes: formData.notes.trim() || null
      })

      onClose()
    } catch (error) {
      console.error('Error updating collaborator:', error)
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

  if (!collaborator) {
    return null
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Colaborador"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Información del colaborador (no editable) */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{selectedRole?.icon || '👤'}</span>
            <div>
              <h4 className="font-semibold text-gray-900">
                {collaborator.email || collaborator.userId}
              </h4>
              <p className="text-sm text-gray-500">
                Se unió:{' '}
                {collaborator.acceptedAt
                  ? formatDate(toDate(collaborator.acceptedAt))
                  : 'Pendiente'}
              </p>
            </div>
          </div>
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

        {/* Notas */}
        <div>
          <label
            htmlFor="collaboratorNotes"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Notas (opcional)
          </label>
          <textarea
            id="collaboratorNotes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Información adicional sobre este colaborador..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ModalEditCollaborator
