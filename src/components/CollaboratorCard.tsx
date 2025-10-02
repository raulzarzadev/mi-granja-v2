'use client'

import React, { useState, useRef, useEffect } from 'react'
import { COLLABORATOR_ROLES, FarmCollaborator } from '@/types/collaborators'
import { formatDate, toDate } from '@/lib/dates'
import { useFarmMembers } from '@/hooks/useFarmMembers'

interface CollaboratorCardProps {
  collaborator: FarmCollaborator
  onRevoke?: (collaboratorId: string) => void | Promise<void>
  onReactivate?: (collaboratorId: string) => void | Promise<void>
  onDelete?: (collaboratorId: string) => void | Promise<void>
  onEdit?: (collaborator: FarmCollaborator) => void | Promise<void>
}

/**
 * Tarjeta para mostrar información de un colaborador
 */
const CollaboratorCard: React.FC<CollaboratorCardProps> = ({
  collaborator,
  onRevoke,
  onReactivate,
  onDelete,
  onEdit
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const roleInfo = COLLABORATOR_ROLES.find(
    (role) => role.value === collaborator.role
  )
  const isActive = collaborator.isActive
  const { hasPermissions } = useFarmMembers()

  const canManageInvite = hasPermissions('invitations', 'update')

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  return (
    <div
      className={`bg-white rounded-lg border p-4 transition-all hover:shadow-md ${
        isActive ? 'border-green-200' : 'border-gray-200 opacity-75'
      }`}
    >
      {/* Header con estado y menú */}
      <div className="flex items-center justify-between mb-3">
        {/* Estado del colaborador */}
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {isActive ? 'Activo' : 'Inactivo'}
        </span>

        {/* Menú de tres puntos */}
        {canManageInvite && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Opciones"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <circle cx="10" cy="5" r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="10" cy="15" r="1.5" />
              </svg>
            </button>

            {/* Menú desplegable */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  {onEdit && (
                    <button
                      onClick={() => {
                        onEdit(collaborator)
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Editar
                    </button>
                  )}

                  {isActive && onRevoke && (
                    <button
                      onClick={() => {
                        onRevoke(collaborator.id)
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                    >
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
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                      Revocar acceso
                    </button>
                  )}

                  {!isActive && onReactivate && (
                    <button
                      onClick={() => {
                        onReactivate(collaborator.id)
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                    >
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
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Reactivar acceso
                    </button>
                  )}

                  {onDelete && (
                    <>
                      <div className="border-t border-gray-200 my-1" />
                      <button
                        onClick={() => {
                          onDelete(collaborator.id)
                          setIsMenuOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                      >
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Información del colaborador */}

      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-2xl flex-shrink-0">
            {roleInfo?.icon || '👤'}
          </span>
          <div className="min-w-0">
            <h4
              className="text-xs font-semibold text-gray-900 truncate"
              title={
                collaborator.email && collaborator.userId !== collaborator.email
                  ? `${collaborator.email} (${collaborator.userId})`
                  : collaborator.email || collaborator.userId
              }
            >
              {collaborator.email || collaborator.userId}
            </h4>
            <p className="text-sm text-gray-500">
              {roleInfo?.label || collaborator.role}
            </p>
          </div>
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
