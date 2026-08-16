import { selectRelevance } from '@/lib/ai/context-relevance'
import { normalizeAiReminder } from '@/lib/ai/context-serialization'

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

describe('AI reminder context', () => {
  const baseReminder = {
    title: 'Destetar 324-A',
    priority: 'high',
    type: 'weaning',
    animalNumbers: ['324-A'],
  }

  it('normaliza fechas válidas de Date y Timestamp', () => {
    expect(
      normalizeAiReminder('date-reminder', {
        ...baseReminder,
        dueDate: new Date('2026-08-16T12:00:00Z'),
      }).fecha,
    ).toBe('2026-08-16')

    expect(
      normalizeAiReminder('timestamp-reminder', {
        ...baseReminder,
        dueDate: { toDate: () => new Date('2026-08-17T12:00:00Z') },
      }).fecha,
    ).toBe('2026-08-17')
  })

  it.each([
    undefined,
    '',
    'not-a-date',
    new Date('invalid'),
  ])('conserva el recordatorio pero omite una fecha inválida: %p', (dueDate) => {
    const reminder = normalizeAiReminder('invalid-reminder', {
      ...baseReminder,
      dueDate,
    })

    expect(reminder).toMatchObject({
      id: 'invalid-reminder',
      titulo: 'Destetar 324-A',
      fecha: null,
      animales: ['324-A'],
    })
  })

  it('tolera objetos Timestamp corruptos sin bloquear el contexto', () => {
    const reminder = normalizeAiReminder('broken-timestamp', {
      ...baseReminder,
      dueDate: {
        toDate: () => {
          throw new Error('corrupt timestamp')
        },
      },
    })

    expect(reminder.fecha).toBeNull()
  })
})
