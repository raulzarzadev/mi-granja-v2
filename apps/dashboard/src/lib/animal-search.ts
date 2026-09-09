import type { Animal } from '@/types/animals'

/**
 * Normaliza texto para que las búsquedas no dependan de guiones, espacios,
 * acentos o mayúsculas. Así `5d`, `05d` y `05-D` encuentran el mismo arete.
 */
export const normalizeAnimalSearch = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')

type SearchableAnimal = Pick<Animal, 'id' | 'animalNumber' | 'name' | 'type' | 'breed' | 'notes'>

export const animalMatchesSearch = (animal: SearchableAnimal, query: string): boolean => {
  const normalizedQuery = normalizeAnimalSearch(query)
  if (!normalizedQuery) return true

  return [
    animal.animalNumber,
    animal.id,
    animal.name,
    animal.type,
    animal.breed,
    animal.notes,
  ].some((value) => normalizeAnimalSearch(value).includes(normalizedQuery))
}
