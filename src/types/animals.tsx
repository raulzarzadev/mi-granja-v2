export interface NoteEntry {
  id: string
  text: string
  createdAt: Date
  createdBy: string // userId
  updatedAt?: Date
}

export interface ClinicalEntry {
  id: string
  type: 'illness' | 'injury' | 'treatment' | 'surgery' | 'other'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  startDate: Date
  resolvedDate?: Date
  isResolved: boolean
  treatment?: string
  veterinarian?: string
  cost?: number
  notes?: string
  createdAt: Date
  createdBy: string
  updatedAt?: Date
}

export interface HealthEvent {
  id: string
  type: 'vaccine' | 'treatment' | 'deworming' | 'supplement' | 'other'
  name: string // Nombre de la vacuna/tratamiento
  description?: string
  applicationDate: Date
  nextDueDate?: Date // Para vacunas que requieren refuerzo
  batch?: string // Lote de la vacuna/medicamento
  veterinarian?: string
  cost?: number
  notes?: string
  // Para aplicación masiva
  appliedToAnimals?: string[] // IDs de animales
  isBulkApplication?: boolean
  createdAt: Date
  createdBy: string
  updatedAt?: Date
}

export interface Animal {
  id: string
  farmerId: string
  farmId?: string
  animalNumber: string // ID único del animal (asignado por el granjero)
  type: AnimalType
  stage: AnimalStage
  weight?: number | string | null
  age?: number
  birthDate?: Date
  gender: AnimalGender
  motherId?: string
  fatherId?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  // Sistema de notas
  notesLog?: NoteEntry[]
  // Historial clínico
  clinicalHistory?: ClinicalEntry[]
  // Historial de salud (vacunas y tratamientos)
  healthHistory?: HealthEvent[]
  // Estado general del animal
  status?: AnimalStatus // default lógico: 'activo'
  statusAt?: Date
  statusNotes?: string
  soldInfo?: {
    date: Date
    buyer?: string
    price?: number | string
  }
  lostInfo?: {
    lostAt: Date
    foundAt?: Date
  }
  // Estado de destete
  isWeaned?: boolean
  weanedAt?: Date
  weaningNotes?: string
  // Metadata de admin para rastrear acciones administrativas
  adminAction?: {
    performedByAdmin: boolean
    adminEmail?: string
    adminId?: string
    originalTimestamp: Date
    impersonationReason?: string
  }
}

export const clinical_types = [
  'illness',
  'injury',
  'treatment',
  'surgery',
  'other'
] as const

export const clinical_types_labels: Record<ClinicalEntry['type'], string> = {
  illness: 'Enfermedad',
  injury: 'Lesión',
  treatment: 'Tratamiento',
  surgery: 'Cirugía',
  other: 'Otro'
}

export const clinical_severities = [
  'low',
  'medium',
  'high',
  'critical'
] as const

export const clinical_severities_labels: Record<
  ClinicalEntry['severity'],
  string
> = {
  low: 'Leve',
  medium: 'Moderada',
  high: 'Alta',
  critical: 'Crítica'
}

export const clinical_severities_colors: Record<
  ClinicalEntry['severity'],
  string
> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
}

export const clinical_types_icons: Record<ClinicalEntry['type'], string> = {
  illness: '🦠',
  injury: '🩹',
  treatment: '💊',
  surgery: '🏥',
  other: '📋'
}

// Tipos y helpers para eventos de salud
export const health_event_types = [
  'vaccine',
  'treatment',
  'deworming',
  'supplement',
  'other'
] as const

export const health_event_types_labels: Record<HealthEvent['type'], string> = {
  vaccine: 'Vacuna',
  treatment: 'Tratamiento',
  deworming: 'Desparasitación',
  supplement: 'Suplemento',
  other: 'Otro'
}

export const health_event_types_icons: Record<HealthEvent['type'], string> = {
  vaccine: '💉',
  treatment: '💊',
  deworming: '🪱',
  supplement: '🧪',
  other: '🏥'
}

export const health_event_types_colors: Record<HealthEvent['type'], string> = {
  vaccine: 'bg-blue-100 text-blue-800',
  treatment: 'bg-green-100 text-green-800',
  deworming: 'bg-orange-100 text-orange-800',
  supplement: 'bg-purple-100 text-purple-800',
  other: 'bg-gray-100 text-gray-800'
}

export const animals_genders = ['macho', 'hembra'] as const
export type AnimalGender = (typeof animals_genders)[number]
export const gender_icon: Record<AnimalGender, string> = {
  macho: '🚹',
  hembra: '🚺'
}

export const animals_types = [
  'oveja',
  'vaca',
  // 'vaca_leche',
  // 'vaca_engorda',
  'cabra',
  'cerdo',
  'gallina',
  'perro',
  'gato',
  'equino',
  'otro'
] as const

export const animals_types_labels: Record<AnimalType, string> = {
  oveja: 'Oveja',
  vaca: 'Vaca',
  // vaca_leche: 'Vaca Lechera',
  // vaca_engorda: 'Vaca de Engorda',
  cabra: 'Cabra',
  cerdo: 'Cerdo',
  gallina: 'Gallina',
  perro: 'Perro',
  gato: 'Gato',
  equino: 'Equino',
  otro: 'Otro'
}

export const animals_stages = [
  'cria',
  'engorda',
  'lechera',
  'reproductor',
  'descarte'
] as const
export const animals_stages_labels: Record<AnimalStage, string> = {
  cria: 'Cría',
  engorda: 'Engorda',
  lechera: 'Lechera',
  reproductor: 'Reproductor',
  descarte: 'Descarte'
}
export type AnimalType = (typeof animals_types)[number]
export type AnimalStage = (typeof animals_stages)[number]
export const animal_statuses = [
  'activo',
  'muerto',
  'vendido',
  'perdido'
] as const

export type AnimalStatus = (typeof animal_statuses)[number]

export const animal_icon: Record<AnimalType, string> = {
  oveja: '🐑',
  vaca: '🐄',
  // vaca_leche: '🐄',
  // vaca_engorda: '🐄',
  cabra: '🐐',
  cerdo: '🐷',
  gallina: '🐔',
  perro: '🐶',
  gato: '🐱',
  equino: '🐴',
  otro: '🐾'
}

export const animal_stage_colors: Record<AnimalStage, string> = {
  cria: 'bg-blue-100 text-blue-800',
  engorda: 'bg-orange-100 text-orange-800',
  lechera: 'bg-purple-100 text-purple-800',
  reproductor: 'bg-green-100 text-green-800',
  descarte: 'bg-red-100 text-red-800'
}

export const animal_stage_labels: Record<AnimalStage, string> = {
  cria: 'Cría',
  engorda: 'Engorda',
  lechera: 'Lechera',
  reproductor: 'Reproductor',
  descarte: 'Descarte'
}
export const animal_stage_icons: Record<AnimalStage, string> = {
  cria: '👶',
  engorda: '🍖',
  lechera: '🥛',
  reproductor: '❤️',
  descarte: '🚫'
}

export const animal_status_labels: Record<AnimalStatus, string> = {
  activo: 'Activo',
  muerto: 'Muerto',
  vendido: 'Vendido',
  perdido: 'Perdido'
}

export const animal_status_colors: Record<AnimalStatus, string> = {
  activo: 'bg-green-100 text-green-800',
  muerto: 'bg-gray-200 text-gray-700',
  vendido: 'bg-yellow-100 text-yellow-800',
  perdido: 'bg-red-100 text-red-800'
}
