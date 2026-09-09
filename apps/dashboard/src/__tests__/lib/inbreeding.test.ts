import { estimateOffspringInbreeding, highestOffspringInbreeding } from '@/lib/inbreeding'
import type { Animal } from '@/types/animals'

const animal = (id: string, extra = {}) =>
  ({ id, animalNumber: id, type: 'oveja', age: 12, ...extra }) as Animal

describe('estimateOffspringInbreeding', () => {
  it('devuelve cero cuando no hay ancestros comunes conocidos', () => {
    const female = animal('female')
    const male = animal('male')

    expect(estimateOffspringInbreeding(female, male, [female, male])).toEqual({
      coefficient: 0,
      percentage: 0,
      index: 0,
    })
  })

  it('calcula 25% para padre con hija', () => {
    const male = animal('male')
    const female = animal('female', { fatherId: male.id })

    expect(estimateOffspringInbreeding(female, male, [female, male])).toMatchObject({
      coefficient: 0.25,
      percentage: 25,
      index: 9,
    })
  })

  it('calcula 12.5% para medios hermanos', () => {
    const father = animal('father')
    const female = animal('female', { fatherId: father.id })
    const male = animal('male', { fatherId: father.id })

    expect(estimateOffspringInbreeding(female, male, [female, male, father])).toMatchObject({
      coefficient: 0.125,
      percentage: 12.5,
      index: 7,
    })
  })

  it('suma ambos padres comunes para hermanos completos', () => {
    const mother = animal('mother')
    const father = animal('father')
    const female = animal('female', { motherId: mother.id, fatherId: father.id })
    const male = animal('male', { motherId: mother.id, fatherId: father.id })

    expect(estimateOffspringInbreeding(female, male, [female, male, mother, father])).toMatchObject(
      { coefficient: 0.25, percentage: 25, index: 9 },
    )
  })
})

describe('highestOffspringInbreeding', () => {
  it('devuelve el índice más alto de las hembras del empadre', () => {
    const father = animal('father')
    const male = animal('male', { fatherId: father.id })
    const unrelated = animal('unrelated')
    const halfSister = animal('half-sister', { fatherId: father.id })
    const animals = [father, male, unrelated, halfSister]

    expect(highestOffspringInbreeding(male, [unrelated.id, halfSister.id], animals)).toMatchObject({
      coefficient: 0.125,
      percentage: 12.5,
      index: 7,
    })
  })
})
