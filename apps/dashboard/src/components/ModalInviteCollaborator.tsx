'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { useBilling } from '@/hooks/useBilling'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useFarmMembers } from '@/hooks/useFarmMembers'
import { useModal } from '@/hooks/useModal'
import { COLLABORATOR_ROLES, DEFAULT_PERMISSIONS } from '@/types/collaborators'
import Button from './buttons/Button'
import { Modal } from './Modal'

/**
 * Modal para invitar colaboradores a la granja
 */
type ModalInviteCollaboratorProps = {
  open?: boolean
  onClose?: () => void
  showTrigger?: boolean
}

const ModalInviteCollaborator: React.FC<ModalInviteCollaboratorProps> = ({
  open: externalOpen,
  onClose: externalOnClose,
  showTrigger = true,
}) => {
  const modal = useModal()
  const isControlled = externalOpen !== undefined
  const isOpen = isControlled ? externalOpen : modal.isOpen
  const openModal = isControlled ? () => {} : modal.openModal
  const closeModal = isControlled ? (externalOnClose ?? (() => {})) : modal.closeModal
  const { user } = useSelector((state: RootState) => state.auth)
  const { currentFarm } = useFarmCRUD()
  const { canInviteCollaborator, usage } = useBilling()
  const { inviteCollaborator } = useFarmMembers(currentFarm?.id)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    role: 'caretaker' as const,
    notes: '',
  })

  const selectedRole = COLLABORATOR_ROLES.find((role) => role.value === formData.role)
  const selectedPermissions = DEFAULT_PERMISSIONS[formData.role]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email.trim() || !user?.id) {
      setError('Email y usuario son requeridos')
      return
    }

    if (!currentFarm?.id) {
      setError('No hay granja seleccionada')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      await inviteCollaborator(formData.email.trim(), formData.role, user.id)

      // Limpiar formulario
      setFormData({
        email: '',
        role: 'caretaker',
        notes: '',
      })

      closeModal()
    } catch (err) {
      console.error('Error inviting collaborator:', err)
      setError(
        err instanceof Error ? err.message : 'Error al enviar la invitacion. Revisa la consola.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <>
      {showTrigger && (
        <Button size="sm" variant="filled" color="primary" icon="add" onClick={openModal}>
          Invitar Colaborador
        </Button>
      )}

      <Modal isOpen={isOpen} onClose={closeModal} title="Invitar Colaborador" size="md">
        {!canInviteCollaborator() ? (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <span className="text-4xl">👥</span>
              <h3 className="text-lg font-semibold text-gray-900 mt-2">
                No tienes lugares disponibles
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Tu plan actual solo incluye{' '}
                <strong>
                  {usage?.totalPlaces ?? 0} {(usage?.totalPlaces ?? 0) === 1 ? 'lugar' : 'lugares'}
                </strong>{' '}
                y {usage?.usedPlaces === 1 ? 'esta usando' : 'estan usando'}{' '}
                <strong>{usage?.usedPlaces ?? 0}</strong>.
              </p>
              {usage && (
                <p className="text-xs text-gray-400 mt-1">
                  ({usage.farmCount} {usage.farmCount === 1 ? 'granja' : 'granjas'} +{' '}
                  {usage.collaboratorCount}{' '}
                  {usage.collaboratorCount === 1 ? 'colaborador' : 'colaboradores'})
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">Necesitas mas lugares?</p>
              <p>
                Cada lugar extra te permite agregar una granja o un colaborador. Solicita mas
                lugares enviando un correo a{' '}
                <a
                  href="mailto:admin@migranja.app"
                  className="font-semibold underline hover:text-blue-900"
                >
                  admin@migranja.app
                </a>
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="ghost" color="neutral" size="sm" onClick={closeModal}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
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
                <p className="text-sm text-gray-600 mt-2">{selectedRole.description}</p>
              )}
            </div>

            {/* Vista previa de permisos */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Permisos incluidos con este rol:
              </h4>
              <div className="space-y-2">
                {selectedPermissions.map((permission, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 capitalize">{permission.module}</span>
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
              <h4 className="text-sm font-medium text-yellow-800 mb-2">📧 Proceso de invitación</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Se enviará una invitación por correo electrónico</li>
                <li>• La invitación expirará en 7 días</li>
                <li>• El colaborador debe crear una cuenta para aceptar</li>
              </ul>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="ghost"
                color="neutral"
                size="sm"
                onClick={closeModal}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="filled"
                color="primary"
                size="sm"
                disabled={isLoading || !formData.email.trim()}
              >
                {isLoading ? 'Enviando...' : 'Enviar Invitacion'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}

export default ModalInviteCollaborator
