import type { Animal } from '@/types/animals'
import type { FemaleBreedingInfo } from '@/types/breedings'

export type FemaleGroup = {
  key: 'empadre' | 'embarazada' | 'parida'
  label: string
  items: FemaleBreedingInfo[]
}

export const CHIP_COLORS: Record<FemaleGroup['key'], string> = {
  empadre: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  embarazada: 'bg-blue-50 text-blue-800 border-blue-200',
  parida: 'bg-green-50 text-green-800 border-green-200',
}

export function groupFemalesByStatus(females: FemaleBreedingInfo[]): FemaleGroup[] {
  return [
    {
      key: 'empadre',
      label: 'En empadre',
      items: females.filter((fi) => !fi.pregnancyConfirmedDate && !fi.actualBirthDate),
    },
    {
      key: 'embarazada',
      label: 'Embarazada',
      items: females.filter((fi) => fi.pregnancyConfirmedDate && !fi.actualBirthDate),
    },
    { key: 'parida', label: 'Parida', items: females.filter((fi) => !!fi.actualBirthDate) },
  ]
}

export function sortFemalesByAnimalNumber(items: FemaleBreedingInfo[], animals: Animal[]) {
  return [...items].sort((a, b) => {
    const numA = animals.find((an) => an.id === a.femaleId)?.animalNumber || ''
    const numB = animals.find((an) => an.id === b.femaleId)?.animalNumber || ''
    return numA.localeCompare(numB, 'es', { numeric: true })
  })
}
