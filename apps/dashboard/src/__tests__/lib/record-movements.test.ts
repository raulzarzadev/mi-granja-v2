import { renderHook } from '@testing-library/react'
import { useRecordMovements } from '@/hooks/useRecordMovements'
import { commitMovement, undoMovement } from '@/lib/record-movements'
import type { BirthRecord } from '@/types'
import type { Animal } from '@/types/animals'

const mockDocuments = new Map<string, any>()
let mockFailCommit = false
jest.mock('@/lib/firebase', () => ({ db: {} }))
jest.mock('react-redux', () => ({
  useSelector: (selector: any) =>
    selector({ auth: { user: { id: 'u' } }, farm: { currentFarm: { id: 'f' } } }),
}))
jest.mock('firebase/firestore', () => ({
  Timestamp: class Timestamp {},
  doc: (_db: unknown, ...parts: string[]) => parts.join('/'),
  runTransaction: async (_db: unknown, work: any) => {
    const pending = new Map(mockDocuments)
    let writing = false
    const result = await work({
      get: async (path: string) => {
        if (writing) throw new Error('Read after write')
        return { exists: () => mockDocuments.has(path), data: () => mockDocuments.get(path) }
      },
      set: (path: string, value: any) => {
        writing = true
        pending.set(path, value)
      },
      update: (path: string, value: any) => {
        writing = true
        if (!pending.has(path)) throw new Error('Missing document')
        pending.set(path, { ...pending.get(path), ...value })
      },
      delete: (path: string) => {
        writing = true
        pending.delete(path)
      },
    })
    if (mockFailCommit) throw new Error('Connection lost')
    mockDocuments.clear()
    pending.forEach((v, k) => {
      mockDocuments.set(k, v)
    })
    return result
  },
}))

const context = { userId: 'u', farmId: 'f' }
const date = new Date('2025-01-01T12:00:00')
const animal = (id: string, extra: object = {}) => {
  const value = {
    id,
    farmId: 'f',
    farmerId: 'u',
    animalNumber: id,
    type: 'oveja',
    stage: 'reproductor',
    gender: 'hembra',
    status: 'activo',
    records: [],
    ...extra,
  }
  mockDocuments.set(`animals/${id}`, value)
  return value as Animal
}
const api = (animals: Animal[] = []) => renderHook(() => useRecordMovements(animals)).result.current
beforeEach(() => {
  mockDocuments.clear()
  mockFailCommit = false
})

it('muerte: guarda motivo y un solo movimiento, reintenta sin duplicar y deshace todos los animales', async () => {
  const a = animal('a'),
    b = animal('b')
  const movement = api([a, b])
  const record = await movement.death('death', ['a', 'b'], date, 'disease', 'Observación')
  expect(record.details?.Motivo).toBeTruthy()
  expect(record.description).toBe('Observación')
  await movement.death('death', ['a', 'b'], date, 'disease', 'Observación')
  expect(mockDocuments.get('animals/a').records).toHaveLength(1)
  expect(mockDocuments.get('animals/b').records[0].id).toBe(record.id)
  await movement.undo(record)
  expect(mockDocuments.get('animals/a').status).toBe('activo')
  expect(mockDocuments.get('animals/b').status).toBe('activo')
  expect(mockDocuments.get('animals/a').records[0].undoneAt).toBeTruthy()
  await movement.undo(record)
  expect(mockDocuments.get('animals/a').records).toHaveLength(1)
})

it('fallo al confirmar no deja animales ni historial parcialmente escritos', async () => {
  const a = animal('a'),
    b = animal('b')
  mockFailCommit = true
  await expect(api([a, b]).death('death', ['a', 'b'], date, 'disease', '')).rejects.toThrow()
  expect(mockDocuments.get('animals/a').status).toBe('activo')
  expect(mockDocuments.get('animals/b').records).toEqual([])
})

it('destete: valida adultos y actualiza la madre al destetar juntos a los hermanos', async () => {
  const mother = animal('mother', {
    lactationStatus: 'active',
    lactationPurpose: 'offspring',
    birthedAt: date,
  })
  const a = animal('a', { stage: 'cria', motherId: 'mother', isWeaned: false })
  const b = animal('b', { stage: 'cria', motherId: 'mother', isWeaned: false })
  const movement = api([mother, a, b])
  await expect(movement.wean('bad', ['mother'], date, 'engorda', '')).rejects.toThrow()
  const record = await movement.wean('wean', ['a', 'b'], date, 'engorda', 'Separación')
  expect(mockDocuments.get('animals/mother').lactationStatus).toBe('dry')
  await movement.undo(record)
  expect(mockDocuments.get('animals/a').isWeaned).toBe(false)
  expect(mockDocuments.get('animals/mother').lactationStatus).toBe('active')
})

it('venta: guarda venta, estado e historial juntos; elimina la venta al deshacer', async () => {
  animal('a')
  const movement = api()
  const summary = {
    animalIds: ['a'],
    date,
    pricePerKg: 5000,
    totalWeightGrams: 20000,
    totalPriceCentavos: 100000,
    animalWeights: { a: 20000 },
    buyer: 'Comprador',
    notes: 'Nota',
  }
  const record = await movement.sale('sale', summary)
  await movement.sale('sale', summary)
  expect(mockDocuments.get('sales/sale').status).toBe('completed')
  expect(mockDocuments.get('animals/a').records).toHaveLength(1)
  await movement.undo(record)
  expect(mockDocuments.has('sales/sale')).toBe(false)
  expect(mockDocuments.get('animals/a').status).toBe('activo')
})

it('empadre: un solo empadre al reintentar, con reversión de la gestación', async () => {
  animal('m', { gender: 'macho' })
  animal('h')
  const movement = api()
  const data = {
    maleId: 'm',
    breedingId: '25010',
    breedingDate: date,
    femaleBreedingInfo: [{ femaleId: 'h', pregnancyConfirmedDate: date }],
    notes: 'Nota',
  }
  const record = await movement.breeding('breeding', data)
  await movement.breeding('breeding', data)
  expect(mockDocuments.get('animals/h').pregnantBy).toBe('m')
  expect(mockDocuments.get('animals/h').records).toHaveLength(1)
  await movement.undo(record)
  expect(mockDocuments.has('breedingRecords/breeding')).toBe(false)
  expect(mockDocuments.get('animals/h').pregnantAt).toBeNull()
})

it('parto: crea crías en gramos, limpia gestación y permite restaurar el conjunto', async () => {
  animal('h', { pregnantAt: date, pregnantBy: 'm' })
  const movement = api()
  const form = {
    animalId: 'h',
    birthDate: '2025-02-01',
    birthTime: '10:00',
    totalOffspring: 1,
    notes: 'Sin complicaciones',
    offspring: [{ id: 'o', animalNumber: 'c', gender: 'hembra', status: 'vivo', weight: '3.5' }],
  } as BirthRecord
  const record = await movement.birth('birth', form, null)
  expect(mockDocuments.get('animals/birth-cria-0').weight).toBe(3500)
  expect(mockDocuments.get('animals/h').pregnantAt).toBeNull()
  await movement.undo(record)
  expect(mockDocuments.has('animals/birth-cria-0')).toBe(false)
  expect(mockDocuments.get('animals/h').pregnantAt).toEqual(date)
})

it('no deshace sobre cambios posteriores y no escribe nada al rechazar', async () => {
  animal('a')
  const record = await api().death('death', ['a'], date, 'disease', '')
  mockDocuments.set('animals/a', { ...mockDocuments.get('animals/a'), status: 'vendido' })
  await expect(undoMovement(context, record)).rejects.toThrow('cambios posteriores')
  expect(mockDocuments.get('animals/a').status).toBe('vendido')
  expect(mockDocuments.get('animals/a').records[0].undoneAt).toBeUndefined()
})

it('rechaza animales ajenos a la granja antes de construir cambios', async () => {
  animal('a', { farmId: 'other' })
  const build = jest.fn()
  await expect(commitMovement(context, 'x', ['a'], [], build)).rejects.toThrow('granja')
  expect(build).not.toHaveBeenCalled()
})

it('un reintento con selección modificada recupera el movimiento original sin aplicar otro', async () => {
  animal('a')
  animal('b')
  const movement = api()
  const original = await movement.death('same', ['a'], date, 'disease', '')
  const retry = await movement.death('same', ['b'], date, 'disease', '')
  expect(retry.appliedToAnimals).toEqual(original.appliedToAnimals)
  expect(mockDocuments.get('animals/b').status).toBe('activo')
  expect(mockDocuments.get('animals/b').records).toEqual([])
})

it('un fallo al deshacer mantiene intactos estado e historial', async () => {
  animal('a')
  const movement = api()
  const record = await movement.death('death', ['a'], date, 'disease', '')
  mockFailCommit = true
  await expect(movement.undo(record)).rejects.toThrow('Connection lost')
  expect(mockDocuments.get('animals/a').status).toBe('muerto')
  expect(mockDocuments.get('animals/a').records[0].undoneAt).toBeUndefined()
  expect(mockDocuments.get('recordMovements/death').record.undoneAt).toBeUndefined()
})

it('permite deshacer en orden inverso conservando ambos movimientos en el historial', async () => {
  const a = animal('a', { stage: 'cria', isWeaned: false })
  const movement = api([a])
  const weaning = await movement.wean('wean', ['a'], date, 'engorda', '')
  const death = await movement.death('death', ['a'], date, 'disease', '')
  await expect(movement.undo(weaning)).rejects.toThrow('cambios posteriores')
  await movement.undo(death)
  await movement.undo(weaning)
  expect(mockDocuments.get('animals/a').isWeaned).toBe(false)
  expect(mockDocuments.get('animals/a').status).toBe('activo')
  expect(mockDocuments.get('animals/a').records).toHaveLength(2)
  expect(mockDocuments.get('animals/a').records.every((r: any) => r.undoneAt)).toBe(true)
})

it('peso y leche guardan sus datos como movimientos reversibles', async () => {
  const female = animal('female', { lactationStatus: 'dry' })
  const movement = api([female])
  const weight = await movement.weight('weight', 'female', date, 32500, 'Pesaje de control')
  expect(mockDocuments.get('animals/female').weight).toBe(32500)
  expect(weight.type).toBe('weight')
  expect(weight.weightGrams).toBe(32500)
  await movement.undo(weight)
  expect(mockDocuments.get('animals/female').weight).toBeNull()

  const milk = await movement.milk('milk', 'female', date, 8500, 'morning', 'Sin incidencias')
  expect(mockDocuments.get('animals/female').lactationStatus).toBe('active')
  expect(milk.type).toBe('milk')
  expect(milk.amountMl).toBe(8500)
  await movement.undo(milk)
  expect(mockDocuments.get('animals/female').records.at(-1).undoneAt).toBeTruthy()
})
