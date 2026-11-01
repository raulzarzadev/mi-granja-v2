import { ANIMAL_BREEDING_CONFIGS } from '@/lib/animalBreedingConfig'
import type { AnimalGender, AnimalType } from '@/types/animals'

export type RegistrationStage =
  | 'cria'
  | 'engorda'
  | 'reproductor'
  | 'descarte'
  | 'embarazada'
  | 'lechera'

export function registrationStages(
  type: AnimalType,
  gender: AnimalGender,
  birthDate: string,
  today = new Date(),
): RegistrationStage[] {
  if (!birthDate) return []
  const [year, month, day] = birthDate.split('-').map(Number)
  const birth = new Date(year, month - 1, day)
  if (!year || !month || !day || Number.isNaN(birth.getTime()) || birth > today) return []
  const config = ANIMAL_BREEDING_CONFIGS[type]
  const ageMonths =
    (today.getFullYear() - year) * 12 +
    today.getMonth() -
    (month - 1) -
    (today.getDate() < day ? 1 : 0)
  const weaningDate = new Date(year, month - 1, day)
  weaningDate.setDate(weaningDate.getDate() + config.weaningDays)
  const stages: RegistrationStage[] = today < weaningDate ? ['cria'] : ['engorda', 'reproductor']
  if (gender === 'hembra' && ageMonths >= config.minBreedingAge) stages.push('embarazada')
  const earliestBirth = new Date(year, month - 1 + config.minBreedingAge, day)
  earliestBirth.setDate(earliestBirth.getDate() + config.gestationDays)
  if (gender === 'hembra' && today >= earliestBirth) stages.push('lechera')
  stages.push('descarte')
  return stages
}
