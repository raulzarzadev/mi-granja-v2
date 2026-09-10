import { type DocumentData, doc, runTransaction, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { AnimalRecord } from '@/types/animals'

export type MovementChange = {
  path: string
  data: DocumentData
  create?: boolean
  delete?: boolean
}
export type MovementPlan = {
  changes: MovementChange[]
  record: Omit<AnimalRecord, 'id' | 'createdAt' | 'createdBy'>
}
export type MovementContext = { userId: string; farmId: string }

export const createMovementId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `movement-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const movementEqual = (a: unknown, b: unknown): boolean => {
  const normalize = (value: unknown): unknown => {
    if (value instanceof Date) return value.getTime()
    if (value instanceof Timestamp) return value.toMillis()
    if (Array.isArray(value)) return value.map(normalize)
    if (value && typeof value === 'object') {
      const o = value as Record<string, unknown>
      if (typeof o.seconds === 'number') {
        const nanoseconds = typeof o.nanoseconds === 'number' ? o.nanoseconds : 0
        return o.seconds * 1000 + Math.floor(nanoseconds / 1_000_000)
      }
      return Object.fromEntries(
        Object.keys(o)
          .filter((k) => o[k] !== undefined && o[k] !== null)
          .sort()
          .map((k) => [k, normalize(o[k])]),
      )
    }
    return value ?? null
  }
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b))
}
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

// Sanidad masiva es un evento compartido: se guarda una sola vez y sólo
// conserva los IDs afectados. No necesita leer ni reescribir cada animal.
export async function commitCentralRecord(
  context: MovementContext,
  id: string,
  animalIds: string[],
  input: Omit<AnimalRecord, 'id' | 'createdAt' | 'createdBy'>,
): Promise<AnimalRecord> {
  if (!context.userId || !context.farmId || !id || !animalIds.length)
    throw new Error('Selecciona una granja y animales válidos.')

  const ids = [...new Set(animalIds)]
  return runTransaction(db, async (tx) => {
    const receiptRef = doc(db, 'recordMovements', id)
    const receipt = await tx.get(receiptRef)
    if (receipt.exists()) {
      const previous = receipt.data()!
      if (previous.farmId !== context.farmId)
        throw new Error('El movimiento pertenece a otra granja.')
      if (previous.record.undoneAt)
        throw new Error('Este movimiento ya fue deshecho. Inicia un registro nuevo.')
      return previous.record as AnimalRecord
    }

    const now = new Date()
    const record = clean({
      ...input,
      id,
      createdAt: now,
      createdBy: context.userId,
      movementFarmId: context.farmId,
      appliedToAnimals: ids,
      isBulkApplication: ids.length > 1,
    }) as AnimalRecord
    const { appliedToAnimals: _appliedToAnimals, ...storedRecord } = record

    tx.set(receiptRef, {
      farmId: context.farmId,
      farmerId: context.userId,
      storage: 'animalRecords',
      record,
    })
    tx.set(doc(db, 'animalRecords', id), {
      ...storedRecord,
      farmId: context.farmId,
      animals: ids,
    })
    return record
  })
}

// All reads precede all writes. A stable record ID is the idempotency receipt.
export async function commitMovement(
  context: MovementContext,
  id: string,
  animalIds: string[],
  readPaths: string[],
  build: (documents: Map<string, DocumentData | null>) => MovementPlan,
): Promise<AnimalRecord> {
  if (!context.userId || !context.farmId || !id || !animalIds.length)
    throw new Error('Selecciona una granja y animales válidos.')
  const ids = [...new Set(animalIds)]
  const paths = [...new Set([...ids.map((id) => `animals/${id}`), ...readPaths])]
  return runTransaction(db, async (tx) => {
    const receiptRef = doc(db, 'recordMovements', id)
    const receipt = await tx.get(receiptRef)
    if (receipt.exists()) {
      const previous = receipt.data()!
      if (previous.farmId !== context.farmId)
        throw new Error('El movimiento pertenece a otra granja.')
      if (previous.record.undoneAt)
        throw new Error('Este movimiento ya fue deshecho. Inicia un registro nuevo.')
      return previous.record as AnimalRecord
    }
    const snapshots = await Promise.all(paths.map((path) => tx.get(doc(db, path))))
    const docs = new Map(
      paths.map((path, i) => [path, snapshots[i].exists() ? snapshots[i].data()! : null]),
    )
    for (const animalId of ids) {
      const animal = docs.get(`animals/${animalId}`)
      if (!animal || animal.farmId !== context.farmId)
        throw new Error('Un animal no pertenece a la granja o ya no existe.')
    }
    const existing = (docs.get(`animals/${ids[0]}`)?.records ?? []).find(
      (r: AnimalRecord) => r.id === id,
    )
    if (existing) {
      if (existing.undoneAt)
        throw new Error('Este movimiento ya fue deshecho. Inicia un registro nuevo.')
      return existing as AnimalRecord
    }
    const plan = build(docs)
    const now = new Date()
    const changes = plan.changes.map((change) => ({
      ...change,
      data: clean({ ...change.data, lastMovementId: id, updatedAt: now }),
    }))
    if (new Set(changes.map((c) => c.path)).size !== changes.length)
      throw new Error('Movimiento con cambios duplicados.')
    const journal = changes.map((change) => {
      if (!docs.has(change.path)) throw new Error('Falta leer un documento del movimiento.')
      const previous = docs.get(change.path)
      if (change.create ? previous !== null : !previous)
        throw new Error('El movimiento cambió; vuelve a cargarlo.')
      if (previous && previous.farmId !== context.farmId)
        throw new Error('Movimiento fuera de la granja.')
      if (change.create) return { path: change.path, before: null, after: change.data }
      if (change.delete) return { path: change.path, before: previous!, after: {}, deleted: true }
      return {
        path: change.path,
        before: Object.fromEntries(Object.keys(change.data).map((k) => [k, previous?.[k] ?? null])),
        after: change.data,
      }
    })
    const record = clean({
      ...plan.record,
      id,
      createdAt: now,
      createdBy: context.userId,
      movementFarmId: context.farmId,
      appliedToAnimals: ids,
      isBulkApplication: ids.length > 1,
      undoData: { action: plan.record.eventType, documents: journal },
    }) as AnimalRecord
    const writes = new Map(changes.map((c) => [c.path, { ...c.data }]))
    for (const animalId of ids) {
      const path = `animals/${animalId}`
      writes.set(path, {
        ...writes.get(path),
        records: [...(docs.get(path)?.records ?? []), record],
        updatedAt: now,
      })
    }
    if (writes.size > 450) throw new Error('Selecciona menos animales para este movimiento.')
    tx.set(receiptRef, { farmId: context.farmId, farmerId: context.userId, record })
    for (const [path, data] of writes) {
      if (changes.find((change) => change.path === path)?.delete) tx.delete(doc(db, path))
      else if (docs.get(path) === null) tx.set(doc(db, path), data)
      else tx.update(doc(db, path), data)
    }
    return record
  })
}

export async function undoMovement(context: MovementContext, input: AnimalRecord): Promise<void> {
  const ids = input.appliedToAnimals ?? []
  if (!ids.length || !context.userId || !context.farmId)
    throw new Error('Este registro no contiene datos suficientes para deshacer.')
  await runTransaction(db, async (tx) => {
    const receiptRef = doc(db, 'recordMovements', input.id)
    const receipt = await tx.get(receiptRef)
    if (receipt.exists() && receipt.data()?.farmId !== context.farmId)
      throw new Error('El movimiento pertenece a otra granja.')

    if (receipt.exists() && receipt.data()?.storage === 'animalRecords') {
      const centralRef = doc(db, 'animalRecords', input.id)
      const central = await tx.get(centralRef)
      const record = (central.exists() ? central.data() : receipt.data()?.record) as AnimalRecord
      if (!record) throw new Error('Registro central no encontrado.')
      if (record.undoneAt) return

      const now = new Date()
      tx.update(centralRef, { undoneAt: now, undoneBy: context.userId, updatedAt: now })
      tx.update(receiptRef, {
        record: { ...record, undoneAt: now, undoneBy: context.userId },
      })
      return
    }

    const anchor = await tx.get(doc(db, 'animals', ids[0]))
    if (anchor.data()?.farmId !== context.farmId)
      throw new Error('El movimiento no pertenece a esta granja.')
    const record = (anchor.data()?.records ?? []).find((r: AnimalRecord) => r.id === input.id) as
      | AnimalRecord
      | undefined
    if (!record) throw new Error('Movimiento no encontrado.')
    if (record.undoneAt) return
    let journal = record.undoData?.documents
    if (
      !journal?.length &&
      record.eventType === 'muerte' &&
      record.undoData?.previousAnimalStates?.length
    ) {
      const legacyIds = record.appliedToAnimals ?? ids
      const legacySnapshots = await Promise.all(
        legacyIds.map((id) => tx.get(doc(db, 'animals', id))),
      )
      journal = legacyIds.map((id, index) => {
        const animal = legacySnapshots[index].data()
        const before = record.undoData!.previousAnimalStates!.find((state) => state.id === id)
        if (
          !before ||
          animal?.farmId !== context.farmId ||
          animal?.status !== 'muerto' ||
          !movementEqual(animal?.deathInfo?.date, record.date)
        ) {
          throw new Error('El estado de este animal ya cambió o falta su estado anterior.')
        }
        const fields = ['status', 'statusAt', 'statusNotes', 'deathInfo', 'soldInfo', 'lostInfo']
        return {
          path: `animals/${id}`,
          before: Object.fromEntries(
            fields.map((key) => [
              key,
              (before as Record<string, unknown>)[key] ?? (key === 'status' ? 'activo' : null),
            ]),
          ),
          after: Object.fromEntries(fields.map((key) => [key, animal[key] ?? null])),
        }
      })
    }
    if (!journal?.length) throw new Error('Este registro antiguo no tiene una reversión segura.')
    const targets = record.appliedToAnimals ?? ids
    const paths = [
      ...new Set([...journal.map((d) => d.path), ...targets.map((id) => `animals/${id}`)]),
    ]
    if (paths.some((path) => !/^(animals|sales|breedingRecords)\/[^/]+$/.test(path)))
      throw new Error('Datos de reversión inválidos.')
    const snapshots = await Promise.all(paths.map((path) => tx.get(doc(db, path))))
    const docs = new Map(paths.map((path, i) => [path, snapshots[i].data()]))
    for (const path of paths) {
      if (journal.some((item) => item.path === path && item.deleted)) {
        const deleted = journal.find((item) => item.path === path && item.deleted)!
        if (deleted.before?.farmId !== context.farmId)
          throw new Error('El documento no pertenece a esta granja.')
        if (docs.get(path)) throw new Error('El documento eliminado fue creado nuevamente.')
        continue
      }
      if (docs.get(path)?.farmId !== context.farmId)
        throw new Error('Un documento del movimiento cambió o ya no existe.')
    }
    for (const item of journal) {
      if (item.deleted) continue
      const current = docs.get(item.path)!
      // lastMovementId protects the order while allowing earlier undo after a later undo.
      const matches =
        item.before === null
          ? movementEqual(current, item.after)
          : Object.entries(item.after).every(
              ([key, value]) => key === 'updatedAt' || movementEqual(current[key], value),
            )
      if (!matches)
        throw new Error(
          'Hay cambios posteriores en los animales o en el movimiento. Deshaz primero esos cambios.',
        )
    }
    const now = new Date()
    const writes = new Map<string, DocumentData>()
    for (const item of journal) {
      if (item.before === null) continue
      writes.set(item.path, { ...item.before, updatedAt: now })
    }
    for (const id of targets) {
      const path = `animals/${id}`
      writes.set(path, {
        ...writes.get(path),
        updatedAt: now,
        records: (docs.get(path)?.records ?? []).map((r: AnimalRecord) =>
          r.id === record.id ? { ...r, undoneAt: now, undoneBy: context.userId } : r,
        ),
      })
    }
    for (const item of journal) if (item.before === null) tx.delete(doc(db, item.path))
    if (receipt.exists())
      tx.update(receiptRef, { record: { ...record, undoneAt: now, undoneBy: context.userId } })
    for (const [path, data] of writes) {
      if (journal.some((item) => item.path === path && item.deleted)) tx.set(doc(db, path), data)
      else tx.update(doc(db, path), data)
    }
  })
}
