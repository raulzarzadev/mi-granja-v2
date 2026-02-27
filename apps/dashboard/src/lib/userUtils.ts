/**
 * Utilidades para manejo de usuarios y roles
 */

import { User } from '@/types'

/**
 * Lista de emails que son considerados administradores
 * En un sistema real, esto estaría en la base de datos
 */
const ADMIN_EMAILS = [
  'admin@migranja.com',
  'zarza@admin.com',
  // Agregar más emails de admin según sea necesario
]

/**
 * Determina si un usuario es administrador
 * @param user - Usuario a verificar
 * @returns true si el usuario es admin
 */
export const isUserAdmin = (user: User | null): boolean => {
  if (!user) return false

  // Verificar si tiene role admin en el array
  if (user.roles?.includes('admin')) return true

  // Verificar por email (fallback)
  return !!user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
}

/**
 * Determina si un usuario tiene un rol específico
 * @param user - Usuario a verificar
 * @param role - Rol a verificar
 * @returns true si el usuario tiene el rol
 */
export const userHasRole = (user: User | null, role: 'admin' | 'farmer' | 'vet'): boolean => {
  if (!user) return false
  return user.roles?.includes(role) ?? false
}

/**
 * Asigna los roles apropiados a un usuario basado en su email y contexto
 * @param user - Usuario al que asignar los roles
 * @returns Usuario con roles asignados
 */
export const assignUserRoles = (user: User): User => {
  return user
}
