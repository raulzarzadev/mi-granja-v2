import { buildAiKnowledge } from '@/lib/ai/knowledge'
import { knowledgeDateKey, knowledgeDaysUntil } from '@/lib/ai/knowledge-dates'
import { mergeKnowledgeAnimalRecords } from '@/lib/ai/knowledge-records'
import { getAdminFirestore } from '@/lib/firebase-admin'
import type { Animal, AnimalRecord } from '@/types/animals'

jest.mock('@/lib/firebase-admin', () => ({ getAdminFirestore: jest.fn() }))

const now = new Date('2026-11-01T07:30:00Z')
const animal = (id: string, records: AnimalRecord[] = []): Animal => ({
  id,
  farmerId: 'owner',
  farmId: 'farm',
  animalNumber: id,
  type: 'vaca',
  gender: 'hembra',
  stage: 'reproductor',
  status: 'activo',
  birthDate: new Date('2023-01-01T12:00:00Z'),
  createdAt: now,
  updatedAt: now,
  records,
})
const record = (id: string): AnimalRecord => ({
  id,
  type: 'health',
  category: 'other',
  title: 'Revisión',
  date: now,
  createdAt: now,
  createdBy: 'owner',
  appliedToAnimals: ['A1', 'A2'],
})

function database(rows: Record<string, Array<Record<string, unknown>>>) {
  const reads: string[] = []
  jest.mocked(getAdminFirestore).mockReturnValue({
    collection: (name: string) => {
      reads.push(name)
      const query = {
        where: () => query,
        get: async () => ({
          docs: (rows[name] ?? []).map((value, index) => ({
            id: value.id ?? `${name}-${index}`,
            data: () => value,
          })),
        }),
      }
      return query
    },
  } as unknown as ReturnType<typeof getAdminFirestore>)
  return reads
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(now)
})
afterEach(() => jest.useRealTimers())

it('publica documentos actuales, cobertura real y páginas posteriores sin recuentos del modelo', async () => {
  database({ animals: Array.from({ length: 205 }, (_, index) => ({ ...animal(`A${index}`) })) })
  const first = await buildAiKnowledge(
    'farm',
    'Muéstrame todos los animales',
    { animals: true, reminders: false, breeding: false },
    { timeZone: 'America/Mazatlan' },
  )
  expect(first.documents['animales/catalogo.json'].coverage).toEqual({
    total: 205,
    returned: 150,
    offset: 0,
    hasMore: true,
    cursor: '150',
  })
  const second = await buildAiKnowledge(
    'farm',
    '',
    { animals: true, reminders: false, breeding: false },
    { page: { topic: 'animals', offset: 150, limit: 50 } },
  )
  expect(second.documents['animales/catalogo.json'].coverage).toEqual({
    total: 205,
    returned: 50,
    offset: 150,
    hasMore: true,
    cursor: '200',
  })
  expect(first.documents['referencias/especies.json'].data).toEqual(
    expect.arrayContaining([expect.objectContaining({ type: 'vaca', gestationDays: 283 })]),
  )
})

it('no consulta ni revela animales, montas o sus totales sin acceso a los módulos', async () => {
  const reads = database({
    animals: [{ ...animal('SECRETO') }],
    breedingRecords: [{ id: 'private' }],
  })
  const result = await buildAiKnowledge('farm', 'Todas las montas', {
    animals: false,
    reminders: true,
    breeding: true,
  })
  expect(reads).toEqual(['reminders'])
  for (const path of [
    'animales/catalogo.json',
    'reproduccion/empadres.json',
    'reproduccion/partos.json',
  ]) {
    expect(result.documents[path]).toMatchObject({
      available: false,
      loaded: false,
      data: null,
      coverage: { total: null, returned: 0 },
    })
  }
  expect(JSON.stringify(result)).not.toContain('SECRETO')
})

it('distingue detalles no cargados de una lista vacía completa', async () => {
  database({ animals: [{ ...animal('A1') }] })
  const result = await buildAiKnowledge('farm', 'Hola', {
    animals: true,
    reminders: false,
    breeding: false,
  })
  expect(result.documents['animales/catalogo.json']).toMatchObject({
    available: true,
    loaded: false,
    data: null,
    coverage: { total: 1, returned: 0, hasMore: true },
  })
  expect(result.documents['pendientes/destetes.json']).toMatchObject({
    available: true,
    loaded: true,
    coverage: { total: 0, returned: 0, hasMore: false },
  })
})

it('integra eventos centrales y comprobantes sin duplicar un movimiento masivo', async () => {
  const shared = record('event-1')
  database({
    animals: [{ ...animal('A1', [shared]) }, { ...animal('A2', [shared]) }],
    animalRecords: [{ ...shared, farmId: 'farm', animals: ['A1', 'A2'] }],
    recordMovements: [{ id: 'event-1', farmId: 'farm', record: shared }],
  })
  const result = await buildAiKnowledge('farm', 'Últimos movimientos', {
    animals: true,
    reminders: false,
    breeding: false,
  })
  const movements = result.documents['historial/movimientos.json']
  expect(movements.coverage.total).toBe(1)
  expect(movements.data).toEqual([
    expect.objectContaining({ id: 'event-1', animales: ['A1', 'A2'] }),
  ])
})

it('el comprobante de reversión prevalece sobre copias antiguas del registro', () => {
  const shared = record('event-1')
  const merged = mergeKnowledgeAnimalRecords(
    [animal('A1', [shared])],
    [{ id: shared.id, data: { ...shared, farmId: 'farm', animals: ['A1'] } }],
    [{ id: shared.id, data: { farmId: 'farm', record: { ...shared, undoneAt: now } } }],
    'farm',
  )
  expect(merged[0].records?.[0].undoneAt).toEqual(now)
})

it('usa la fecha de negocio para ordeños de hoy en vez de la fecha UTC del servidor', async () => {
  const milk = {
    ...record('milk-1'),
    type: 'milk',
    amountMl: 1000,
    session: 'morning',
    date: new Date('2026-11-01T05:00:00Z'),
  }
  database({
    animals: [
      {
        ...animal('A1', [milk as AnimalRecord]),
        lactationStatus: 'active',
        lactationPurpose: 'dairy',
      },
    ],
  })
  const result = await buildAiKnowledge(
    'farm',
    'Leche de hoy',
    { animals: true, reminders: false, breeding: false },
    { timeZone: 'America/Mazatlan' },
  )
  expect(result.documents['produccion/leche.json'].data).toMatchObject({
    resumen: { ordeñosHoy: 0, litrosHoy: 0 },
  })
  expect(result.index.timeZone).toBe('America/Mazatlan')
})

it('el cálculo de días respeta días de calendario y conserva entradas de fecha sin hora', () => {
  expect(knowledgeDateKey('2026-11-01', 'America/Mazatlan')).toBe('2026-11-01')
  expect(knowledgeDateKey(new Date('2026-11-01T05:00:00Z'), 'America/Mazatlan')).toBe('2026-10-31')
  expect(
    knowledgeDaysUntil(new Date('2026-11-01T05:00:00Z'), '2026-11-01', 'America/Mazatlan'),
  ).toBe(1)
})

it('consulta una ficha exacta por referencia sin exponer IDs internos de animales', async () => {
  database({ animals: [{ ...animal('internal-doc'), animalNumber: '324-A' }] })
  const result = await buildAiKnowledge('farm', 'Muéstrame 324-A', {
    animals: true,
    reminders: false,
    breeding: false,
  })
  expect(result.documents['animales/324-A.json'].data).toMatchObject({ numero: '324-A' })
  expect(result.documents['animales/324-A.json'].data).not.toHaveProperty('id')
})

it('cuenta gestaciones vigentes sin monta y no convierte una confirmación antigua en embarazo', async () => {
  database({
    animals: [
      { ...animal('A1'), pregnantAt: new Date('2026-10-01T12:00:00Z') },
      { ...animal('A2') },
    ],
    breedingRecords: [
      {
        id: 'old-monta',
        status: 'finished',
        maleId: 'unknown',
        femaleBreedingInfo: [
          { femaleId: 'A2', pregnancyConfirmedDate: new Date('2026-01-01T12:00:00Z') },
        ],
      },
    ],
  })
  const result = await buildAiKnowledge(
    'farm',
    'Próximos partos',
    { animals: true, reminders: false, breeding: true },
    { timeZone: 'America/Mazatlan' },
  )
  expect(result.documents['reproduccion/partos.json'].coverage.total).toBe(1)
  expect(result.documents['reproduccion/partos.json'].data).toMatchObject({
    proximosPartos: [expect.objectContaining({ hembra: 'A1', fechaEsperada: '2027-07-11' })],
  })
})
