import type { AnimalDeathReason } from '@/types/animals'

export const animalDeathReasonLabels: Record<AnimalDeathReason, string> = {
  birth_defect: 'Defecto de nacimiento',
  disease: 'Enfermedad',
  injury: 'Lesión',
  attack: 'Ataque',
}

export const buildDeathStatusNotes = (reason: AnimalDeathReason, description: string) =>
  `${animalDeathReasonLabels[reason]}: ${description.trim()}`
