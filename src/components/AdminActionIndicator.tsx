'use client'

import React from 'react'
import {
  formatAdminActionMessage,
  isAdminAction,
  getAdminInfo
} from '@/lib/adminActions'

interface AdminActionIndicatorProps {
  data: Record<string, unknown> & {
    adminAction?: {
      performedByAdmin: boolean
      adminEmail?: string
      adminId?: string
      originalTimestamp: Date
      impersonationReason?: string
    }
  }
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
  if (!isAdminAction(data)) {
    return null
  }

  const adminInfo = getAdminInfo(data)
  const message = formatAdminActionMessage(data)

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
