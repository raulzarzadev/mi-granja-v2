import { FarmCollaborator } from './collaborators'
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

// Re-exports de colaboradores migrados
export {
  COLLABORATOR_ROLES,
  collaborator_roles,
  collaborator_roles_label,
  collaborator_roles_description,
  DEFAULT_PERMISSIONS,
  getDefaultPermissionsByRole
} from './collaborators'
