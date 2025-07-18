export interface FemaleBreedingInfo {
  animalNumber: string
  pregnancyConfirmedDate?: Date | null
  expectedBirthDate?: Date | null
  actualBirthDate?: Date | null
  offspring?: string[] // IDs de las crías de esta hembra específica
}

export interface BreedingRecord {
  id: string
  farmerId: string
  maleId: string
  breedingDate: Date | null
  femaleBreedingInfo: FemaleBreedingInfo[] // Información específica de cada hembra
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}
