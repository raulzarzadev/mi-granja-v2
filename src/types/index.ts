export interface User {
  id: string
  email: string
  name?: string
  farmName?: string
  roles: ('admin' | 'farmer' | 'vet')[]
  createdAt: Date
}

export type AnimalType =
  | 'oveja'
  | 'vaca_leche'
  | 'vaca_engorda'
  | 'cabra'
  | 'cerdo'

export type AnimalStage =
  | 'cria'
  | 'engorda'
  | 'lechera'
  | 'reproductor'
  | 'descarte'

export interface Animal {
  id: string
  farmerId: string
  animalId: string // ID único del animal (asignado por el granjero)
  type: AnimalType
  stage: AnimalStage
  weight?: number
  age?: number
  birthDate?: Date
  gender: 'macho' | 'hembra'
  motherId?: string
  fatherId?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface FemaleBreedingInfo {
  femaleId: string
  pregnancyConfirmed: boolean
  pregnancyConfirmedDate?: Date
  expectedBirthDate?: Date
  actualBirthDate?: Date
  offspring?: string[] // IDs de las crías de esta hembra específica
}

export interface BreedingRecord {
  id: string
  farmerId: string
  /**
   * @deprecated use femaleBreedingInfo instead
   */
  femaleIds?: string[] // IDs de las hembras involucradas - Optional for gradual migration
  maleId: string
  breedingDate: Date
  femaleBreedingInfo: FemaleBreedingInfo[] // Información específica de cada hembra
  // Campos legacy (mantenemos por compatibilidad)
  expectedBirthDate?: Date
  actualBirthDate?: Date
  pregnancyConfirmed: boolean
  offspring?: string[] // IDs de las crías
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface WeightRecord {
  id: string
  animalId: string
  weight: number
  date: Date
  notes?: string
}

export interface MilkProduction {
  id: string
  animalId: string
  date: Date
  morningAmount: number
  eveningAmount: number
  totalAmount: number
  notes?: string
}

export interface Reminder {
  id: string
  farmerId: string
  animalId?: string
  title: string
  description: string
  dueDate: Date
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  type: 'medical' | 'breeding' | 'feeding' | 'weight' | 'other'
  createdAt: Date
  updatedAt: Date
}

export interface OffspringInfo {
  id: string // ID temporal para el formulario
  animalId: string // ID único asignado por el granjero
  weight?: number | null
  color?: string
  status: 'vivo' | 'muerto' | 'enfermo'
  healthIssues?: string // Descripción de problemas de salud si status es 'enfermo'
  gender: 'macho' | 'hembra'
}

export interface BirthRecord {
  femaleId: string
  birthDate: string // Formato YYYY-MM-DD para inputs
  birthTime: string // Formato HH:MM
  totalOffspring: number
  offspring: OffspringInfo[]
  notes?: string
}
