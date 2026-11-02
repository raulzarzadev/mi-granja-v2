import type { Animal, AnimalRecord } from '@/types/animals'
import { asAiDate } from './context-serialization'

export interface KnowledgeStoredDocument {
  id: string
  data: Record<string, unknown>
}

function normalizedRecord(value: unknown, fallbackId?: string): AnimalRecord | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  const id = typeof data.id === 'string' ? data.id : fallbackId
  const date = asAiDate(data.date)
  if (!id || !date || typeof data.type !== 'string' || typeof data.title !== 'string') return null
  return {
    ...data,
    id,
    date,
    createdAt: asAiDate(data.createdAt) ?? date,
    nextDueDate: asAiDate(data.nextDueDate) ?? undefined,
    undoneAt: asAiDate(data.undoneAt) ?? undefined,
  } as AnimalRecord
}

/** The receipt is authoritative for reversals; central records are not a second event. */
export function mergeKnowledgeAnimalRecords(
  animals: Animal[],
  central: KnowledgeStoredDocument[],
  receipts: KnowledgeStoredDocument[],
  farmId: string,
): Animal[] {
  const records = new Map<string, AnimalRecord>()
  const members = new Map<string, Set<string>>()
  const add = (record: AnimalRecord, ids: unknown) => {
    records.set(record.id, record)
    const set = members.get(record.id) ?? new Set<string>()
    if (Array.isArray(ids)) for (const id of ids) if (typeof id === 'string') set.add(id)
    members.set(record.id, set)
  }
  for (const animal of animals) {
    for (const raw of animal.records ?? []) {
      const record = normalizedRecord(raw)
      if (record) add(record, [animal.id])
    }
  }
  for (const document of central) {
    if (document.data.farmId !== farmId) continue
    const record = normalizedRecord(document.data, document.id)
    if (record) add(record, document.data.animals)
  }
  for (const document of receipts) {
    if (document.data.farmId !== farmId) continue
    const record = normalizedRecord(document.data.record, document.id)
    if (record) add(record, record.appliedToAnimals)
  }
  return animals.map((animal) => {
    const merged = [...records.values()].filter((record) => members.get(record.id)?.has(animal.id))
    const latestWeight = merged
      .filter(
        (record) =>
          !record.undoneAt &&
          record.type === 'weight' &&
          typeof record.weightGrams === 'number' &&
          record.weightGrams > 0,
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0]
    return {
      ...animal,
      records: merged,
      ...(latestWeight ? { weight: latestWeight.weightGrams } : {}),
    }
  })
}
