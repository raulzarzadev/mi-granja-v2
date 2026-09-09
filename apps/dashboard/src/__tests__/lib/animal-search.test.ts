import {
  animalIdentityMatchesSearch,
  animalMatchesSearch,
  normalizeAnimalSearch,
  valuesMatchSearch,
} from '@/lib/animal-search'
import type { Animal } from '@/types/animals'

const animal = {
  id: 'animal-05-d',
  animalNumber: '05-D',
  name: 'Muñeca',
  type: 'oveja',
  breed: 'Dorper',
  notes: 'Gestación confirmada',
} as Animal

describe('animal search', () => {
  it.each(['05d', '5d', '05-D', '05 D'])('encuentra el arete con la variante %s', (query) => {
    expect(animalMatchesSearch(animal, query)).toBe(true)
  })

  it('normaliza separadores, mayúsculas y acentos', () => {
    expect(normalizeAnimalSearch(' Gestación-05 D ')).toBe('gestacion05d')
  })

  it('reutiliza la misma normalización para identidades y listas de valores', () => {
    expect(animalIdentityMatchesSearch(animal, '5d')).toBe(true)
    expect(valuesMatchSearch(['EMPADRE-05-D'], 'empadre05d')).toBe(true)
  })
})
