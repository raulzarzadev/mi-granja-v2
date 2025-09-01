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

export const animals_stages = [
  'cria',
  'engorda',
  'lechera',
  'reproductor',
  'descarte'
] as const

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
