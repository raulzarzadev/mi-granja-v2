import {
  type Animal,
  type AnimalRecord,
  animals_genders_labels,
  animals_stages_labels,
  animals_types_labels,
} from '@/types/animals'

export function createAnimalRegistrationRecord(
  animal: Pick<Animal, 'animalNumber' | 'type' | 'gender' | 'stage' | 'isBreedingMale'>,
  userId: string,
  date: Date,
): AnimalRecord {
  return {
    id: crypto.randomUUID(),
    type: 'event',
    eventType: 'alta',
    category: 'general',
    title: 'Alta de animal',
    description: `Se registró el animal ${animal.animalNumber} en la granja.`,
    date,
    createdAt: date,
    createdBy: userId,
    details: {
      'ID del animal': animal.animalNumber,
      Especie: animals_types_labels[animal.type],
      Género: animals_genders_labels[animal.gender],
      'Etapa inicial': animals_stages_labels[animal.stage],
      ...(animal.gender === 'macho' && animal.isBreedingMale
        ? { 'Función reproductiva': 'Semental' }
        : {}),
    },
  }
}
