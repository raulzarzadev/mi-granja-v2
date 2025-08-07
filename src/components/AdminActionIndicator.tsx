'use client'

import React from 'react'
import {
  formatAdminActionMessage,
  isAdminAction,
  getAdminInfo,
  AdminActionMetadata
} from '@/lib/adminActions'
import { Animal } from '@/types/animals'

interface AdminActionIndicatorProps {
  data: Animal | { [key: string]: unknown; adminAction?: AdminActionMetadata }
  className?: string
}

/**
 * Componente que muestra un indicador cuando una acción fue realizada por un admin
 * @param data - Datos que pueden contener metadata de admin
 * @param className - Clases CSS adicionales
 */
const AdminActionIndicator: React.FC<AdminActionIndicatorProps> = ({
  data,
  className = ''
}) => {
  // Cast del objeto para que sea compatible con las funciones de adminActions
  const dataWithAdmin = data as {
    [key: string]: unknown
    adminAction?: AdminActionMetadata
  }

  if (!isAdminAction(dataWithAdmin)) {
    return null
  }

  const adminInfo = getAdminInfo(dataWithAdmin)
  const message = formatAdminActionMessage(dataWithAdmin)

  if (!adminInfo) {
    return null
  }

  return (
    <div
      className={`bg-blue-50 border border-blue-200 rounded-md p-2 text-xs ${className}`}
    >
      <div className="flex items-center space-x-1">
        <span className="text-blue-600">🛡️</span>
        <span className="text-blue-800 font-medium">{message}</span>
      </div>
      {adminInfo.impersonationReason && (
        <div className="text-blue-600 mt-1">
          <strong>Motivo:</strong> {adminInfo.impersonationReason}
        </div>
      )}
    </div>
  )
}

export default AdminActionIndicator
