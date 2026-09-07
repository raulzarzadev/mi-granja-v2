import { type Animal, type AnimalBreedingStatus, isActivePregnancy } from '@/types/animals'
import type { BreedingRecord, FemaleBreedingInfo } from '@/types/breedings'

export type FemaleGroup = {
  key: FemaleBreedingStatus
  label: string
  items: FemaleBreedingInfo[]
}

export type FemaleBreedingStatus = AnimalBreedingStatus | 'embarazada_otra_monta' | 'abortada'

export const CHIP_COLORS: Record<FemaleBreedingStatus, string> = {
  empadre: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  embarazada: 'bg-blue-50 text-blue-800 border-blue-200',
  embarazada_otra_monta: 'bg-orange-50 text-orange-800 border-orange-200',
  parida: 'bg-green-50 text-green-800 border-green-200',
  abortada: 'bg-red-50 text-red-800 border-red-200',
}

export function getFemaleBreedingStatus(
  info: FemaleBreedingInfo,
  animals: Animal[] = [],
  record?: BreedingRecord,
): FemaleBreedingStatus {
  if (info.outcome === 'aborted') return 'abortada'
  if (info.actualBirthDate) return 'parida'

  const animal = animals.find((candidate) => candidate.id === info.femaleId)
  if (!animal) {
    // Si el animal ya no está disponible, conservar el dato histórico del empadre.
    return info.pregnancyConfirmedDate ? 'embarazada' : 'empadre'
  }
  if (!isActivePregnancy(animal)) return 'empadre'

  if (!record) return 'embarazada'

  const pointsToCurrentRecord =
    animal.pregnantBreedingRecordId === record.id ||
    (!!animal.pregnantBreedingId &&
      !!record.breedingId &&
      animal.pregnantBreedingId === record.breedingId)
  const pointsToAnotherRecord =
    (!!animal.pregnantBreedingRecordId && animal.pregnantBreedingRecordId !== record.id) ||
    (!!animal.pregnantBreedingId &&
      !!record.breedingId &&
      animal.pregnantBreedingId !== record.breedingId)
  if (pointsToAnotherRecord && !pointsToCurrentRecord) return 'embarazada_otra_monta'
  if (pointsToCurrentRecord || info.pregnancyConfirmedDate) return 'embarazada'

  return 'embarazada_otra_monta'
}

export function groupFemalesByStatus(
  females: FemaleBreedingInfo[],
  animals: Animal[] = [],
  record?: BreedingRecord,
): FemaleGroup[] {
  const statusOf = (info: FemaleBreedingInfo) => getFemaleBreedingStatus(info, animals, record)
  return [
    {
      key: 'empadre',
      label: 'En empadre',
      items: females.filter((fi) => statusOf(fi) === 'empadre'),
    },
    {
      key: 'embarazada',
      label: 'Gestante',
      items: females.filter((fi) => statusOf(fi) === 'embarazada'),
    },
    {
      key: 'embarazada_otra_monta',
      label: 'Gestante en otra monta',
      items: females.filter((fi) => statusOf(fi) === 'embarazada_otra_monta'),
    },
    { key: 'parida', label: 'Parida', items: females.filter((fi) => statusOf(fi) === 'parida') },
    {
      key: 'abortada',
      label: 'Aborto registrado',
      items: females.filter((fi) => statusOf(fi) === 'abortada'),
    },
  ]
}

export function sortFemalesByAnimalNumber(items: FemaleBreedingInfo[], animals: Animal[]) {
  return [...items].sort((a, b) => {
    const numA = animals.find((an) => an.id === a.femaleId)?.animalNumber || ''
    const numB = animals.find((an) => an.id === b.femaleId)?.animalNumber || ''
    return numA.localeCompare(numB, 'es', { numeric: true })
  })
}
