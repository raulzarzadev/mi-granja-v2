export interface Animal {
  id: string
  farmerId: string
  farmId?: string
  animalNumber: string // ID único del animal (asignado por el granjero)
  type: AnimalType
  stage: AnimalStage
  weight?: number | string
  age?: number
  birthDate?: Date
  gender: AnimalGender
  motherId?: string
  fatherId?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
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
