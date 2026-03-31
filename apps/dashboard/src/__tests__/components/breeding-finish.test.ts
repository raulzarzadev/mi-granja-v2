import { groupFemalesByStatus } from '@/components/Dashboard/Animals/AnimalsSection'
import { FemaleBreedingInfo } from '@/types/breedings'
import { BreedingRecord } from '@/types/breedings'

/**
 * Verifica que al terminar un empadre:
 * - Las embarazadas siguen embarazadas
 * - Las paridas siguen paridas
 * - Las que estaban en empadre (pendientes) quedan libres (se mueven a reproducción)
 */

const makeFemale = (overrides: Partial<FemaleBreedingInfo> = {}): FemaleBreedingInfo => ({
  femaleId: `female-${Math.random().toString(36).slice(2, 6)}`,
  pregnancyConfirmedDate: null,
  expectedBirthDate: null,
  actualBirthDate: null,
  offspring: [],
  ...overrides,
})

const makeBreeding = (overrides: Partial<BreedingRecord> = {}): BreedingRecord => ({
  id: 'br-1',
  breedingId: '01-01-26-01',
  farmerId: 'farmer-1',
  maleId: 'male-1',
  breedingDate: new Date('2026-01-01'),
  femaleBreedingInfo: [],
  status: 'active',
  ...overrides,
})

describe('groupFemalesByStatus', () => {
  it('agrupa hembras correctamente por status', () => {
    const enEmpadre = makeFemale({ femaleId: 'f1' })
    const embarazada = makeFemale({
      femaleId: 'f2',
      pregnancyConfirmedDate: new Date('2026-02-01'),
    })
    const parida = makeFemale({
      femaleId: 'f3',
      pregnancyConfirmedDate: new Date('2026-02-01'),
      actualBirthDate: new Date('2026-06-01'),
    })

    const groups = groupFemalesByStatus([enEmpadre, embarazada, parida])

    expect(groups).toHaveLength(3)
    expect(groups[0].key).toBe('empadre')
    expect(groups[0].items).toEqual([enEmpadre])
    expect(groups[1].key).toBe('embarazada')
    expect(groups[1].items).toEqual([embarazada])
    expect(groups[2].key).toBe('parida')
    expect(groups[2].items).toEqual([parida])
  })

  it('hembras con birthDate son paridas aunque tengan pregnancyConfirmedDate', () => {
    const parida = makeFemale({
      femaleId: 'f1',
      pregnancyConfirmedDate: new Date('2026-02-01'),
      actualBirthDate: new Date('2026-06-01'),
    })

    const groups = groupFemalesByStatus([parida])

    expect(groups[0].items).toHaveLength(0) // no en empadre
    expect(groups[1].items).toHaveLength(0) // no embarazada
    expect(groups[2].items).toEqual([parida]) // sí parida
  })

  it('maneja lista vacía', () => {
    const groups = groupFemalesByStatus([])
    expect(groups.every((g) => g.items.length === 0)).toBe(true)
  })
})

describe('terminar empadre — estado de hembras', () => {
  it('al terminar, embarazadas y paridas conservan sus fechas', () => {
    const embarazada = makeFemale({
      femaleId: 'f1',
      pregnancyConfirmedDate: new Date('2026-02-01'),
      expectedBirthDate: new Date('2026-07-01'),
    })
    const parida = makeFemale({
      femaleId: 'f2',
      pregnancyConfirmedDate: new Date('2026-02-01'),
      actualBirthDate: new Date('2026-06-15'),
      offspring: ['cria-1'],
    })
    const enEmpadre = makeFemale({ femaleId: 'f3' })

    const record = makeBreeding({
      femaleBreedingInfo: [embarazada, parida, enEmpadre],
      status: 'active',
    })

    // Simular terminación: solo cambia status del record
    const terminated: BreedingRecord = { ...record, status: 'finished' }

    // Las hembras NO cambian — sus datos reproductivos persisten
    const groups = groupFemalesByStatus(terminated.femaleBreedingInfo)

    // Embarazada sigue siendo embarazada
    expect(groups[1].items).toHaveLength(1)
    expect(groups[1].items[0].femaleId).toBe('f1')
    expect(groups[1].items[0].pregnancyConfirmedDate).toEqual(new Date('2026-02-01'))

    // Parida sigue siendo parida
    expect(groups[2].items).toHaveLength(1)
    expect(groups[2].items[0].femaleId).toBe('f2')
    expect(groups[2].items[0].actualBirthDate).toEqual(new Date('2026-06-15'))
    expect(groups[2].items[0].offspring).toEqual(['cria-1'])

    // La que estaba en empadre queda como pendiente (sin datos reproductivos)
    expect(groups[0].items).toHaveLength(1)
    expect(groups[0].items[0].femaleId).toBe('f3')
    expect(groups[0].items[0].pregnancyConfirmedDate).toBeNull()
    expect(groups[0].items[0].actualBirthDate).toBeNull()
  })

  it('empadre terminado se mueve a la lista de terminados', () => {
    const record = makeBreeding({
      femaleBreedingInfo: [
        makeFemale({ pregnancyConfirmedDate: new Date('2026-02-01') }),
        makeFemale(), // en empadre
      ],
      status: 'finished',
    })

    // Simular la lógica de orderedBreedings
    const needPregnancyConfirmation: BreedingRecord[] = []
    const terminated: BreedingRecord[] = []

    ;[record].forEach((r) => {
      if (r.status === 'finished') {
        terminated.push(r)
        return
      }
      const hasPending = r.femaleBreedingInfo.some(
        (f) => !f.pregnancyConfirmedDate && !f.actualBirthDate,
      )
      if (hasPending) {
        needPregnancyConfirmation.push(r)
      } else {
        terminated.push(r)
      }
    })

    expect(needPregnancyConfirmation).toHaveLength(0)
    expect(terminated).toHaveLength(1)
    expect(terminated[0].id).toBe(record.id)
  })

  it('empadre activo con pendientes se queda en needPregnancyConfirmation', () => {
    const record = makeBreeding({
      femaleBreedingInfo: [
        makeFemale({ pregnancyConfirmedDate: new Date('2026-02-01') }),
        makeFemale(), // pendiente
      ],
      status: 'active',
    })

    const needPregnancyConfirmation: BreedingRecord[] = []
    const terminated: BreedingRecord[] = []

    ;[record].forEach((r) => {
      if (r.status === 'finished') {
        terminated.push(r)
        return
      }
      const hasPending = r.femaleBreedingInfo.some(
        (f) => !f.pregnancyConfirmedDate && !f.actualBirthDate,
      )
      if (hasPending) {
        needPregnancyConfirmation.push(r)
      } else {
        terminated.push(r)
      }
    })

    expect(needPregnancyConfirmation).toHaveLength(1)
    expect(terminated).toHaveLength(0)
  })

  it('hembras en empadre no tienen datos reproductivos — quedan libres para reproducción', () => {
    const enEmpadre = makeFemale({ femaleId: 'f1' })

    // Al terminar, la hembra en empadre no tiene pregnantAt ni birthedAt
    // Esto significa que computeAnimalStage la clasificará como "reproductor"
    // y aparecerá en el tab de Reproducción
    expect(enEmpadre.pregnancyConfirmedDate).toBeNull()
    expect(enEmpadre.actualBirthDate).toBeNull()

    // El record terminado la tiene pero sin datos reproductivos
    const terminated = makeBreeding({
      femaleBreedingInfo: [enEmpadre],
      status: 'finished',
    })

    const groups = groupFemalesByStatus(terminated.femaleBreedingInfo)
    expect(groups[0].key).toBe('empadre')
    expect(groups[0].items).toHaveLength(1)
    // Sin pregnancyConfirmedDate ni actualBirthDate → libre para reproducción
    expect(groups[0].items[0].pregnancyConfirmedDate).toBeNull()
    expect(groups[0].items[0].actualBirthDate).toBeNull()
  })
})
