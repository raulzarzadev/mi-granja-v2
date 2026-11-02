import { createHash } from 'node:crypto'
import {
  type DocumentData,
  type Firestore,
  Timestamp,
  type Transaction,
} from 'firebase-admin/firestore'
import { animalIdentityMatchesSearch, normalizeAnimalSearch } from '@/lib/animal-search'
import {
  type AnimalRegistrationInput,
  animalNumberReservationKey,
  buildRegisteredAnimal,
  validateAnimalRegistration,
} from '@/lib/domain/animal-registration-service'
import { farmDateKey, parseFarmDate } from '@/lib/domain/farm-calendar'
import {
  createRecordMovementService,
  type MovementTransport,
} from '@/lib/domain/record-movement-service'
import { getAdminFirestore } from '@/lib/firebase-admin'
import type { MovementPlan } from '@/lib/record-movements'
import type { BirthRecord } from '@/types'
import type { Animal, AnimalRecord } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'
import { generateBreedingId } from '@/types/breedings'
import type { FarmPermission } from '@/types/farm'
import {
  OPERATION_VERSION,
  type OperationAction,
  operationActionSchema,
  operationCatalog,
} from './operations'
import type { AiActionReceipt, AiProposalView } from './proposal-types'
import { hasPermission } from './server'

export class AiProposalError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message)
  }
}
type Scope = { userId: string; farmId: string; permissions: FarmPermission[] }
type FarmState = {
  animals: Animal[]
  breedings: BreedingRecord[]
  fingerprint: string
  raw: Map<string, DocumentData | null>
}
type StoredProposal = AiProposalView & {
  userId: string
  flowVersion: number
  timeZone: string
  fingerprint: string
}
const COLLECTION = 'aiActionProposals'
const clean = (value: unknown): any => {
  if (value instanceof Date || value instanceof Timestamp) return value
  if (Array.isArray(value)) return value.map(clean)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, clean(v)]),
    )
  return value
}
const normalize = (value: unknown): any => {
  if (value instanceof Date) return value.toISOString()
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function')
    return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, normalize(v)]),
    )
  return value
}
const dateFields = new Set([
  'birthDate',
  'createdAt',
  'updatedAt',
  'birthedAt',
  'pregnantAt',
  'weanedAt',
  'driedAt',
  'date',
  'breedingDate',
  'pregnancyConfirmedDate',
  'expectedBirthDate',
  'actualBirthDate',
])
function dates(value: unknown): any {
  if (Array.isArray(value)) return value.map(dates)
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function')
    return value.toDate()
  if (value instanceof Date) return value
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        dateFields.has(k) && typeof v === 'string' ? new Date(v) : dates(v),
      ]),
    )
  return value
}
function checkPermissions(scope: Scope, action: Pick<OperationAction, 'type'>) {
  const allowed = (module: FarmPermission['module'], permission: 'create' | 'update' | 'read') =>
    hasPermission(scope.permissions, module, permission)
  if (
    !allowed('animals', 'read') ||
    !allowed('animals', action.type === 'create_animal' ? 'create' : 'update')
  )
    throw new AiProposalError('No tienes permisos para realizar este movimiento.', 403)
  if (
    action.type === 'create_breeding' &&
    (!allowed('breeding', 'create') || !allowed('breeding', 'read'))
  )
    throw new AiProposalError('No tienes permisos para registrar empadres.', 403)
  if (
    (action.type === 'confirm_pregnancy' || action.type === 'finish_breeding') &&
    (!allowed('breeding', 'read') || !allowed('breeding', 'update'))
  )
    throw new AiProposalError('No tienes permisos para actualizar este empadre.', 403)
  if (
    action.type === 'register_birth' &&
    (!allowed('animals', 'create') ||
      !allowed('breeding', 'read') ||
      !allowed('breeding', 'update'))
  )
    throw new AiProposalError(
      'No tienes permisos para registrar partos y actualizar sus animales y empadres.',
      403,
    )
}
export function availableOperationCatalog(permissions: FarmPermission[]) {
  return operationCatalog.filter((entry) => {
    try {
      checkPermissions({ userId: '', farmId: '', permissions }, { type: entry.type })
      return true
    } catch {
      return false
    }
  })
}
export function operationDate(value: string, timeZone: string, time = '00:00'): Date {
  try {
    const result = parseFarmDate(value, timeZone, time)
    if (value > farmDateKey(new Date(), timeZone))
      throw new AiProposalError('La fecha no puede estar en el futuro.')
    return result
  } catch (error) {
    if (error instanceof AiProposalError) throw error
    throw new AiProposalError(error instanceof Error ? error.message : 'La fecha no es válida.')
  }
}
async function readState(
  db: Firestore,
  farmId: string,
  tx?: Transaction,
  includeBreeding = true,
): Promise<FarmState> {
  const queries = (includeBreeding ? ['animals', 'breedingRecords'] : ['animals']).map((name) =>
    db.collection(name).where('farmId', '==', farmId),
  )
  const snapshots = await Promise.all(queries.map((query) => (tx ? tx.get(query) : query.get())))
  const raw = new Map<string, DocumentData | null>()
  const rows = snapshots.map((snapshot, i) =>
    snapshot.docs.map((doc) => {
      raw.set(`${i === 0 ? 'animals' : 'breedingRecords'}/${doc.id}`, doc.data())
      return { ...dates(doc.data()), id: doc.id }
    }),
  )
  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify(
        [...raw.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([path, data]) => [path, normalize(data)]),
      ),
    )
    .digest('hex')
  return {
    animals: rows[0] as Animal[],
    breedings: (rows[1] ?? []) as BreedingRecord[],
    fingerprint,
    raw,
  }
}
const readsBreeding = (action: OperationAction) =>
  ['create_breeding', 'register_birth', 'confirm_pregnancy', 'finish_breeding'].includes(
    action.type,
  )

function resolveAnimal(state: FarmState, ref: string): Animal {
  const normalized = normalizeAnimalSearch(ref)
  if (!normalized) throw new AiProposalError('Indica un ID o nombre de animal válido.')
  const exact = state.animals.filter(
    (animal) => animal.id === ref || normalizeAnimalSearch(animal.animalNumber) === normalized,
  )
  const named = state.animals.filter(
    (animal) => animal.name && normalizeAnimalSearch(animal.name) === normalized,
  )
  const matches = exact.length
    ? exact
    : named.length
      ? named
      : state.animals.filter((animal) => animalIdentityMatchesSearch(animal, ref))
  if (matches.length !== 1)
    throw new AiProposalError(
      matches.length
        ? `“${ref}” coincide con varios animales. Usa su ID exacto.`
        : `No encontré el animal “${ref}” en esta granja.`,
    )
  return matches[0]
}
function resolveMany(state: FarmState, refs: string[]) {
  return [...new Set(refs.map((ref) => resolveAnimal(state, ref).id))]
}
type ExecutionPlan = {
  ids: string[]
  plan?: MovementPlan
  central?: Omit<AnimalRecord, 'id' | 'createdAt' | 'createdBy'>
  registration?: ReturnType<typeof buildRegisteredAnimal>
}
async function buildOperationPlan(
  scope: Scope,
  action: OperationAction,
  state: FarmState,
  id: string,
  timeZone: string,
): Promise<ExecutionPlan> {
  checkPermissions(scope, action)
  let captured: ExecutionPlan | undefined
  const transport: MovementTransport = {
    commitMovement: async (_context, _id, ids, extra, build) => {
      const documents = new Map(state.raw)
      for (const path of extra) if (!documents.has(path)) documents.set(path, null)
      // Domain builders use Dates consistently on both the client and server.
      const normalized = new Map(
        [...documents].map(([path, data]) => [path, data ? dates(data) : null]),
      )
      captured = { ids, plan: build(normalized) }
      return {} as AnimalRecord
    },
    commitCentralRecord: async (_context, _id, ids, input) => {
      captured = { ids, central: input }
      return {} as AnimalRecord
    },
    undoMovement: async () => {
      throw new AiProposalError('Esta acción no está habilitada en el asistente.')
    },
  }
  const service = createRecordMovementService(
    state.animals,
    { userId: scope.userId, farmId: scope.farmId, timeZone },
    transport,
  )
  const date = (value: string, time?: string) => operationDate(value, timeZone, time)
  switch (action.type) {
    case 'create_animal': {
      const p = action.payload
      const input: AnimalRegistrationInput = {
        animalNumber: p.animalNumber,
        name: p.name || '',
        type: p.type,
        gender: p.gender,
        stage: p.stage === 'reproductor' ? 'juvenil' : p.stage,
        breed: p.breed || '',
        status: 'activo',
        isBreedingMale: p.isBreedingMale ?? false,
        birthDate: date(p.birthDate),
        ...(p.weightKg ? { weight: Math.round(p.weightKg * 1000) } : {}),
        ...(p.motherRef ? { motherId: resolveAnimal(state, p.motherRef).id } : {}),
        ...(p.fatherRef ? { fatherId: resolveAnimal(state, p.fatherRef).id } : {}),
        notes: p.notes || '',
      }
      validateAnimalRegistration(input, state.animals, new Date(), timeZone)
      return {
        ids: [id],
        registration: buildRegisteredAnimal(
          input,
          { userId: scope.userId, farmId: scope.farmId },
          new Date(),
          id,
        ),
      }
    }
    case 'confirm_pregnancy':
    case 'finish_breeding': {
      const ref = action.payload.breedingRef.trim().toLocaleLowerCase()
      const matches = state.breedings.filter(
        (record) => record.breedingId?.toLocaleLowerCase() === ref || record.id === ref,
      )
      if (matches.length !== 1)
        throw new AiProposalError(
          matches.length
            ? 'El empadre coincide con varios resultados. Usa su código exacto.'
            : 'No encontré ese empadre en esta granja.',
        )
      if (action.type === 'confirm_pregnancy')
        await service.confirmPregnancy(
          id,
          matches[0],
          resolveMany(state, action.payload.femaleRefs),
          date(action.payload.referenceDate),
        )
      else await service.finishBreeding(id, matches[0])
      break
    }
    case 'register_weaning':
      await service.wean(
        id,
        resolveMany(state, action.payload.animalRefs),
        date(action.payload.date),
        action.payload.destination,
        action.payload.notes || '',
      )
      break
    case 'register_weight':
      await service.weight(
        id,
        resolveAnimal(state, action.payload.animalRef).id,
        date(action.payload.date),
        Math.round(action.payload.weightKg * 1000),
        action.payload.notes || '',
      )
      break
    case 'register_milk': {
      const animal = resolveAnimal(state, action.payload.animalRef)
      await service.milk(
        id,
        animal.id,
        date(action.payload.date),
        Math.round(action.payload.liters * 1000),
        action.payload.session,
        action.payload.notes || '',
      )
      break
    }
    case 'register_health':
      await service.health(id, resolveMany(state, action.payload.animalRefs), {
        ...action.payload,
        description: action.payload.description || action.payload.notes,
        date: date(action.payload.date),
      })
      break
    case 'create_breeding': {
      const p = action.payload
      const male = resolveAnimal(state, p.maleRef)
      const femaleIds = resolveMany(state, p.femaleRefs)
      const involved = new Set([male.id, ...femaleIds])
      if (
        state.breedings.some(
          (b) =>
            (b.status ?? 'active') !== 'finished' &&
            (involved.has(b.maleId) || b.femaleBreedingInfo.some((f) => involved.has(f.femaleId))),
        )
      )
        throw new AiProposalError('Un animal ya participa en un empadre activo.')
      await service.breeding(id, {
        breedingId: generateBreedingId(date(p.breedingDate), state.breedings),
        maleId: male.id,
        breedingDate: date(p.breedingDate),
        femaleBreedingInfo: femaleIds.map((femaleId) => ({
          femaleId,
          pregnancyConfirmedDate: null,
          expectedBirthDate: null,
          actualBirthDate: null,
          offspring: [],
        })),
        notes: p.notes || '',
        farmId: scope.farmId,
      })
      break
    }
    case 'register_birth': {
      const p = action.payload,
        mother = resolveAnimal(state, p.motherRef)
      if (!hasPermission(scope.permissions, 'animals', 'create'))
        throw new AiProposalError('No tienes permiso para crear las crías.', 403)
      const breeding = state.breedings.find((b) => b.id === mother.pregnantBreedingRecordId) || null
      if (
        breeding &&
        (!hasPermission(scope.permissions, 'breeding', 'read') ||
          !hasPermission(scope.permissions, 'breeding', 'update'))
      )
        throw new AiProposalError('No tienes permiso para actualizar el empadre.', 403)
      const numbers = new Set<string>()
      for (const child of p.offspring) {
        const key = normalizeAnimalSearch(child.animalNumber)
        if (
          numbers.has(key) ||
          state.animals.some((a) => normalizeAnimalSearch(a.animalNumber) === key)
        )
          throw new AiProposalError(`Ya existe una cría con el ID “${child.animalNumber}”.`)
        numbers.add(key)
      }
      // The service receives a local wall-clock Date; use the exact farm-time instant as birthDate via the optional override.
      const form = {
        animalId: mother.id,
        birthDate: p.birthDate,
        birthTime: p.birthTime,
        offspring: p.offspring.map((c) => ({
          animalNumber: c.animalNumber,
          gender: c.gender,
          weight: c.weightKg?.toString() || '',
          status: c.status,
          color: '',
          healthIssues: c.notes || '',
        })),
        notes: p.notes || '',
        totalOffspring: p.offspring.length,
      } as BirthRecord
      await service.birth(id, form, breeding, date(p.birthDate, p.birthTime))
      break
    }
    case 'create_sale': {
      const p = action.payload,
        animalIds = resolveMany(state, p.animalRefs)
      const weights = Object.fromEntries(
        p.weights.map((w) => [resolveAnimal(state, w.animalRef).id, Math.round(w.weightKg * 1000)]),
      )
      if (p.weights.length !== animalIds.length || animalIds.some((id) => !weights[id]))
        throw new AiProposalError('Indica el peso de cada animal seleccionado.')
      const price = Math.round(p.pricePerKg * 100)
      await service.sale(id, {
        animalIds,
        animalWeights: weights,
        date: date(p.date),
        pricePerKg: price,
        buyer: p.buyer || '',
        notes: p.notes || '',
        totalPriceCentavos: Math.round(
          animalIds.reduce((sum, id) => sum + (weights[id] / 1000) * price, 0),
        ),
        totalWeightGrams: animalIds.reduce((sum, id) => sum + weights[id], 0),
        priceType: 'en_pie',
      })
      break
    }
  }
  if (!captured) throw new AiProposalError('No se pudo preparar el movimiento.')
  return captured
}
async function planOperation(...args: Parameters<typeof buildOperationPlan>) {
  try {
    return await buildOperationPlan(...args)
  } catch (error) {
    if (error instanceof AiProposalError) throw error
    if (error instanceof Error && error.constructor === Error)
      throw new AiProposalError(error.message)
    throw error
  }
}
function describe(action: OperationAction, execution: ExecutionPlan, state: FarmState) {
  const title = operationCatalog.find((item) => item.type === action.type)!.title
  const details = execution.plan?.record.details ?? execution.central?.details ?? {}
  const labels = Object.entries(details).map(([key, value]) => `${key}: ${String(value)}`)
  if (!execution.registration)
    labels.unshift(
      `Animales: ${execution.ids.map((id) => state.animals.find((animal) => animal.id === id)?.animalNumber || 'No disponible').join(', ')}`,
    )
  if (
    execution.plan?.changes.some(
      (change) => change.path.startsWith('breedingRecords/') && change.data.status === 'finished',
    )
  )
    labels.push('El empadre pasará a Terminado y el macho quedará disponible para otra monta.')
  for (const change of execution.plan?.changes ?? []) {
    if (action.type === 'register_milk' && change.path.startsWith('animals/')) {
      const previous = state.animals.find((animal) => `animals/${animal.id}` === change.path)
      if (previous?.lactationStatus !== 'active')
        labels.push(
          'Se activará la lactancia al registrar el ordeño, como en el formulario de leche.',
        )
      if (previous?.lactationPurpose === 'offspring')
        labels.push('El propósito de lactancia cambiará de Crías a Ambos.')
    }

    if (
      change.path.startsWith('animals/') &&
      !execution.ids.includes(change.path.split('/')[1]) &&
      change.data.lactationStatus === 'dry'
    ) {
      const mother = state.animals.find((animal) => `animals/${animal.id}` === change.path)
      labels.push(
        `Se finalizará la lactancia para crías de ${mother?.animalNumber || 'la madre relacionada'}.`,
      )
    }
  }
  if (execution.registration)
    labels.push(
      `Animal: ${execution.registration.animalNumber}`,
      `Especie: ${execution.registration.type}`,
      `Género: ${execution.registration.gender}`,
    )
  return {
    title,
    summary: labels.length ? labels.join(' · ') : title,
    effects: [
      execution.registration
        ? 'Se creará el animal y su registro de alta.'
        : 'Se guardará el movimiento y se actualizarán los animales relacionados.',
      ...labels,
    ],
  }
}
function view(proposal: StoredProposal): AiProposalView {
  const { userId: _u, flowVersion: _v, timeZone: _t, fingerprint: _f, ...result } = proposal
  return (result.status === 'ready' || result.status === 'conflict') &&
    Date.parse(result.expiresAt) < Date.now()
    ? { ...result, status: 'expired' }
    : result
}
function checkStored(proposal: StoredProposal | undefined, scope: Scope) {
  if (!proposal || proposal.userId !== scope.userId || proposal.farmId !== scope.farmId)
    throw new AiProposalError('Propuesta no encontrada.', 404)
  if (proposal.flowVersion !== OPERATION_VERSION)
    throw new AiProposalError(
      'Esta propuesta corresponde a un flujo anterior. Prepara una nueva.',
      409,
    )
  checkPermissions(scope, proposal.action)
}
export async function createAiProposal(
  params: Scope & { action: unknown; conversationId: string; timeZone?: string },
): Promise<AiProposalView> {
  if (!params.conversationId?.trim() || params.conversationId.length > 200)
    throw new AiProposalError('Conversación requerida.')
  const action = operationActionSchema.parse(params.action)
  const db = getAdminFirestore(),
    ref = db.collection(COLLECTION).doc()
  const state = await readState(
    db,
    params.farmId,
    undefined,
    readsBreeding(action) && hasPermission(params.permissions, 'breeding', 'read'),
  )
  const timeZone = params.timeZone || 'UTC'
  const execution = await planOperation(params, action, state, ref.id, timeZone)
  const proposal: StoredProposal = {
    id: ref.id,
    farmId: params.farmId,
    userId: params.userId,
    conversationId: params.conversationId,
    revision: 1,
    status: 'ready',
    flowVersion: OPERATION_VERSION,
    timeZone,
    fingerprint: state.fingerprint,
    action,
    ...describe(action, execution, state),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  }
  await ref.set(clean(proposal))
  return view(proposal)
}
export const prepareAiProposal = createAiProposal
export async function getAiProposal(params: Scope & { proposalId: string }) {
  const snapshot = await getAdminFirestore().collection(COLLECTION).doc(params.proposalId).get()
  const proposal = snapshot.data() as StoredProposal | undefined
  checkStored(proposal, params)
  return view(proposal!)
}
export async function reviseAiProposal(
  params: Scope & { proposalId: string; revision: number; action: unknown },
) {
  const action = operationActionSchema.parse(params.action),
    db = getAdminFirestore(),
    ref = db.collection(COLLECTION).doc(params.proposalId)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref),
      proposal = snap.data() as StoredProposal | undefined
    checkStored(proposal, params)
    if (
      proposal!.revision !== params.revision ||
      !['ready', 'conflict'].includes(view(proposal!).status)
    )
      throw new AiProposalError('La propuesta cambió o venció. Vuelve a abrirla.', 409)
    if (action.type !== proposal!.action.type)
      throw new AiProposalError('No se puede cambiar el tipo de movimiento al editarlo.')
    const state = await readState(
      db,
      params.farmId,
      tx,
      readsBreeding(action) && hasPermission(params.permissions, 'breeding', 'read'),
    )
    const execution = await planOperation(params, action, state, ref.id, proposal!.timeZone)
    const revised = {
      ...proposal!,
      status: 'ready' as const,
      action,
      ...describe(action, execution, state),
      fingerprint: state.fingerprint,
      revision: proposal!.revision + 1,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }
    tx.set(ref, clean(revised))
    return view(revised)
  })
}
export async function cancelAiProposal(params: Scope & { proposalId: string; revision: number }) {
  const db = getAdminFirestore(),
    ref = db.collection(COLLECTION).doc(params.proposalId)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref),
      proposal = snap.data() as StoredProposal | undefined
    checkStored(proposal, params)
    if (proposal!.status === 'succeeded') return view(proposal!)
    if (proposal!.revision !== params.revision)
      throw new AiProposalError('La propuesta cambió. Vuelve a abrirla.', 409)
    const cancelled = { ...proposal!, status: 'cancelled' as const }
    tx.set(ref, clean(cancelled))
    return view(cancelled)
  })
}
export async function confirmAiProposal(
  params: Scope & { proposalId: string; revision: number },
): Promise<AiProposalView> {
  const db = getAdminFirestore(),
    ref = db.collection(COLLECTION).doc(params.proposalId)
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref),
      proposal = snap.data() as StoredProposal | undefined
    checkStored(proposal, params)
    if (proposal!.status === 'succeeded') return view(proposal!)
    if (proposal!.revision !== params.revision || view(proposal!).status !== 'ready')
      throw new AiProposalError(
        'La propuesta cambió, fue cancelada o venció. Prepara una nueva.',
        409,
      )
    const state = await readState(
      db,
      params.farmId,
      tx,
      readsBreeding(proposal!.action) && hasPermission(params.permissions, 'breeding', 'read'),
    )
    if (state.fingerprint !== proposal!.fingerprint) {
      tx.update(ref, { status: 'conflict' })
      return { conflict: true as const }
    }
    const execution = await planOperation(
      params,
      proposal!.action,
      state,
      ref.id,
      proposal!.timeZone,
    )
    const now = new Date(),
      receiptRef = db.collection('recordMovements').doc(ref.id)
    const receiptSnap = await tx.get(receiptRef)
    if (receiptSnap.exists)
      throw new AiProposalError('Este movimiento ya existe. Revisa sus registros.', 409)
    // Read every target and identity reservation before any transaction write.
    const created = execution.plan?.changes.filter((change) => change.create) ?? []
    const reservations = execution.registration
      ? [{ path: `animals/${ref.id}`, data: execution.registration }]
      : created.filter((change) => change.path.startsWith('animals/'))
    for (const change of reservations) {
      const reservation = db
        .collection('animalNumberReservations')
        .doc(animalNumberReservationKey(params.farmId, change.data.animalNumber))
      const existing = await tx.get(reservation)
      if (
        existing.exists &&
        state.animals.some(
          (animal) =>
            animal.id === existing.data()?.animalId &&
            normalizeAnimalSearch(animal.animalNumber) ===
              normalizeAnimalSearch(change.data.animalNumber),
        )
      )
        throw new AiProposalError('El ID del animal ya fue utilizado. Edita la propuesta.', 409)
    }
    const targetReads = await Promise.all(created.map((change) => tx.get(db.doc(change.path))))
    for (let i = 0; i < created.length; i++) {
      if (targetReads[i].exists)
        throw new AiProposalError('Un documento del movimiento ya existe.', 409)
      state.raw.set(created[i].path, null)
    }
    let record: AnimalRecord
    if (execution.registration) {
      tx.create(db.collection('animals').doc(ref.id), clean(execution.registration))
      record = execution.registration.records.find((record) => record.id === ref.id)!
    } else if (execution.central) {
      record = clean({
        ...execution.central,
        id: ref.id,
        createdAt: now,
        createdBy: params.userId,
        movementFarmId: params.farmId,
        appliedToAnimals: execution.ids,
        isBulkApplication: execution.ids.length > 1,
      })
      const { appliedToAnimals: _ids, ...stored } = record
      tx.create(
        db.collection('animalRecords').doc(ref.id),
        clean({ ...stored, farmId: params.farmId, animals: execution.ids }),
      )
    } else {
      const plan = execution.plan!
      if (new Set(plan.changes.map((c) => c.path)).size !== plan.changes.length)
        throw new AiProposalError('El movimiento contiene cambios duplicados.')
      const changes = plan.changes.map((change) => ({
        ...change,
        data: clean({ ...change.data, lastMovementId: ref.id, updatedAt: now }),
      }))
      const journal = changes.map((change) => {
        if (!state.raw.has(change.path))
          throw new AiProposalError('Falta leer un documento relacionado.')
        const previous = state.raw.get(change.path)
        if (change.create ? previous !== null : !previous)
          throw new AiProposalError('Un documento relacionado cambió.', 409)
        if (previous && previous.farmId !== params.farmId)
          throw new AiProposalError('Movimiento fuera de la granja.', 403)
        return {
          path: change.path,
          before: change.create
            ? null
            : Object.fromEntries(
                Object.keys(change.data).map((key) => [key, previous?.[key] ?? null]),
              ),
          after: change.data,
        }
      })
      record = clean({
        ...plan.record,
        id: ref.id,
        createdAt: now,
        createdBy: params.userId,
        movementFarmId: params.farmId,
        appliedToAnimals: execution.ids,
        isBulkApplication: execution.ids.length > 1,
        undoData: { action: plan.record.eventType, documents: journal },
      })
      const writes = new Map(changes.map((change) => [change.path, { ...change.data }]))
      for (const animalId of execution.ids) {
        const path = `animals/${animalId}`
        writes.set(path, {
          ...writes.get(path),
          records: [...(state.raw.get(path)?.records ?? []), record],
          updatedAt: now,
        })
      }
      if (writes.size > 400)
        throw new AiProposalError('Selecciona menos animales para este movimiento.')
      for (const [path, data] of writes)
        state.raw.get(path) === null
          ? tx.create(db.doc(path), clean(data))
          : tx.update(db.doc(path), clean(data))
    }
    for (const change of reservations)
      tx.set(
        db
          .collection('animalNumberReservations')
          .doc(animalNumberReservationKey(params.farmId, change.data.animalNumber)),
        {
          farmId: params.farmId,
          animalId: change.path.split('/')[1],
          animalNumber: change.data.animalNumber,
        },
      )
    tx.create(
      receiptRef,
      clean({
        farmId: params.farmId,
        farmerId: params.userId,
        ...(execution.central ? { storage: 'animalRecords' } : {}),
        record,
      }),
    )
    const receipt: AiActionReceipt = {
      commandId: ref.id,
      recordId: record.id,
      message: `${proposal!.title}: guardado.`,
      href: '/?dashboard-main=registros',
      completedAt: now.toISOString(),
    }
    const confirmed = { ...proposal!, status: 'succeeded' as const, receipt }
    tx.set(ref, clean(confirmed))
    return view(confirmed)
  })
  if ('conflict' in result)
    throw new AiProposalError(
      'Los datos de la granja cambiaron. Edita y revisa la propuesta antes de confirmar.',
      409,
    )
  return result
}
