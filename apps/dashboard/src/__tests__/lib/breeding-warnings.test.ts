import { breedingWarnings } from '@/lib/breeding-warnings'
import type { Animal } from '@/types/animals'

const animal = (id: string, extra = {}) =>
  ({ id, animalNumber: id, type: 'oveja', age: 12, ...extra }) as Animal

it('advierte edad pendiente y parentesco padre-hija usando referencias por número', () => {
  const male = animal('male', { animalNumber: '001' })
  const female = animal('female', { age: 5, fatherId: '001' })
  const warnings = breedingWarnings(female, male, [female, male])
  expect(warnings.join(' ')).toContain('faltan aproximadamente 92 días')
  expect(warnings.join(' ')).toContain('ascendiente y descendiente')
})

it('detecta ancestro común aunque el documento del padre no esté disponible', () => {
  const male = animal('male', { fatherId: 'missing-parent' })
  const female = animal('female', { fatherId: 'missing-parent' })
  expect(breedingWarnings(female, male, [female, male]).join(' ')).toContain(
    'hermanos o medios hermanos',
  )
})

it('no presenta un pedigree incompleto como garantía de ausencia de consanguinidad', () => {
  const male = animal('male')
  const female = animal('female', { age: undefined })
  const warnings = breedingWarnings(female, male, [female, male]).join(' ')
  expect(warnings).toContain('Edad desconocida')
  expect(warnings).toContain('no descarta consanguinidad')
})
