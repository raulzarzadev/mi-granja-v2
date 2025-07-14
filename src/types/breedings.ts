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
  maleId: string
  breedingDate: Date | false
  femaleBreedingInfo: FemaleBreedingInfo[] // Información específica de cada hembra
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}
