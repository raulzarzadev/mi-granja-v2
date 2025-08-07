'use client'

import React from 'react'
import { FarmCollaborator, COLLABORATOR_ROLES } from '@/types/farm'

interface CollaboratorCardProps {
  collaborator: FarmCollaborator
}

/**
 * Tarjeta para mostrar información de un colaborador
 */
const CollaboratorCard: React.FC<CollaboratorCardProps> = ({
  collaborator
}) => {
  const roleInfo = COLLABORATOR_ROLES.find(
    (role) => role.value === collaborator.role
  )
  const isActive = collaborator.isActive

  return (
    <div
      className={`bg-white rounded-lg border p-4 transition-all hover:shadow-md ${
        isActive ? 'border-green-200' : 'border-gray-200 opacity-75'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{roleInfo?.icon || '👤'}</span>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">
              {collaborator.userId}
            </h4>
            <p className="text-sm text-gray-500">
              {roleInfo?.label || collaborator.role}
            </p>
          </div>
        </div>

        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {isActive ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {roleInfo?.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {roleInfo.description}
        </p>
      )}

      <div className="space-y-2 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Se unió:</span>
          <span>
            {collaborator.acceptedAt?.toLocaleDateString() || 'Pendiente'}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Invitado por:</span>
          <span className="truncate ml-2">{collaborator.invitedBy}</span>
        </div>
      </div>

      {collaborator.notes && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p
            className="text-xs text-gray-500 line-clamp-2"
            title={collaborator.notes}
          >
            📝 {collaborator.notes}
          </p>
        </div>
      )}
    </div>
  )
}

export default CollaboratorCard
