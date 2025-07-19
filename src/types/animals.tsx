export interface Animal {
  id: string
  farmerId: string
  animalNumber: string // ID único del animal (asignado por el granjero)
  type: AnimalType
  stage: AnimalStage
  weight?: number | string
  age?: number
  birthDate?: Date
  gender: 'macho' | 'hembra'
  motherId?: string
  fatherId?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}
export const animals_types = [
  'oveja',
  'vaca_leche',
  'vaca_engorda',
  'cabra',
  'cerdo'
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
  vaca_leche: '🐄',
  vaca_engorda: '🐄',
  cabra: '🐐',
  cerdo: '🐷'
}

export const animal_stage_colors: Record<AnimalStage, string> = {
  cria: 'bg-blue-100 text-blue-800',
  engorda: 'bg-orange-100 text-orange-800',
  lechera: 'bg-purple-100 text-purple-800',
  reproductor: 'bg-green-100 text-green-800',
  descarte: 'bg-red-100 text-red-800'
}
