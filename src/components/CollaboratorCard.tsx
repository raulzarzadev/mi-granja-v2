'use client'

import React from 'react'
import { FarmCollaborator } from '@/types/farm'
import { COLLABORATOR_ROLES } from '@/types/collaborators'
import { formatDate, toDate } from '@/lib/dates'

interface CollaboratorCardProps {
  collaborator: FarmCollaborator
  onRevoke?: (collaboratorId: string) => void | Promise<void>
  onReactivate?: (collaboratorId: string) => void | Promise<void>
}

/**
 * Tarjeta para mostrar información de un colaborador
 */
const CollaboratorCard: React.FC<CollaboratorCardProps> = ({
  collaborator,
  onRevoke,
  onReactivate
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
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-2xl flex-shrink-0">
            {roleInfo?.icon || '👤'}
          </span>
          <div className="min-w-0">
            <h4
              className="text-xs font-semibold text-gray-900 truncate"
              title={collaborator.email || collaborator.userId}
            >
              {collaborator.email || collaborator.userId}
            </h4>
            <p className="text-sm text-gray-500">
              {roleInfo?.label || collaborator.role}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap self-start">
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isActive ? 'Activo' : 'Inactivo'}
          </span>
          {isActive && onRevoke && (
            <button
              className="text-xs px-2 py-1 border border-amber-300 text-amber-800 rounded-md hover:bg-amber-50"
              onClick={() => onRevoke(collaborator.id)}
              title="Revocar acceso"
            >
              Revocar
            </button>
          )}
          {!isActive && onReactivate && (
            <button
              className="text-xs px-2 py-1 border border-green-300 text-green-700 rounded-md hover:bg-green-50"
              onClick={() => onReactivate(collaborator.id)}
              title="Reactivar acceso"
            >
              Reactivar
            </button>
          )}
        </div>
      </div>

      {roleInfo?.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {roleInfo.description}
        </p>
      )}

      <div className="space-y-2 text-xs text-gray-500">
        <div className="flex items-center justify-between gap-4">
          <span>Se unió:</span>
          <span>
            {collaborator.acceptedAt
              ? formatDate(toDate(collaborator.acceptedAt))
              : 'Pendiente'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span>Invitado por:</span>
          <span
            className="truncate ml-2 text-right max-w-[140px] sm:max-w-[200px] md:max-w-[260px]"
            title={collaborator.invitedByEmail || collaborator.invitedBy}
          >
            {collaborator.invitedByEmail || collaborator.invitedBy}
          </span>
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
