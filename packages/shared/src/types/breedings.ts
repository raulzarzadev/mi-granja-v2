import { Comment } from './comment'

export interface FemaleBreedingInfo {
  femaleId: string // NOTA: Este campo almacena el ID de Firestore del animal hembra, no el animalNumber del usuario
  pregnancyConfirmedDate?: Date | null
  expectedBirthDate?: Date | null
  actualBirthDate?: Date | null
  offspring?: string[] // IDs de las crías de esta hembra específica
}

/** Estado de una monta: active = en curso, finished = terminada manualmente */
export type BreedingStatus = 'active' | 'finished'

export interface BreedingRecord {
  id: string
  breedingId?: string // ID legible por humanos, ej: "10-10-25-01"
  farmerId: string
  farmId?: string
  maleId: string
  breedingDate: Date | null
  femaleBreedingInfo: FemaleBreedingInfo[] // Información específica de cada hembra
  /** Estado de la monta. Si es 'finished', las hembras pendientes quedan libres */
  status?: BreedingStatus
  notes?: string
  comments?: Comment[]
  createdAt?: Date
  updatedAt?: Date
}
