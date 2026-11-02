import { animalMentionParts, buildAnimalMentionIndex } from '@/lib/ai/animal-mentions'

const animals = [
  { id: 'a9', farmId: 'farm', animalNumber: 'A9', name: 'Luna' },
  { id: 'a90', farmId: 'farm', animalNumber: 'A90', name: 'Luna' },
  { id: 'other', farmId: 'other', animalNumber: 'A8', name: 'Sol' },
  { id: 'numeric', farmId: 'farm', animalNumber: '2024', name: '' },
]
it('solo enlaza identidades exactas y únicas de la granja actual', () => {
  const index = buildAnimalMentionIndex(animals, 'farm')
  const linked = animalMentionParts('A9, #A90 y A900. Luna y A8 no deben enlazarse.', index).filter(
    (part) => part.animal,
  )
  expect(linked.map((part) => part.animal?.id)).toEqual(['a9', 'a90'])
})
it('no convierte una fecha ni un peso en un identificador numérico', () => {
  const index = buildAnimalMentionIndex(animals, 'farm')
  expect(
    animalMentionParts('Nació 01/11/2024. Peso: 2024 kg. Animal #2024.', index)
      .filter((part) => part.animal)
      .map((part) => part.text),
  ).toEqual(['2024'])
})
it('conserva exactamente el texto y maneja referencias con caracteres especiales', () => {
  const index = buildAnimalMentionIndex(
    [{ id: 'one', farmId: 'farm', animalNumber: 'A-1', name: 'María (2)' }],
    'farm',
  )
  const text = 'María (2), animal A-1.\nSigue aquí.'
  const parts = animalMentionParts(text, index)
  expect(parts.map((part) => part.text).join('')).toBe(text)
  expect(parts.filter((part) => part.animal)).toHaveLength(2)
})
