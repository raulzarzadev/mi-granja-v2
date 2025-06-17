export interface User {
  id: string
  email: string
  name?: string
  farmName?: string
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

export interface BreedingRecord {
  id: string
  farmerId: string
  femaleId: string
  maleId: string
  breedingDate: Date
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
