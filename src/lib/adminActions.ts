/**
 * Utilidades para marcar acciones realizadas por administradores
 * Esto permite rastrear cuando un admin hace acciones en nombre de otro usuario
 */

import { User } from '@/types'

export interface AdminActionMetadata {
  performedByAdmin: boolean
  adminEmail?: string
  adminId?: string
  originalTimestamp: Date
  impersonationReason?: string
}

interface DataWithAdminAction {
  adminAction?: AdminActionMetadata
  [key: string]: unknown
}

/**
 * Crea metadata para una acción realizada por un admin
 * @param adminUser - Usuario administrador que realiza la acción
 * @param reason - Razón opcional de la acción
 * @returns Metadata de la acción administrativa
 */
export const createAdminActionMetadata = (
  adminUser: User,
  reason?: string
): AdminActionMetadata => {
  return {
    performedByAdmin: true,
    adminEmail: adminUser.email,
    adminId: adminUser.id,
    originalTimestamp: new Date(),
    impersonationReason: reason
  }
}

/**
 * Añade metadata de admin a cualquier objeto de datos
 * @param data - Datos originales
 * @param adminUser - Usuario administrador
 * @param reason - Razón opcional
 * @returns Datos con metadata de admin añadida
 */
export const addAdminMetadata = <T extends Record<string, unknown>>(
  data: T,
  adminUser: User,
  reason?: string
): T & { adminAction: AdminActionMetadata } => {
  return {
    ...data,
    adminAction: createAdminActionMetadata(adminUser, reason)
  }
}

/**
 * Verifica si una acción fue realizada por un admin
 * @param data - Datos con posible metadata de admin
 * @returns true si fue realizada por admin
 */
export const isAdminAction = (data: DataWithAdminAction): boolean => {
  return data?.adminAction?.performedByAdmin === true
}

/**
 * Obtiene información del admin que realizó la acción
 * @param data - Datos con metadata de admin
 * @returns Información del admin o null
 */
export const getAdminInfo = (
  data: DataWithAdminAction
): AdminActionMetadata | null => {
  return data?.adminAction || null
}

/**
 * Formatea un mensaje indicando que la acción fue realizada por un admin
 * @param data - Datos con metadata de admin
 * @returns Mensaje formateado o cadena vacía
 */
export const formatAdminActionMessage = (data: DataWithAdminAction): string => {
  const adminInfo = getAdminInfo(data)
  if (!adminInfo) return ''

  const adminEmail = adminInfo.adminEmail || 'Admin'
  const timestamp = adminInfo.originalTimestamp.toLocaleString()

  return `✅ Acción realizada por admin (${adminEmail}) el ${timestamp}`
}

/**
 * Hook para obtener las funciones de admin metadata en componentes
 */
export const useAdminActions = () => {
  const isImpersonating = () => {
    // Verificar si hay un token de impersonación activo
    return localStorage.getItem('impersonationToken') !== null
  }

  const getCurrentAdminUser = (): User | null => {
    // Obtener el usuario admin original desde el estado
    const adminData = localStorage.getItem('originalAdminUser')
    return adminData ? JSON.parse(adminData) : null
  }

  const wrapWithAdminMetadata = <T extends Record<string, unknown>>(
    data: T,
    reason?: string
  ): T | (T & { adminAction: AdminActionMetadata }) => {
    if (!isImpersonating()) {
      return data
    }

    const adminUser = getCurrentAdminUser()
    if (!adminUser) {
      return data
    }

    return addAdminMetadata(data, adminUser, reason)
  }

  return {
    isImpersonating,
    getCurrentAdminUser,
    wrapWithAdminMetadata,
    createAdminActionMetadata,
    addAdminMetadata,
    isAdminAction,
    getAdminInfo,
    formatAdminActionMessage
  }
}
