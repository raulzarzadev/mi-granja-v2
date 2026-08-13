/**
 * Tests de useBreedingHandlers — preservación de gestación/padre/empadre
 * al remover hembras (o el macho) de un empadre, y reversión de parto.
 */
import { renderHook } from '@testing-library/react'
import { useBreedingHandlers } from '@/components/Dashboard/Animals/hooks/useBreedingHandlers'
import type { Animal } from '@/types/animals'
import type { BreedingRecord, FemaleBreedingInfo } from '@/types/breedings'

const makeFemaleInfo = (overrides: Partial<FemaleBreedingInfo> = {}): FemaleBreedingInfo => ({
  femaleId: 'f1',
  pregnancyConfirmedDate: null,
  expectedBirthDate: null,
  actualBirthDate: null,
  offspring: [],
  ...overrides,
})

const makeRecord = (overrides: Partial<BreedingRecord> = {}): BreedingRecord =>
  ({
    id: 'br-doc-1',
    breedingId: '10-10-25-01',
    farmerId: 'farmer-1',
    maleId: 'male-1',
    breedingDate: new Date('2026-01-01'),
    femaleBreedingInfo: [],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as BreedingRecord

const makeAnimal = (overrides: Partial<Animal> = {}): Animal =>
  ({
    id: 'f1',
    farmerId: 'farmer-1',
    animalNumber: '001',
    type: 'oveja',
    stage: 'reproductor',
    gender: 'hembra',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Animal

const setup = (animals: Animal[]) => {
  const update = jest.fn().mockResolvedValue(undefined)
  const remove = jest.fn().mockResolvedValue(undefined)
  const wean = jest.fn().mockResolvedValue(undefined)
  const addRecord = jest.fn().mockResolvedValue(undefined)
  const updateBreedingRecord = jest.fn().mockResolvedValue(undefined)
  const deleteBreedingRecord = jest.fn().mockResolvedValue(undefined)

  const { result } = renderHook(() =>
    useBreedingHandlers({
      animals,
      update,
      remove,
      wean,
      addRecord,
      updateBreedingRecord,
      deleteBreedingRecord,
    }),
  )

  return { result, update, remove, addRecord, updateBreedingRecord, deleteBreedingRecord }
}

describe('handleRemoveFromBreeding', () => {
  it('sacar hembra gestante conserva pregnantAt, backfillea pregnantBy y guarda ids del empadre', async () => {
    const confirmed = new Date('2026-02-01')
    const info = makeFemaleInfo({ femaleId: 'f1', pregnancyConfirmedDate: confirmed })
    const record = makeRecord({
      femaleBreedingInfo: [info, makeFemaleInfo({ femaleId: 'f2' })],
    })
    // Animal sin pregnantBy (dato dañado o flujo viejo): se backfillea desde record.maleId
    const animal = makeAnimal({ id: 'f1', pregnantAt: confirmed, pregnantBy: null })
    const { result, update, updateBreedingRecord, deleteBreedingRecord, addRecord } = setup([
      animal,
    ])

    await result.current.handleRemoveFromBreeding(record, 'f1')

    expect(updateBreedingRecord).toHaveBeenCalledWith('br-doc-1', {
      femaleBreedingInfo: [expect.objectContaining({ femaleId: 'f2' })],
    })
    expect(deleteBreedingRecord).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith('f1', {
      pregnantAt: confirmed,
      pregnantBy: 'male-1',
      pregnantBreedingRecordId: 'br-doc-1',
      pregnantBreedingId: '10-10-25-01',
    })
    expect(addRecord).toHaveBeenCalledWith('f1', expect.objectContaining({ type: 'note' }))
  })

  it('conserva pregnantBy existente del animal sobre el maleId del record', async () => {
    const confirmed = new Date('2026-02-01')
    const record = makeRecord({
      femaleBreedingInfo: [
        makeFemaleInfo({ femaleId: 'f1', pregnancyConfirmedDate: confirmed }),
        makeFemaleInfo({ femaleId: 'f2' }),
      ],
    })
    const animal = makeAnimal({ id: 'f1', pregnantAt: confirmed, pregnantBy: 'male-original' })
    const { result, update } = setup([animal])

    await result.current.handleRemoveFromBreeding(record, 'f1')

    expect(update).toHaveBeenCalledWith(
      'f1',
      expect.objectContaining({ pregnantBy: 'male-original' }),
    )
  })

  it('sacar hembra NO confirmada no escribe en el animal', async () => {
    const record = makeRecord({
      femaleBreedingInfo: [makeFemaleInfo({ femaleId: 'f1' }), makeFemaleInfo({ femaleId: 'f2' })],
    })
    const { result, update, updateBreedingRecord } = setup([makeAnimal({ id: 'f1' })])

    await result.current.handleRemoveFromBreeding(record, 'f1')

    expect(updateBreedingRecord).toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('sacar hembra que ya parió no escribe en el animal', async () => {
    const record = makeRecord({
      femaleBreedingInfo: [
        makeFemaleInfo({
          femaleId: 'f1',
          pregnancyConfirmedDate: new Date('2026-02-01'),
          actualBirthDate: new Date('2026-06-01'),
        }),
        makeFemaleInfo({ femaleId: 'f2' }),
      ],
    })
    const { result, update } = setup([makeAnimal({ id: 'f1' })])

    await result.current.handleRemoveFromBreeding(record, 'f1')

    expect(update).not.toHaveBeenCalled()
  })

  it('sacar al macho preserva los campos en todas las preñadas antes de borrar el record', async () => {
    const confirmed = new Date('2026-02-01')
    const record = makeRecord({
      femaleBreedingInfo: [
        makeFemaleInfo({ femaleId: 'f1', pregnancyConfirmedDate: confirmed }),
        makeFemaleInfo({ femaleId: 'f2' }), // sin confirmar
        makeFemaleInfo({
          femaleId: 'f3',
          pregnancyConfirmedDate: confirmed,
          actualBirthDate: new Date('2026-06-01'), // ya parió
        }),
      ],
    })
    const { result, update, deleteBreedingRecord } = setup([
      makeAnimal({ id: 'f1', pregnantAt: confirmed }),
      makeAnimal({ id: 'f2' }),
      makeAnimal({ id: 'f3' }),
    ])

    await result.current.handleRemoveFromBreeding(record, 'male-1')

    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith('f1', {
      pregnantAt: confirmed,
      pregnantBy: 'male-1',
      pregnantBreedingRecordId: 'br-doc-1',
      pregnantBreedingId: '10-10-25-01',
    })
    expect(deleteBreedingRecord).toHaveBeenCalledWith('br-doc-1')
  })

  it('sacar la última hembra borra el record pero conserva su gestación', async () => {
    const confirmed = new Date('2026-02-01')
    const record = makeRecord({
      femaleBreedingInfo: [makeFemaleInfo({ femaleId: 'f1', pregnancyConfirmedDate: confirmed })],
    })
    const { result, update, deleteBreedingRecord, updateBreedingRecord } = setup([
      makeAnimal({ id: 'f1', pregnantAt: confirmed }),
    ])

    await result.current.handleRemoveFromBreeding(record, 'f1')

    expect(deleteBreedingRecord).toHaveBeenCalledWith('br-doc-1')
    expect(updateBreedingRecord).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith(
      'f1',
      expect.objectContaining({
        pregnantBy: 'male-1',
        pregnantBreedingRecordId: 'br-doc-1',
        pregnantBreedingId: '10-10-25-01',
      }),
    )
  })
})

describe('handleUnconfirmPregnancy', () => {
  it('limpia también la referencia al empadre', async () => {
    const record = makeRecord({
      femaleBreedingInfo: [
        makeFemaleInfo({ femaleId: 'f1', pregnancyConfirmedDate: new Date('2026-02-01') }),
      ],
    })
    const { result, update } = setup([makeAnimal({ id: 'f1' })])

    await result.current.handleUnconfirmPregnancy(record, 'f1')

    expect(update).toHaveBeenCalledWith('f1', {
      pregnantAt: null,
      pregnantBy: null,
      pregnantBreedingRecordId: null,
      pregnantBreedingId: null,
    })
  })
})

describe('handleRevertBirth', () => {
  it('restaura pregnantBy y los ids del empadre', async () => {
    const confirmed = new Date('2026-02-01')
    const record = makeRecord({
      femaleBreedingInfo: [
        makeFemaleInfo({
          femaleId: 'f1',
          pregnancyConfirmedDate: confirmed,
          actualBirthDate: new Date('2026-06-01'),
          offspring: ['cria-1'],
        }),
      ],
    })
    const { result, update, remove } = setup([makeAnimal({ id: 'f1' })])

    await result.current.handleRevertBirth(record, 'f1')

    expect(remove).toHaveBeenCalledWith('cria-1')
    expect(update).toHaveBeenCalledWith('f1', {
      birthedAt: null,
      lactationStatus: 'dry',
      driedAt: expect.any(Date),
      pregnantAt: confirmed,
      pregnantBy: 'male-1',
      pregnantBreedingRecordId: 'br-doc-1',
      pregnantBreedingId: '10-10-25-01',
    })
  })

  it('mantiene activa una lactancia lechera al revertir un parto', async () => {
    const record = makeRecord({
      femaleBreedingInfo: [
        makeFemaleInfo({
          femaleId: 'f1',
          pregnancyConfirmedDate: new Date('2026-02-01'),
          actualBirthDate: new Date('2026-06-01'),
        }),
      ],
    })
    const dairyFemale = makeAnimal({
      id: 'f1',
      lactationStatus: 'active',
      lactationPurpose: 'dairy',
    })
    const { result, update } = setup([dairyFemale])

    await result.current.handleRevertBirth(record, 'f1')

    expect(update).toHaveBeenCalledWith(
      'f1',
      expect.objectContaining({ lactationStatus: 'active', birthedAt: null }),
    )
    expect(update.mock.calls[0]?.[1]).not.toHaveProperty('driedAt')
  })
})
