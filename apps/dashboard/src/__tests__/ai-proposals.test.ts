/** @jest-environment node */

import {
  cancelAiProposal,
  confirmAiProposal,
  createAiProposal,
  getAiProposal,
  operationDate,
  reviseAiProposal,
} from '@/lib/ai/proposals'
import {
  createRecordMovementService,
  type MovementTransport,
} from '@/lib/domain/record-movement-service'
import { getAdminFirestore } from '@/lib/firebase-admin'
import type { MovementPlan } from '@/lib/record-movements'
import type { Animal } from '@/types/animals'
import type { FarmPermission } from '@/types/farm'

jest.mock('@/lib/firebase-admin', () => ({ getAdminFirestore: jest.fn() }))
jest.mock('@/lib/ai/server', () => ({
  hasPermission: (permissions: FarmPermission[], module: string, action: string) =>
    permissions.some(
      (permission) => permission.module === module && permission.actions.includes(action as never),
    ),
}))
const scope = {
  userId: 'user',
  farmId: 'farm',
  permissions: [
    { module: 'animals', actions: ['create', 'read', 'update'] },
    { module: 'breeding', actions: ['create', 'read', 'update'] },
  ] as FarmPermission[],
}
function database(initial: Record<string, any> = {}, failWritePrefix?: string) {
  const store = new Map(Object.entries(initial))
  let sequence = 0
  let queue = Promise.resolve()
  const snap = (path: string) => ({
    id: path.split('/').at(-1),
    exists: store.has(path),
    data: () => store.get(path),
  })
  const doc = (path: string): any => ({
    path,
    id: path.split('/').at(-1),
    get: async () => snap(path),
    set: async (value: any) => {
      store.set(path, value)
    },
  })
  const query = (name: string, field: string, value: string): any => ({
    name,
    field,
    value,
    get: async () => ({
      docs: [...store]
        .filter(([path, data]) => path.startsWith(`${name}/`) && data[field] === value)
        .map(([path]) => snap(path)),
    }),
  })
  const db = {
    doc,
    collection: (name: string) => ({
      doc: (id?: string) => doc(`${name}/${id ?? `proposal-${++sequence}`}`),
      where: (field: string, _op: string, value: string) => query(name, field, value),
    }),
    runTransaction: (callback: any) => {
      const pending = queue.then(async () => {
        const writes: Array<() => void> = []
        const result = await callback({
          get: async (ref: any) => (ref.path ? snap(ref.path) : ref.get()),
          set: (ref: any, value: any) => writes.push(() => store.set(ref.path, value)),
          create: (ref: any, value: any) => {
            if (failWritePrefix && ref.path.startsWith(failWritePrefix))
              throw new Error('Injected transaction write failure')
            writes.push(() => {
              if (store.has(ref.path)) throw new Error('already exists')
              store.set(ref.path, value)
            })
          },
          update: (ref: any, value: any) =>
            writes.push(() => store.set(ref.path, { ...store.get(ref.path), ...value })),
        })
        writes.forEach((write) => {
          write()
        })
        return result
      })
      queue = pending.then(
        () => undefined,
        () => undefined,
      )
      return pending
    },
  }
  jest.mocked(getAdminFirestore).mockReturnValue(db as never)
  return store
}
const createAction = {
  type: 'create_animal',
  summary: 'texto del modelo',
  payload: {
    animalNumber: 'A1',
    type: 'vaca',
    gender: 'hembra',
    stage: 'cria',
    birthDate: '2026-10-25',
  },
}
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-01T18:00:00Z'))
  jest.clearAllMocks()
})
afterEach(() => jest.useRealTimers())

it('prepara sin escribir animales y confirma una sola vez ante reintentos concurrentes', async () => {
  const store = database()
  const proposal = await createAiProposal({
    ...scope,
    action: createAction,
    conversationId: 'chat',
    timeZone: 'America/Mazatlan',
  })
  expect([...store.keys()].filter((path) => path.startsWith('animals/'))).toHaveLength(0)
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      confirmAiProposal({ ...scope, proposalId: proposal.id, revision: 1 }),
    ),
  )
  expect(results.every((result) => result.status === 'succeeded')).toBe(true)
  const animals = [...store.entries()].filter(([path]) => path.startsWith('animals/'))
  expect(animals).toHaveLength(1)
  expect(animals[0][1].status).toBe('activo')
  expect(animals[0][1].records.some((record: any) => record.eventType === 'alta')).toBe(true)
  expect([...store.keys()].filter((path) => path.startsWith('recordMovements/'))).toHaveLength(1)
  expect(results[0].receipt).toEqual(results[4].receipt)
})

it('revalida cambios y solo permite guardar después de revisar una nueva revisión', async () => {
  const store = database()
  const proposal = await createAiProposal({
    ...scope,
    action: createAction,
    conversationId: 'chat',
  })
  store.set('animals/other', {
    farmId: 'farm',
    animalNumber: 'B2',
    type: 'vaca',
    gender: 'hembra',
    stage: 'cria',
    status: 'activo',
  })
  await expect(
    confirmAiProposal({ ...scope, proposalId: proposal.id, revision: 1 }),
  ).rejects.toMatchObject({ status: 409 })
  const revised = await reviseAiProposal({
    ...scope,
    proposalId: proposal.id,
    revision: 1,
    action: createAction,
  })
  expect(revised.revision).toBe(2)
  await expect(
    confirmAiProposal({ ...scope, proposalId: proposal.id, revision: 1 }),
  ).rejects.toMatchObject({ status: 409 })
  expect((await confirmAiProposal({ ...scope, proposalId: proposal.id, revision: 2 })).status).toBe(
    'succeeded',
  )
})

it('no ejecuta propuestas canceladas, vencidas, ajenas o sin permisos actuales', async () => {
  database()
  const proposal = await createAiProposal({
    ...scope,
    action: createAction,
    conversationId: 'chat',
  })
  await expect(
    confirmAiProposal({ ...scope, userId: 'other', proposalId: proposal.id, revision: 1 }),
  ).rejects.toMatchObject({ status: 404 })
  await expect(
    confirmAiProposal({ ...scope, permissions: [], proposalId: proposal.id, revision: 1 }),
  ).rejects.toMatchObject({ status: 403 })
  await cancelAiProposal({ ...scope, proposalId: proposal.id, revision: 1 })
  await expect(
    confirmAiProposal({ ...scope, proposalId: proposal.id, revision: 1 }),
  ).rejects.toMatchObject({ status: 409 })
  const another = await createAiProposal({ ...scope, action: createAction, conversationId: 'chat' })
  jest.advanceTimersByTime(16 * 60 * 1000)
  expect((await getAiProposal({ ...scope, proposalId: another.id })).status).toBe('expired')
  await expect(
    confirmAiProposal({ ...scope, proposalId: another.id, revision: 1 }),
  ).rejects.toMatchObject({ status: 409 })
})

it('desteta con el mismo servicio de la UI, actualiza la madre y conserva journal reversible', async () => {
  const store = database({
    'animals/mother': {
      farmId: 'farm',
      animalNumber: 'M1',
      gender: 'hembra',
      type: 'vaca',
      stage: 'reproductor',
      status: 'activo',
      lactationPurpose: 'offspring',
      lactationStatus: 'active',
    },
    'animals/child': {
      farmId: 'farm',
      animalNumber: 'C1',
      gender: 'macho',
      type: 'vaca',
      stage: 'cria',
      status: 'activo',
      motherId: 'mother',
    },
  })
  const proposal = await createAiProposal({
    ...scope,
    conversationId: 'chat',
    action: {
      type: 'register_weaning',
      summary: 'Destetar',
      payload: { animalRefs: ['C1'], date: '2026-11-01', destination: 'engorda' },
    },
  })
  await confirmAiProposal({ ...scope, proposalId: proposal.id, revision: 1 })
  expect(store.get('animals/child').isWeaned).toBe(true)
  expect(store.get('animals/mother').lactationStatus).toBe('dry')
  expect(
    store
      .get(`recordMovements/${proposal.id}`)
      .record.undoData.documents.map((entry: any) => entry.path),
  ).toContain('animals/mother')
})

it('interpreta las fechas en la zona indicada y rechaza días imposibles o futuros', () => {
  expect(operationDate('2026-11-01', 'America/Mazatlan').toISOString()).toBe(
    '2026-11-01T07:00:00.000Z',
  )
  expect(() => operationDate('2026-02-30', 'UTC')).toThrow('fecha')
  expect(() => operationDate('2026-03-08', 'America/New_York', '02:30')).toThrow('hora')
  expect(() => operationDate('2026-11-02', 'America/Mazatlan')).toThrow('futuro')
})

const adult = (number: string, gender: 'macho' | 'hembra') => ({
  farmId: 'farm',
  animalNumber: number,
  gender,
  type: 'vaca',
  stage: 'reproductor',
  status: 'activo',
  birthDate: new Date('2020-01-01T00:00:00Z'),
  records: [],
})
const pendingBreeding = () => ({
  farmId: 'farm',
  breedingId: 'EMP-1',
  maleId: 'male',
  status: 'active',
  breedingDate: new Date('2026-10-01T00:00:00Z'),
  femaleBreedingInfo: [
    {
      femaleId: 'female',
      pregnancyConfirmedDate: null,
      expectedBirthDate: null,
      actualBirthDate: null,
      offspring: [],
    },
  ],
})

it.each([
  ['create_breeding', { maleRef: 'M1', femaleRefs: ['F1'], breedingDate: '2026-10-01' }],
  ['register_weight', { animalRef: 'F1', date: '2026-11-01', weightKg: 250.5 }],
  ['register_milk', { animalRef: 'F1', date: '2026-11-01', liters: 12.5, session: 'morning' }],
  [
    'register_health',
    {
      animalRefs: ['F1'],
      date: '2026-11-01',
      title: 'Vacuna registrada',
      category: 'vaccine',
      categories: ['vaccine', 'deworming'],
      cost: 250,
    },
  ],
  [
    'create_sale',
    {
      animalRefs: ['F1'],
      date: '2026-11-01',
      pricePerKg: 40,
      weights: [{ animalRef: 'F1', weightKg: 250 }],
      buyer: 'Comprador',
    },
  ],
] as const)('ejecuta %s con comprobante y efectos del servicio compartido', async (type, payload) => {
  const store = database({
    'animals/male': adult('M1', 'macho'),
    'animals/female': {
      ...adult('F1', 'hembra'),
      lactationStatus: 'dry',
      lactationPurpose: 'offspring',
    },
  })
  const proposal = await createAiProposal({
    ...scope,
    conversationId: 'chat',
    timeZone: 'UTC',
    action: { type, summary: 'Texto libre', payload },
  })
  expect(proposal.summary).not.toBe('Texto libre')
  const confirmed = await confirmAiProposal({ ...scope, proposalId: proposal.id, revision: 1 })
  expect(confirmed.status).toBe('succeeded')
  const record = store.get(`recordMovements/${proposal.id}`).record
  expect(record.appliedToAnimals).toContain('female')
  if (type === 'create_breeding') {
    expect(store.get(`breedingRecords/${proposal.id}`)).toMatchObject({
      maleId: 'male',
      status: 'active',
      femaleBreedingInfo: [{ femaleId: 'female' }],
    })
    expect(record.undoData.documents.map((d: any) => d.path)).toContain(
      `breedingRecords/${proposal.id}`,
    )
  }
  if (type === 'register_weight') expect(store.get('animals/female').weight).toBe(250500)
  if (type === 'register_milk') {
    expect(store.get('animals/female')).toMatchObject({
      lactationStatus: 'active',
      lactationPurpose: 'dual',
    })
    expect(record.amountMl).toBe(12500)
    expect(proposal.effects.join(' ')).toContain('activará la lactancia')
  }
  if (type === 'register_health') {
    expect(store.get(`animalRecords/${proposal.id}`)).toMatchObject({
      animals: ['female'],
      type: 'health',
      category: 'vaccine',
      categories: ['vaccine', 'deworming'],
      cost: 250,
    })
    expect(store.get('animals/female').records).toHaveLength(0)
  }
  if (type === 'create_sale') {
    expect(store.get('animals/female')).toMatchObject({
      status: 'vendido',
      soldInfo: { buyer: 'Comprador', weight: 250000, price: 1000000 },
    })
    expect(store.get(`sales/${proposal.id}`)).toMatchObject({
      status: 'completed',
      pricePerKg: 4000,
      priceType: 'en_pie',
      buyer: 'Comprador',
      animals: [{ animalId: 'female', weight: 250000 }],
    })
    expect(record.undoData.documents.map((d: any) => d.path)).toContain(`sales/${proposal.id}`)
  }
})

it('confirma gestación, deriva el parto esperado y termina la monta con journal reversible', async () => {
  const store = database({
    'animals/male': adult('M1', 'macho'),
    'animals/female': adult('F1', 'hembra'),
    'breedingRecords/mount': pendingBreeding(),
  })
  const proposal = await createAiProposal({
    ...scope,
    conversationId: 'chat',
    timeZone: 'UTC',
    action: {
      type: 'confirm_pregnancy',
      summary: 'Confirmar',
      payload: { breedingRef: 'EMP-1', femaleRefs: ['F1'], referenceDate: '2026-10-01' },
    },
  })
  expect(proposal.effects.join(' ')).toContain('macho quedará disponible')
  await confirmAiProposal({ ...scope, proposalId: proposal.id, revision: 1 })
  expect(store.get('breedingRecords/mount').status).toBe('finished')
  expect(store.get('animals/female')).toMatchObject({
    pregnantBy: 'male',
    pregnantBreedingRecordId: 'mount',
  })
  const expected = store.get('breedingRecords/mount').femaleBreedingInfo[0].expectedBirthDate
  expect(expected.getTime() - new Date('2026-10-01T00:00:00Z').getTime()).toBe(283 * 86400000)
  const journal = store.get(`recordMovements/${proposal.id}`).record.undoData.documents
  expect(journal.find((entry: any) => entry.path === 'breedingRecords/mount').before.status).toBe(
    'active',
  )
  expect(journal.find((entry: any) => entry.path === 'animals/female').before.pregnantAt).toBeNull()
})

it('termina un empadre mediante el mismo movimiento de actualización', async () => {
  const store = database({
    'animals/male': adult('M1', 'macho'),
    'animals/female': adult('F1', 'hembra'),
    'breedingRecords/mount': pendingBreeding(),
  })
  const proposal = await createAiProposal({
    ...scope,
    conversationId: 'chat',
    timeZone: 'UTC',
    action: { type: 'finish_breeding', summary: 'Terminar', payload: { breedingRef: 'EMP-1' } },
  })
  await confirmAiProposal({ ...scope, proposalId: proposal.id, revision: 1 })
  expect(store.get('breedingRecords/mount').status).toBe('finished')
  expect(
    store.get(`recordMovements/${proposal.id}`).record.undoData.documents.length,
  ).toBeGreaterThan(0)
})

it('registra el parto, las crías, la lactancia y el resultado de la monta atómicamente', async () => {
  const breeding = pendingBreeding()
  breeding.femaleBreedingInfo[0] = {
    ...breeding.femaleBreedingInfo[0],
    pregnancyConfirmedDate: new Date('2026-01-01T00:00:00Z') as never,
    expectedBirthDate: new Date('2026-10-11T00:00:00Z') as never,
  }
  const store = database({
    'animals/male': adult('M1', 'macho'),
    'animals/female': {
      ...adult('F1', 'hembra'),
      pregnantAt: new Date('2026-01-01T00:00:00Z'),
      pregnantBy: 'male',
      pregnantBreedingRecordId: 'mount',
    },
    'breedingRecords/mount': breeding,
  })
  const proposal = await createAiProposal({
    ...scope,
    conversationId: 'chat',
    timeZone: 'UTC',
    action: {
      type: 'register_birth',
      summary: 'Parto',
      payload: {
        motherRef: 'F1',
        birthDate: '2026-10-30',
        birthTime: '10:00',
        offspring: [
          { animalNumber: 'C1', gender: 'hembra', weightKg: 35 },
          { animalNumber: 'C2', gender: 'macho', weightKg: 36 },
        ],
      },
    },
  })
  await confirmAiProposal({ ...scope, proposalId: proposal.id, revision: 1 })
  expect(store.get(`animals/${proposal.id}-cria-0`)).toMatchObject({
    animalNumber: 'C1',
    motherId: 'female',
    fatherId: 'male',
    stage: 'cria',
    weight: 35000,
  })
  expect(store.get(`animals/${proposal.id}-cria-1`)).toMatchObject({
    animalNumber: 'C2',
    weight: 36000,
  })
  expect(store.get('animals/female')).toMatchObject({ pregnantAt: null, lactationStatus: 'active' })
  expect(store.get('breedingRecords/mount').femaleBreedingInfo[0].offspring).toEqual([
    `${proposal.id}-cria-0`,
    `${proposal.id}-cria-1`,
  ])
  const receipt = store.get(`recordMovements/${proposal.id}`)
  expect(receipt.record.type).toBe('birth')
  expect(
    receipt.record.undoData.documents.filter((entry: any) => entry.before === null),
  ).toHaveLength(2)
  const retry = await confirmAiProposal({ ...scope, proposalId: proposal.id, revision: 1 })
  expect(retry.status).toBe('succeeded')
  expect([...store].filter(([path]) => path.includes('-cria-'))).toHaveLength(2)
})

it('rechaza crías duplicadas y fechas de parto previas a la gestación sin escribir', async () => {
  const store = database({
    'animals/female': { ...adult('F1', 'hembra'), pregnantAt: new Date('2026-10-01T00:00:00Z') },
  })
  const original = JSON.stringify([...store])
  const payload = {
    motherRef: 'F1',
    birthDate: '2026-10-30',
    birthTime: '10:00',
    offspring: [
      { animalNumber: 'C-1', gender: 'hembra' },
      { animalNumber: 'C1', gender: 'macho' },
    ],
  }
  await expect(
    createAiProposal({
      ...scope,
      conversationId: 'chat',
      timeZone: 'UTC',
      action: { type: 'register_birth', summary: 'Parto', payload },
    }),
  ).rejects.toThrow('ID')
  await expect(
    createAiProposal({
      ...scope,
      conversationId: 'chat',
      timeZone: 'UTC',
      action: {
        type: 'register_birth',
        summary: 'Parto',
        payload: { ...payload, birthDate: '2026-09-30', offspring: [payload.offspring[0]] },
      },
    }),
  ).rejects.toThrow()
  expect(JSON.stringify([...store])).toBe(original)
})

it('no deja animales ni comprobantes parciales si falla la transacción antes de confirmar', async () => {
  const store = database({}, 'recordMovements/')
  const proposal = await createAiProposal({
    ...scope,
    action: createAction,
    conversationId: 'chat',
    timeZone: 'UTC',
  })
  await expect(
    confirmAiProposal({ ...scope, proposalId: proposal.id, revision: 1 }),
  ).rejects.toThrow('write failure')
  expect(
    [...store.keys()].some(
      (path) =>
        path.startsWith('animals/') ||
        path.startsWith('recordMovements/') ||
        path.startsWith('animalNumberReservations/'),
    ),
  ).toBe(false)
  expect(store.get(`aiActionProposals/${proposal.id}`).status).toBe('ready')
})

it('usa el ID real de Firestore aunque el documento contenga un campo id diferente', async () => {
  const store = database({ 'animals/female': { ...adult('F1', 'hembra'), id: 'forged' } })
  const proposal = await createAiProposal({
    ...scope,
    conversationId: 'chat',
    timeZone: 'UTC',
    action: {
      type: 'register_weight',
      summary: 'Peso',
      payload: { animalRef: 'F1', date: '2026-11-01', weightKg: 300 },
    },
  })
  await confirmAiProposal({ ...scope, proposalId: proposal.id, revision: 1 })
  expect(store.get('animals/female').weight).toBe(300000)
  expect(store.has('animals/forged')).toBe(false)
})

it('conserva la intención semental y rechaza marcar hembras o machos demasiado jóvenes', async () => {
  const store = database()
  const action = {
    ...createAction,
    payload: {
      ...createAction.payload,
      gender: 'macho',
      stage: 'reproductor',
      birthDate: '2020-01-01',
      isBreedingMale: true,
    },
  }
  const proposal = await createAiProposal({
    ...scope,
    conversationId: 'chat',
    timeZone: 'UTC',
    action,
  })
  await confirmAiProposal({ ...scope, proposalId: proposal.id, revision: 1 })
  expect(store.get(`animals/${proposal.id}`).isBreedingMale).toBe(true)
  await expect(
    createAiProposal({
      ...scope,
      conversationId: 'chat',
      timeZone: 'UTC',
      action: { ...action, payload: { ...action.payload, animalNumber: 'A2', gender: 'hembra' } },
    }),
  ).rejects.toThrow('macho')
})

it('produce los mismos cambios y registro al destetar desde el servicio manual y el servidor', async () => {
  const initial = {
    'animals/mother': {
      ...adult('M1', 'hembra'),
      lactationPurpose: 'offspring',
      lactationStatus: 'active',
    },
    'animals/child': {
      farmId: 'farm',
      animalNumber: 'C1',
      gender: 'macho',
      type: 'vaca',
      stage: 'cria',
      status: 'activo',
      motherId: 'mother',
      records: [],
    },
  }
  const store = database(initial)
  let manualPlan: MovementPlan | undefined
  const transport: MovementTransport = {
    commitMovement: async (_context, _id, _ids, _extra, build) => {
      manualPlan = build(new Map(Object.entries(initial)))
      return manualPlan.record as never
    },
    commitCentralRecord: async () => {
      throw new Error('unexpected')
    },
    undoMovement: async () => {
      throw new Error('unexpected')
    },
  }
  const manual = createRecordMovementService(
    Object.entries(initial).map(([path, data]) => ({
      ...data,
      id: path.split('/')[1],
    })) as Animal[],
    { userId: 'user', farmId: 'farm', timeZone: 'UTC' },
    transport,
  )
  const proposal = await createAiProposal({
    ...scope,
    conversationId: 'chat',
    timeZone: 'UTC',
    action: {
      type: 'register_weaning',
      summary: 'Destete',
      payload: {
        animalRefs: ['C1'],
        date: '2026-11-01',
        destination: 'engorda',
        notes: 'Lote uno',
      },
    },
  })
  await manual.wean(proposal.id, ['child'], new Date('2026-11-01T00:00:00Z'), 'engorda', 'Lote uno')
  await confirmAiProposal({ ...scope, proposalId: proposal.id, revision: 1 })
  for (const change of manualPlan!.changes)
    expect(store.get(change.path)).toEqual(expect.objectContaining(change.data))
  expect(store.get(`recordMovements/${proposal.id}`).record).toEqual(
    expect.objectContaining(manualPlan!.record),
  )
})

it('registra varias muertes con el mismo plan del flujo manual, sin escribir antes de confirmar', async () => {
  const initial = Object.fromEntries(
    ['one', 'two'].map((id, i) => [
      `animals/${id}`,
      {
        farmId: 'farm',
        animalNumber: `A${i + 1}`,
        gender: 'hembra',
        type: 'oveja',
        stage: 'reproductor',
        status: 'activo',
        records: [],
      },
    ]),
  )
  const store = database(initial)
  let manualPlan: MovementPlan | undefined
  const transport: MovementTransport = {
    commitMovement: async (_context, _id, _ids, _extra, build) => {
      manualPlan = build(new Map(Object.entries(initial)))
      return manualPlan.record as never
    },
    commitCentralRecord: async () => {
      throw new Error('unexpected')
    },
    undoMovement: async () => {
      throw new Error('unexpected')
    },
  }
  const manual = createRecordMovementService(
    Object.entries(initial).map(([path, data]) => ({
      ...data,
      id: path.split('/')[1],
    })) as Animal[],
    { userId: 'user', farmId: 'farm', timeZone: 'UTC' },
    transport,
  )
  const prepared = await createAiProposal({
    ...scope,
    conversationId: 'chat',
    timeZone: 'UTC',
    action: {
      type: 'register_death',
      summary: 'Registrar muerte de A1 y A2',
      payload: {
        animalRefs: ['A1', 'A2'],
        date: '2026-11-01',
        reason: 'attack',
        notes: 'Ataque reportado',
      },
    },
  })
  expect(store.get('animals/one').status).toBe('activo')
  expect(store.get('animals/two').status).toBe('activo')
  expect(prepared.effects.join(' ')).toContain('pasarán a Muerto')
  await manual.death(
    prepared.id,
    ['one', 'two'],
    new Date('2026-11-01T00:00:00Z'),
    'attack',
    'Ataque reportado',
  )
  const saved = await confirmAiProposal({ ...scope, proposalId: prepared.id, revision: 1 })
  expect(saved.status).toBe('succeeded')
  for (const change of manualPlan!.changes)
    expect(store.get(change.path)).toEqual(expect.objectContaining(change.data))
  expect(store.get(`recordMovements/${prepared.id}`).record).toEqual(
    expect.objectContaining(manualPlan!.record),
  )
  await confirmAiProposal({ ...scope, proposalId: prepared.id, revision: 1 })
  expect([...store.keys()].filter((path) => path.startsWith('recordMovements/'))).toHaveLength(1)
})
it.each([
  'muerto',
  'vendido',
  'perdido',
])('rechaza la muerte del grupo completo si contiene un animal %s', async (status) => {
  const store = database({
    'animals/one': { farmId: 'farm', animalNumber: 'A1', status: 'activo' },
    'animals/two': { farmId: 'farm', animalNumber: 'A2', status },
  })
  await expect(
    createAiProposal({
      ...scope,
      conversationId: 'chat',
      action: {
        type: 'register_death',
        summary: 'Muerte',
        payload: { animalRefs: ['A1', 'A2'], date: '2026-11-01', reason: 'disease' },
      },
    }),
  ).rejects.toThrow('activos')
  expect(store.get('animals/one').status).toBe('activo')
  expect([...store.keys()].filter((path) => path.startsWith('recordMovements/'))).toHaveLength(0)
})
it('rechaza una fecha futura o un motivo de muerte inválido', async () => {
  database({ 'animals/one': { farmId: 'farm', animalNumber: 'A1', status: 'activo' } })
  const base = { animalRefs: ['A1'], date: '2026-11-01', reason: 'disease' }
  await expect(
    createAiProposal({
      ...scope,
      conversationId: 'chat',
      action: {
        type: 'register_death',
        summary: 'Muerte',
        payload: { ...base, date: '2026-11-03' },
      },
    }),
  ).rejects.toThrow('futuro')
  await expect(
    createAiProposal({
      ...scope,
      conversationId: 'chat',
      action: {
        type: 'register_death',
        summary: 'Muerte',
        payload: { ...base, reason: 'inventado' },
      },
    }),
  ).rejects.toThrow()
})

describe('register_health por grupo de animales', () => {
  const health = { date: '2026-11-01', title: 'Triple', category: 'vaccine' }
  const farm = () =>
    database({
      'animals/m1': adult('M1', 'macho'),
      'animals/f1': adult('F1', 'hembra'),
      'animals/f2': adult('F2', 'hembra'),
      'animals/sold': { ...adult('V1', 'hembra'), status: 'vendido' },
      'animals/sheep': { ...adult('O1', 'hembra'), type: 'oveja' },
      'animals/other': { ...adult('X1', 'hembra'), farmId: 'other-farm' },
    })
  const create = (payload: Record<string, unknown>) =>
    createAiProposal({
      ...scope,
      conversationId: 'chat',
      timeZone: 'UTC',
      action: { type: 'register_health', summary: 'Vacunación', payload },
    })

  it('resuelve todos los activos en servidor y guarda un solo evento sin escribir animales', async () => {
    const store = farm()
    const before = structuredClone(store.get('animals/f1'))
    const proposal = await create({ ...health, animalGroup: {} })
    expect(proposal.summary).toContain('4 animales activos')
    expect(proposal.effects.join(' ')).toContain('M1, F1, F2, O1')
    const confirmed = await confirmAiProposal({ ...scope, proposalId: proposal.id, revision: 1 })
    expect(confirmed.status).toBe('succeeded')
    expect(store.get(`animalRecords/${proposal.id}`).animals.sort()).toEqual([
      'f1',
      'f2',
      'm1',
      'sheep',
    ])
    expect(store.get(`recordMovements/${proposal.id}`).record.isBulkApplication).toBe(true)
    expect(store.get('animals/f1')).toEqual(before)
  })

  it('filtra el grupo por especie y sexo', async () => {
    const store = farm()
    const proposal = await create({ ...health, animalGroup: { type: 'vaca', gender: 'hembra' } })
    await confirmAiProposal({ ...scope, proposalId: proposal.id, revision: 1 })
    expect(store.get(`animalRecords/${proposal.id}`).animals.sort()).toEqual(['f1', 'f2'])
  })

  it('rechaza grupo vacío, grupo junto con referencias y ausencia de ambos', async () => {
    farm()
    await expect(create({ ...health, animalGroup: { type: 'cerdo' } })).rejects.toThrow(
      'No hay animales activos',
    )
    await expect(create({ ...health, animalGroup: {}, animalRefs: ['F1'] })).rejects.toThrow(
      'no ambos',
    )
    await expect(create({ ...health })).rejects.toThrow('Indica')
  })
})

describe('create_reminder', () => {
  const reminders = [
    { module: 'reminders', actions: ['create', 'read'] },
    { module: 'animals', actions: ['read'] },
  ] as FarmPermission[]
  const create = (payload: Record<string, unknown>, permissions = reminders) =>
    createAiProposal({
      ...scope,
      permissions,
      conversationId: 'chat',
      timeZone: 'America/Mazatlan',
      action: { type: 'create_reminder', summary: 'Recordatorio', payload },
    })

  it('crea un recordatorio futuro sin animales, una sola vez y sin movimiento de animales', async () => {
    const store = database({ 'animals/f1': adult('F1', 'hembra') })
    const proposal = await create(
      { title: ' Volver a vacunar ', dueDate: '2026-11-15', reminderType: 'medical' },
      reminders,
    )
    expect(proposal.summary).toContain('Volver a vacunar')
    expect(proposal.effects[0]).toContain('recordatorio')
    const params = { ...scope, permissions: reminders, proposalId: proposal.id, revision: 1 }
    const confirmed = await confirmAiProposal(params)
    expect(confirmed.status).toBe('succeeded')
    expect(confirmed.receipt?.href).toBe(`/recordatorio/${proposal.id}`)
    const saved = store.get(`reminders/${proposal.id}`)
    expect(saved).toMatchObject({
      farmId: 'farm',
      farmerId: 'user',
      title: 'Volver a vacunar',
      type: 'medical',
      priority: 'medium',
      completed: false,
      animalNumbers: [],
      animalNumber: null,
    })
    // Mediodía de la granja: el mismo día en cualquier navegador cercano a esa zona.
    expect(saved.dueDate.toISOString()).toBe('2026-11-15T19:00:00.000Z')
    expect(store.has(`recordMovements/${proposal.id}`)).toBe(false)
    expect((await confirmAiProposal(params)).status).toBe('succeeded')
  })

  it('vincula animales por su número visible', async () => {
    const store = database({
      'animals/f1': adult('F1', 'hembra'),
      'animals/m1': adult('M1', 'macho'),
    })
    const proposal = await create({
      title: 'Revisar',
      dueDate: '2026-11-02',
      priority: 'high',
      animalRefs: ['F1', 'm1'],
    })
    await confirmAiProposal({
      ...scope,
      permissions: reminders,
      proposalId: proposal.id,
      revision: 1,
    })
    expect(store.get(`reminders/${proposal.id}`)).toMatchObject({
      animalNumbers: ['F1', 'M1'],
      animalNumber: 'F1',
      completionByAnimal: { F1: false, M1: false },
      priority: 'high',
    })
    expect(store.get('animals/f1').records).toHaveLength(0)
  })

  it('rechaza fecha pasada, animal inexistente y falta de permiso', async () => {
    database({ 'animals/f1': adult('F1', 'hembra') })
    await expect(create({ title: 'X', dueDate: '2026-10-31' })).rejects.toThrow('anterior a hoy')
    await expect(create({ title: 'X', dueDate: '2026-11-05', animalRefs: ['ZZ'] })).rejects.toThrow(
      'No encontré',
    )
    await expect(
      create({ title: 'X', dueDate: '2026-11-05' }, [
        { module: 'animals', actions: ['create', 'read', 'update'] },
      ] as FarmPermission[]),
    ).rejects.toThrow('recordatorios')
  })
})

describe('create_area', () => {
  const areas = [{ module: 'areas', actions: ['create'] }] as FarmPermission[]
  const create = (payload: Record<string, unknown>, permissions = areas) =>
    createAiProposal({
      ...scope,
      permissions,
      conversationId: 'chat',
      timeZone: 'UTC',
      action: { type: 'create_area', summary: 'Área', payload },
    })
  const farm = () =>
    database({
      'farms/farm': { name: 'Granja', areas: [{ id: 'area_1', name: 'Potrero Norte' }] },
    })

  it('agrega el área a la granja conservando las existentes', async () => {
    const store = farm()
    const proposal = await create({ name: ' Corral 2 ', areaType: 'barn', areaM2: 120 })
    expect(proposal.summary).toContain('Corral 2')
    const confirmed = await confirmAiProposal({
      ...scope,
      permissions: areas,
      proposalId: proposal.id,
      revision: 1,
    })
    expect(confirmed.status).toBe('succeeded')
    const saved = store.get('farms/farm').areas
    expect(saved).toHaveLength(2)
    expect(saved[0]).toMatchObject({ id: 'area_1' })
    expect(saved[1]).toMatchObject({
      id: `area_${proposal.id}`,
      farmId: 'farm',
      name: 'Corral 2',
      type: 'barn',
      areaM2: 120,
      isActive: true,
    })
    expect(store.has(`recordMovements/${proposal.id}`)).toBe(false)
  })

  it('rechaza nombre duplicado y falta de permiso', async () => {
    farm()
    await expect(create({ name: 'potrero norte', areaType: 'pasture' })).rejects.toThrow(
      'Ya existe',
    )
    await expect(create({ name: 'Nuevo', areaType: 'pasture' }, scope.permissions)).rejects.toThrow(
      'áreas',
    )
  })
})
