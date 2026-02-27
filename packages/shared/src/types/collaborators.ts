import { AppDate } from './date'
import { FarmInvitation, FarmPermission } from './farm'

// Definición consolidada de roles de colaboradores con permisos por defecto
// export interface CollaboratorRoleDefinition {
//   value: CollaboratorRolType
//   label: string
//   description: string
//   icon: string
//   defaultPermissions: FarmPermission[]
// }

export interface FarmCollaborator {
  id: string
  farmId: string
  userId: string
  email?: string
  role: CollaboratorRolType
  permissions: FarmPermission[]
  isActive: boolean
  /**
   * @deprecated use invitationMeta instead
   */
  invitedBy: string
  /**
   * @deprecated use invitationMeta instead
   */
  invitedByEmail?: string
  /**
   * @deprecated use invitationMeta instead
   */
  invitedAt: AppDate
  /**
   * @deprecated use invitationMeta instead
   */
  acceptedAt?: AppDate
  notes?: string
  createdAt: AppDate
  updatedAt: AppDate
  invitationMeta?: {
    invitationId?: string
    status?: FarmInvitation['status']
    role?: FarmInvitation['role']
    invitedBy: string
    invitedByEmail?: string
    invitedAt: AppDate
    acceptedAt?: AppDate
  }
}

export const COLLABORATOR_ROLES = [
  {
    value: 'admin',
    label: 'Administrador',
    description: 'Acceso completo a todas las funciones',
    icon: '👑',
    defaultPermissions: [
      { module: 'animals', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'breeding', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'reminders', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'areas', actions: ['create', 'read', 'update', 'delete'] },
      {
        module: 'collaborators',
        actions: ['create', 'read', 'update', 'delete'],
      },
      { module: 'reports', actions: ['create', 'read', 'update', 'delete'] },
    ],
  },
  {
    value: 'manager',
    label: 'Gerente',
    description: 'Gestión de animales, reproducción y colaboradores',
    icon: '👨‍💼',
    defaultPermissions: [
      { module: 'animals', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'breeding', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'reminders', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'areas', actions: ['read', 'update'] },
      { module: 'collaborators', actions: ['read', 'update'] },
      { module: 'reports', actions: ['read'] },
      { module: 'invitations', actions: ['read', 'update', 'create'] },
    ],
  },
  {
    value: 'caretaker',
    label: 'Cuidador',
    description: 'Gestión diaria de animales y recordatorios',
    icon: '👨‍🌾',
    defaultPermissions: [
      { module: 'animals', actions: ['create', 'read', 'update'] },
      { module: 'breeding', actions: ['read', 'update'] },
      { module: 'reminders', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'areas', actions: ['read'] },
      { module: 'reports', actions: ['read'] },
      { module: 'invitations', actions: ['read'] },
    ],
  },
  {
    value: 'veterinarian',
    label: 'Veterinario',
    description: 'Acceso a registros médicos y de salud',
    icon: '👨‍⚕️',
    defaultPermissions: [
      { module: 'animals', actions: ['read', 'update'] },
      { module: 'breeding', actions: ['read', 'update'] },
      { module: 'reminders', actions: ['create', 'read', 'update'] },
      { module: 'reports', actions: ['read'] },
      { module: 'invitations', actions: ['read'] },
    ],
  },
  {
    value: 'viewer',
    label: 'Observador',
    description: 'Solo lectura de información básica',
    icon: '👁️',
    defaultPermissions: [
      { module: 'animals', actions: ['read'] },
      { module: 'breeding', actions: ['read'] },
      { module: 'reminders', actions: ['read'] },
      { module: 'areas', actions: ['read'] },
      { module: 'reports', actions: ['read'] },
      { module: 'invitations', actions: ['read'] },
    ],
  },
] as const

export const collaborator_roles = COLLABORATOR_ROLES.map((r) => r.value)
export type CollaboratorRolType = (typeof collaborator_roles)[number]

export const collaborator_roles_label: Record<CollaboratorRolType, string> =
  COLLABORATOR_ROLES.reduce(
    (acc, r) => {
      acc[r.value] = r.label
      return acc
    },
    {} as Record<CollaboratorRolType, string>,
  )

export const collaborator_roles_description: Record<CollaboratorRolType, string> =
  COLLABORATOR_ROLES.reduce(
    (acc, r) => {
      acc[r.value] = r.description
      return acc
    },
    {} as Record<CollaboratorRolType, string>,
  )

export const DEFAULT_PERMISSIONS: Record<FarmCollaborator['role'], FarmPermission[]> =
  COLLABORATOR_ROLES.reduce(
    (acc, r) => {
      // Convert readonly definitions to mutable copies matching FarmPermission[]
      acc[r.value] = r.defaultPermissions.map((p) => ({
        module: p.module,
        actions: [...p.actions],
      })) as FarmPermission[]
      return acc
    },
    {} as Record<FarmCollaborator['role'], FarmPermission[]>,
  )

export const getDefaultPermissionsByRole = (role: FarmCollaborator['role']): FarmPermission[] =>
  DEFAULT_PERMISSIONS[role]
