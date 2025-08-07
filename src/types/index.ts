export interface User {
  id: string
  email: string
  name?: string
  farmName?: string
  roles: ('admin' | 'farmer' | 'vet')[]
  currentFarmId?: string // ID de la granja actualmente seleccionada
  createdAt: Date
}

export interface WeightRecord {
  id: string
  animalNumber: string
  weight: number
  date: Date
  notes?: string
}

export interface MilkProduction {
  id: string
  animalNumber: string
  date: Date
  morningAmount: number
  eveningAmount: number
  totalAmount: number
  notes?: string
}

export interface Reminder {
  id: string
  farmerId: string
  animalNumber?: string
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
  animalNumber: string // ID único asignado por el granjero
  weight?: number | null | string
  color?: string
  status: 'vivo' | 'muerto' | 'enfermo'
  healthIssues?: string // Descripción de problemas de salud si status es 'enfermo'
  gender: 'macho' | 'hembra'
}

export interface BirthRecord {
  animalId: string // NOTA: Este campo almacena el ID de Firestore del animal madre, no el animalNumber del usuario
  birthDate: string // Formato YYYY-MM-DD para inputs
  birthTime: string // Formato HH:MM
  totalOffspring: number
  offspring: OffspringInfo[]
  notes?: string
}

// Re-exportar tipos de granja
export * from './farm'
