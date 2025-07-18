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
