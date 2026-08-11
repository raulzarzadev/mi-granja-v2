import { selectRelevance } from '@/lib/ai/context-relevance'

describe('AI context relevance', () => {
  const animals = [{ numero: '004' }, { numero: '010' }, { numero: 'A-12' }]

  it('incluye lactancia y movimientos para consultas de leche', () => {
    const relevance = selectRelevance('¿Cuánta leche se ordeñó hoy?', animals)

    expect(relevance.wantsMilk).toBe(true)
    expect(relevance.wantsMovements).toBe(true)
  })

  it('detecta preguntas que solicitan orientación operativa', () => {
    const relevance = selectRelevance('¿Qué animales requieren atención y qué debo hacer?', animals)

    expect(relevance.wantsGuidance).toBe(true)
  })

  it('limita el detalle al número de animal mencionado', () => {
    const relevance = selectRelevance('Muéstrame los últimos movimientos de la 004', animals)

    expect(relevance.wantsMovements).toBe(true)
    expect(relevance.referencedAnimals).toEqual([{ numero: '004' }])
  })
})
