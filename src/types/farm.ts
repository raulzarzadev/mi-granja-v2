import { AppDate } from './date'

export interface Farm {
  id: string
  name: string
  description?: string
  ownerId: string
  location?: {
    address?: string
    city?: string
    state?: string
    country?: string
    coordinates?: {
      lat: number
      lng: number
    }
  }
  areas?: FarmArea[]
  collaborators?: FarmCollaborator[]
  createdAt: AppDate
  updatedAt: AppDate
  // Metadatos cuando la granja proviene de una invitación aceptada o pendiente
  invitationMeta?: {
    invitationId: string
    status: FarmInvitation['status']
    role?: FarmInvitation['role']
  }
}

export interface FarmArea {
  id: string
  farmId: string
  name: string
  description?: string
  type: 'pasture' | 'barn' | 'feeding' | 'storage' | 'medical' | 'other'
  capacity?: number | null
  isActive: boolean
  notes?: string
  createdAt: AppDate
  updatedAt: AppDate
}

export interface FarmCollaborator {
  id: string
  farmId: string
  userId: string
  // Email del colaborador (opcional; se enriquece desde la colección users)
  email?: string
  role: 'admin' | 'manager' | 'caretaker' | 'veterinarian' | 'viewer'
  permissions: FarmPermission[]
  isActive: boolean
  invitedBy: string
  // Email del usuario que invitó (opcional; se enriquece desde users)
  invitedByEmail?: string
  invitedAt: AppDate
  acceptedAt?: AppDate
  notes?: string
  createdAt: AppDate
  updatedAt: AppDate
}

export interface FarmPermission {
  module:
    | 'animals'
    | 'breeding'
    | 'reminders'
    | 'areas'
    | 'collaborators'
    | 'reports'
  actions: ('create' | 'read' | 'update' | 'delete')[]
}

export interface FarmInvitation {
  id: string
  farmId: string
  email: string
  role: FarmCollaborator['role']
  permissions: FarmPermission[]
  invitedBy: string
  token?: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked'
  expiresAt: AppDate
  createdAt: AppDate
  updatedAt: AppDate
  // Nombre de la granja (enriquecido en cliente)
  farmName?: string
}

export const FARM_AREA_TYPES = [
  { value: 'pasture', label: 'Pastizal', icon: '🌿' },
  { value: 'barn', label: 'Establo', icon: '🏚️' },
  { value: 'feeding', label: 'Alimentación', icon: '🌾' },
  { value: 'storage', label: 'Almacén', icon: '📦' },
  { value: 'medical', label: 'Área Médica', icon: '🏥' },
  { value: 'other', label: 'Otro', icon: '📍' }
] as const

export const COLLABORATOR_ROLES = [
  {
    value: 'admin',
    label: 'Administrador',
    description: 'Acceso completo a todas las funciones',
    icon: '👑'
  },
  {
    value: 'manager',
    label: 'Gerente',
    description: 'Gestión de animales, reproducción y colaboradores',
    icon: '👨‍💼'
  },
  {
    value: 'caretaker',
    label: 'Cuidador',
    description: 'Gestión diaria de animales y recordatorios',
    icon: '👨‍🌾'
  },
  {
    value: 'veterinarian',
    label: 'Veterinario',
    description: 'Acceso a registros médicos y de salud',
    icon: '👨‍⚕️'
  },
  {
    value: 'viewer',
    label: 'Observador',
    description: 'Solo lectura de información básica',
    icon: '👁️'
  }
] as const

export const DEFAULT_PERMISSIONS: Record<
  FarmCollaborator['role'],
  FarmPermission[]
> = {
  admin: [
    { module: 'animals', actions: ['create', 'read', 'update', 'delete'] },
    { module: 'breeding', actions: ['create', 'read', 'update', 'delete'] },
    { module: 'reminders', actions: ['create', 'read', 'update', 'delete'] },
    { module: 'areas', actions: ['create', 'read', 'update', 'delete'] },
    {
      module: 'collaborators',
      actions: ['create', 'read', 'update', 'delete']
    },
    { module: 'reports', actions: ['create', 'read', 'update', 'delete'] }
  ],
  manager: [
    { module: 'animals', actions: ['create', 'read', 'update', 'delete'] },
    { module: 'breeding', actions: ['create', 'read', 'update', 'delete'] },
    { module: 'reminders', actions: ['create', 'read', 'update', 'delete'] },
    { module: 'areas', actions: ['read', 'update'] },
    { module: 'collaborators', actions: ['read', 'update'] },
    { module: 'reports', actions: ['read'] }
  ],
  caretaker: [
    { module: 'animals', actions: ['create', 'read', 'update'] },
    { module: 'breeding', actions: ['read', 'update'] },
    { module: 'reminders', actions: ['create', 'read', 'update', 'delete'] },
    { module: 'areas', actions: ['read'] },
    { module: 'reports', actions: ['read'] }
  ],
  veterinarian: [
    { module: 'animals', actions: ['read', 'update'] },
    { module: 'breeding', actions: ['read', 'update'] },
    { module: 'reminders', actions: ['create', 'read', 'update'] },
    { module: 'reports', actions: ['read'] }
  ],
  viewer: [
    { module: 'animals', actions: ['read'] },
    { module: 'breeding', actions: ['read'] },
    { module: 'reminders', actions: ['read'] },
    { module: 'areas', actions: ['read'] },
    { module: 'reports', actions: ['read'] }
  ]
}
