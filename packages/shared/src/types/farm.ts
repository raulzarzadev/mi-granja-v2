import { FarmCollaborator } from './collaborators'
import { AppDate } from './date'

export type FarmActivityType = 'livestock' | 'crops' | 'mixed' | 'other'

export type FarmProductionPurpose = 'breeding' | 'meat' | 'milk' | 'eggs' | 'fiber' | 'other'

export type FarmAnimalSpecies = 'vaca' | 'oveja' | 'cabra' | 'cerdo' | 'gallina' | 'equino' | 'otro'

export type FarmCropType = 'grains' | 'vegetables' | 'fruit' | 'forage' | 'other'

export type FarmOtherActivity =
  | 'beekeeping'
  | 'aquaculture'
  | 'veterinary'
  | 'agrotourism'
  | 'other'

export interface FarmProductionProfile {
  activityType: FarmActivityType
  productionPurposes?: FarmProductionPurpose[]
  animalSpecies?: FarmAnimalSpecies[]
  cropTypes?: FarmCropType[]
  otherActivity?: FarmOtherActivity
}

export interface Farm {
  id: string
  name: string
  description?: string
  photoURL?: string
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
  /** Respuestas del onboarding usadas para personalizar herramientas y orientación. */
  productionProfile?: FarmProductionProfile
  areas?: FarmArea[]
  collaborators?: FarmCollaborator[]
  createdAt: AppDate
  updatedAt: AppDate
  restoredBackups?: {
    createdAt: AppDate
    farmId: string
    farmName: string
    backupDate: string
  }[]
  exportedBackups?: {
    createdAt: AppDate
    fileName: string
    counts: {
      animals: number
      animalRecords: number
      breedingRecords: number
      reminders: number
      farmInvitations: number
      sales: number
    }
  }[]
  // Soft delete — granja marcada para eliminación
  deletedAt?: AppDate
  scheduledDeletionAt?: AppDate // 15 días después de deletedAt

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
  layout?: {
    kind: 'rect' | 'polygon'
    /** Coordenadas normalizadas 0–1 (fracción del viewBox del lienzo), no píxeles. */
    coordinateSystem: 'normalized'
    points: { x: number; y: number }[]
    color?: string
  }
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
    | 'invitations'
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
  { value: 'other', label: 'Otro', icon: '📍' },
] as const

// Re-exports de colaboradores migrados
export {
  COLLABORATOR_ROLES,
  collaborator_roles,
  collaborator_roles_description,
  collaborator_roles_label,
  DEFAULT_PERMISSIONS,
  getDefaultPermissionsByRole,
} from './collaborators'

/**
 * 
{"id":"443766598811720","name":"Lavarenta","phone_numbers":{"data":[{"verified_name":"Lavarenta","code_verification_status":"NOT_VERIFIED","display_phone_number":"+52 1 612 183 8341","quality_rating":"GREEN","platform_type":"CLOUD_API","throughput":{"level":"STANDARD"},"id":"378162705390851"}],"paging":{"cursors":{"before":"QVFIU0JYYk0wQ3Nnb09nUkNlRnpPRktrY29hejEyMFhjOGQ3b3ltSHZAOZAnVocnJCZAXUxdUs1OXRpLWg1T084VDg5dDYZD","after":"QVFIU0JYYk0wQ3Nnb09nUkNlRnpPRktrY29hejEyMFhjOGQ3b3ltSHZAOZAnVocnJCZAXUxdUs1OXRpLWg1T084VDg5dDYZD"}}}}%  
 */
