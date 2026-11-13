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

it.each([
  '317A',
  '317a',
  '317-a',
  '317 A',
  '317',
])('encuentra 317-A con %s incluso si está vendido', (query) => {
  expect(
    animalIdentityMatchesSearch(
      { ...animal, animalNumber: '317-A', status: 'vendido' } as Animal,
      query,
    ),
  ).toBe(true)
})

it('no confunde el arete 160 con 160 días escritos en las notas o un ID interno', () => {
  const other = {
    ...animal,
    id: 'internal160xyz',
    animalNumber: '01-D',
    notes: 'Gestación mayor de 160 días',
  }
  expect(animalMatchesSearch(other, '160')).toBe(false)
  expect(animalIdentityMatchesSearch(other, '160')).toBe(false)
  expect(animalMatchesSearch({ ...other, animalNumber: '160-A' }, '160')).toBe(true)
  expect(animalMatchesSearch(other, 'gestacion')).toBe(true)
  expect(animalMatchesSearch(other, other.id)).toBe(true)
})
