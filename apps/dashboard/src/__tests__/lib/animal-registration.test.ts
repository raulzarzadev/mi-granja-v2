import { createAnimalRegistrationRecord } from '@/lib/animal-registration'
import { getRecordTypeLabel } from '@/types/animals'

describe('alta de animal', () => {
  it('conserva la fecha de alta, autor y datos iniciales en el historial', () => {
    const date = new Date(2026, 10, 1)
    const record = createAnimalRegistrationRecord(
      { animalNumber: 'A1', type: 'vaca', gender: 'hembra', stage: 'cria' },
      'user-1',
      date,
    )
    expect(record).toMatchObject({
      type: 'event',
      eventType: 'alta',
      date,
      createdAt: date,
      createdBy: 'user-1',
      details: { 'ID del animal': 'A1', 'Etapa inicial': 'Cría' },
    })
    expect(record.id).toBeTruthy()
    expect(getRecordTypeLabel(record)).toBe('Alta de animal')
    expect(record.undoData).toBeUndefined()
  })
})
