import { FarmPermission, FarmCollaborator } from './farm'

// Definición consolidada de roles de colaboradores con permisos por defecto
export interface CollaboratorRoleDefinition {
  value: FarmCollaborator['role']
  label: string
  description: string
  icon: string
  defaultPermissions: FarmPermission[]
}

export const COLLABORATOR_ROLES: readonly CollaboratorRoleDefinition[] = [
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
        actions: ['create', 'read', 'update', 'delete']
      },
      { module: 'reports', actions: ['create', 'read', 'update', 'delete'] }
    ]
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
      { module: 'reports', actions: ['read'] }
    ]
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
      { module: 'reports', actions: ['read'] }
    ]
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
      { module: 'reports', actions: ['read'] }
    ]
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
      { module: 'reports', actions: ['read'] }
    ]
  }
] as const

export const collaborator_roles = COLLABORATOR_ROLES.map((r) => r.value)
export type collaborator_roles_type = (typeof collaborator_roles)[number]

export const collaborator_roles_label: Record<collaborator_roles_type, string> =
  COLLABORATOR_ROLES.reduce((acc, r) => {
    acc[r.value] = r.label
    return acc
  }, {} as Record<collaborator_roles_type, string>)

export const collaborator_roles_description: Record<
  collaborator_roles_type,
  string
> = COLLABORATOR_ROLES.reduce((acc, r) => {
  acc[r.value] = r.description
  return acc
}, {} as Record<collaborator_roles_type, string>)

export const DEFAULT_PERMISSIONS: Record<
  FarmCollaborator['role'],
  FarmPermission[]
> = COLLABORATOR_ROLES.reduce((acc, r) => {
  acc[r.value] = r.defaultPermissions
  return acc
}, {} as Record<FarmCollaborator['role'], FarmPermission[]>)

export const getDefaultPermissionsByRole = (
  role: FarmCollaborator['role']
): FarmPermission[] => DEFAULT_PERMISSIONS[role]
