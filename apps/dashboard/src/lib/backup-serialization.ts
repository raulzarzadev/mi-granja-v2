import {
  animal_statuses,
  animals_genders,
  animals_stages,
  animals_types,
} from '@mi-granja/shared/types/animals'
import { Timestamp } from 'firebase/firestore'

export const CURRENT_BACKUP_VERSION = 2

const KNOWN_DATE_FIELD_NAMES = new Set([
  'createdAt',
  'updatedAt',
  'birthDate',
  'statusAt',
  'weanedAt',
  'date',
  'resolvedDate',
  'nextDueDate',
  'breedingDate',
  'pregnancyConfirmedDate',
  'expectedBirthDate',
  'actualBirthDate',
  'pregnantAt',
  'birthedAt',
  'weanedMotherAt',
  'driedAt',
  'availableToSaleAt',
  'currentAreaAssignedAt',
  'timestamp',
  'dueDate',
  'expiresAt',
  'invitedAt',
  'acceptedAt',
  'rejectedAt',
  'originalTimestamp',
  'lostAt',
  'foundAt',
  'notifiedAt',
  'lastOverdueNotifiedAt',
  'deletedAt',
  'scheduledDeletionAt',
])

export interface BackupCounts {
  animals: number
  animalRecords: number
  breedingRecords: number
  reminders: number
  farmInvitations: number
  sales: number
}

export interface BackupMeta {
  version: typeof CURRENT_BACKUP_VERSION
  exportDate: string
  farmId: string
  farmName: string
  exportedBy: string
  counts: BackupCounts
}

export interface BackupFile {
  _meta: BackupMeta
  _types?: Record<string, unknown>
  farm: Record<string, unknown>
  animals: Record<string, unknown>[]
  breedingRecords: Record<string, unknown>[]
  reminders: Record<string, unknown>[]
  farmInvitations: Record<string, unknown>[]
  sales: Record<string, unknown>[]
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  preview: BackupMeta | null
  data: BackupFile | null
}

export const DATE_FIELDS_BY_COLLECTION: Record<string, string[]> = {
  animals: [...KNOWN_DATE_FIELD_NAMES],
  breedingRecords: [...KNOWN_DATE_FIELD_NAMES],
  reminders: [...KNOWN_DATE_FIELD_NAMES],
  farmInvitations: [...KNOWN_DATE_FIELD_NAMES],
  sales: [...KNOWN_DATE_FIELD_NAMES],
  farm: [...KNOWN_DATE_FIELD_NAMES],
}

export const BACKUP_TYPE_DESCRIPTIONS: Record<string, unknown> = {
  version: CURRENT_BACKUP_VERSION,
  unitConvention: {
    weight: 'Todos los pesos se almacenan en gramos.',
    money: 'Los importes monetarios se almacenan en centavos.',
    dates: 'Las fechas se exportan como ISO 8601.',
  },
  farm: {
    fields:
      'id, name, description?, photoURL?, ownerId, location?, productionProfile?, areas?, createdAt, updatedAt',
    restoreProtection:
      'ownerId, colaboradores, estados de eliminación e historiales de respaldo no sobrescriben la granja destino.',
  },
  animal: {
    required: 'id, animalNumber, type, stage, gender, createdAt, updatedAt',
    references:
      'motherId, fatherId, pregnantBy y records[].appliedToAnimals contienen IDs internos de animales.',
    records:
      "Historial único en records[]. Un pesaje usa type='weight' y weightGrams. Un ordeño usa type='milk', amountMl y session.",
    weightSummary:
      'animal.weight es un resumen en gramos del pesaje más reciente; records[] es la fuente de verdad.',
    discharge:
      'Una muerte puede incluir deathInfo { reason, date, description }; una venta usa soldInfo y una entrada en sales.',
  },
  breedingRecord: {
    references:
      'maleId, femaleBreedingInfo[].femaleId y offspring[] contienen IDs internos de animales.',
  },
  reminder: { scope: 'Pertenece a farmId; farmerId se reasigna al usuario que restaura.' },
  farmInvitation: {
    scope: 'Sólo se respaldan invitaciones pendientes y vigentes.',
  },
  sale: { references: 'sales[].animals[].animalId contiene un ID interno de animal.' },
  restore: {
    idRemapping:
      'Se regeneran IDs de animales y empadres y se actualizan todas sus referencias internas.',
    legacy:
      'Los respaldos v1 se convierten en memoria: weightRecords pasa a records[] type=weight.',
  },
}

export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(stripUndefined) as unknown as T
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== undefined) result[key] = stripUndefined(value)
    }
    return result as T
  }
  return obj
}

export function serializeForBackup<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(serializeForBackup) as unknown as T
  try {
    if (typeof Timestamp !== 'undefined' && obj instanceof Timestamp) {
      return obj.toDate().toISOString() as unknown as T
    }
  } catch {
    // Timestamp no está disponible en algunas pruebas unitarias.
  }
  if (obj instanceof Date) return obj.toISOString() as unknown as T
  if (
    typeof obj === 'object' &&
    'toDate' in obj &&
    typeof (obj as { toDate: unknown }).toDate === 'function'
  ) {
    return (obj as { toDate: () => Date }).toDate().toISOString() as unknown as T
  }
  if (
    typeof obj === 'object' &&
    'seconds' in obj &&
    typeof (obj as { seconds: unknown }).seconds === 'number'
  ) {
    return new Date((obj as { seconds: number }).seconds * 1000).toISOString() as unknown as T
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = serializeForBackup(value)
    }
    return result as T
  }
  return obj
}

export function deserializeFromBackup(
  _collectionName: string,
  docData: Record<string, unknown>,
): Record<string, unknown> {
  return deserializeRecursive(docData) as Record<string, unknown>
}

function remapReference(value: unknown, idMap: Map<string, string>): unknown {
  if (value === null || value === undefined || value === '') return value
  if (typeof value !== 'string') return undefined
  return idMap.get(value)
}

export function prepareAnimalForRestore(
  rawAnimal: Record<string, unknown>,
  animalIdMap: Map<string, string>,
  breedingIdMap: Map<string, string>,
  areaIdMap: Map<string, string>,
  farmId: string,
  farmerId: string,
): Record<string, unknown> {
  const animal = { ...rawAnimal }
  delete animal.id
  delete animal.computedStage
  delete animal.weightRecords
  animal.farmId = farmId
  animal.farmerId = farmerId
  animal.motherId = remapReference(animal.motherId, animalIdMap)
  animal.fatherId = remapReference(animal.fatherId, animalIdMap)
  animal.pregnantBy = remapReference(animal.pregnantBy, animalIdMap)
  animal.pregnantBreedingRecordId = remapReference(animal.pregnantBreedingRecordId, breedingIdMap)
  animal.currentAreaId = remapReference(animal.currentAreaId, areaIdMap)
  if (Array.isArray(animal.records)) {
    animal.records = animal.records.map((rawRecord) => {
      if (!rawRecord || typeof rawRecord !== 'object') return rawRecord
      const record = { ...(rawRecord as Record<string, unknown>) }
      if (Array.isArray(record.appliedToAnimals)) {
        record.appliedToAnimals = record.appliedToAnimals
          .map((id) => remapReference(id, animalIdMap))
          .filter((id): id is string => typeof id === 'string')
      }
      return record
    })
  }
  return animal
}

export function prepareBreedingForRestore(
  rawBreeding: Record<string, unknown>,
  animalIdMap: Map<string, string>,
  farmId: string,
  farmerId: string,
): Record<string, unknown> {
  const breeding = { ...rawBreeding }
  delete breeding.id
  breeding.farmId = farmId
  breeding.farmerId = farmerId
  breeding.maleId = remapReference(breeding.maleId, animalIdMap)
  if (Array.isArray(breeding.femaleBreedingInfo)) {
    breeding.femaleBreedingInfo = breeding.femaleBreedingInfo.map((rawInfo) => {
      const info = { ...(rawInfo as Record<string, unknown>) }
      info.femaleId = remapReference(info.femaleId, animalIdMap)
      if (Array.isArray(info.offspring)) {
        info.offspring = info.offspring
          .map((id) => remapReference(id, animalIdMap))
          .filter((id): id is string => typeof id === 'string')
      }
      return info
    })
  }
  return breeding
}

function deserializeRecursive(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(deserializeRecursive)
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] =
        typeof value === 'string' && KNOWN_DATE_FIELD_NAMES.has(key) && isISODate(value)
          ? Timestamp.fromDate(new Date(value))
          : deserializeRecursive(value)
    }
    return result
  }
  return obj
}

function isISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) && !Number.isNaN(Date.parse(value))
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {}
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item) => item && typeof item === 'object').map(asObject)
    : []
}

function dateMillis(value: unknown): number | null {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string' || typeof value === 'number') {
    const millis = new Date(value).getTime()
    return Number.isNaN(millis) ? null : millis
  }
  if (value && typeof value === 'object') {
    const timestamp = value as { seconds?: number; _seconds?: number }
    const seconds = timestamp.seconds ?? timestamp._seconds
    if (typeof seconds === 'number') return seconds * 1000
  }
  return null
}

function legacyWeightToRecord(
  entry: Record<string, unknown>,
  createdBy: string,
  fallbackDate: unknown,
): Record<string, unknown> | null {
  const rawWeight = entry.weightGrams ?? entry.weight
  const weightGrams = typeof rawWeight === 'string' ? Number(rawWeight) : rawWeight
  if (typeof weightGrams !== 'number' || !Number.isFinite(weightGrams) || weightGrams <= 0) {
    return null
  }
  const date = entry.date ?? fallbackDate ?? new Date().toISOString()
  const millis = dateMillis(date) ?? Date.now()
  return {
    id: typeof entry.id === 'string' ? entry.id : `legacy-weight-${millis}-${weightGrams}`,
    type: 'weight',
    category: 'general',
    title: `${(weightGrams / 1000).toFixed(1)} kg`,
    weightGrams,
    date,
    ...(typeof entry.notes === 'string' && entry.notes ? { notes: entry.notes } : {}),
    createdAt: entry.createdAt ?? date,
    createdBy: typeof entry.createdBy === 'string' ? entry.createdBy : createdBy,
  }
}

function parseWeightFromTitle(title: unknown): number | null {
  if (typeof title !== 'string') return null
  const match = title.match(/^([\d.]+)\s*(kg|lb)?/i)
  if (!match) return null
  const value = Number(match[1])
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * (match[2]?.toLowerCase() === 'lb' ? 453.592 : 1000))
}

/** Convierte respaldos v1 y documentos animales antiguos al modelo unificado v2. */
export function normalizeBackupFile(data: unknown): BackupFile {
  const source = asObject(data)
  const sourceMeta = asObject(source._meta)
  const exportedBy = typeof sourceMeta.exportedBy === 'string' ? sourceMeta.exportedBy : ''
  const animals = asArray(source.animals)
  const animalsByNumber = new Map<string, Record<string, unknown>>()
  for (const animal of animals) {
    if (typeof animal.animalNumber === 'string') animalsByNumber.set(animal.animalNumber, animal)
  }

  // La colección global v1 se acepta sólo para convertir entradas cuyo arete
  // existe en los animales incluidos. Nunca se restaura como colección propia.
  for (const legacy of asArray(source.weightRecords)) {
    const animal =
      typeof legacy.animalNumber === 'string' ? animalsByNumber.get(legacy.animalNumber) : undefined
    if (!animal) continue
    const legacyEntries = asArray(animal.weightRecords)
    legacyEntries.push(legacy)
    animal.weightRecords = legacyEntries
  }

  const normalizedAnimals = animals.map((animal) => {
    const records = asArray(animal.records)
    const legacyEntries = asArray(animal.weightRecords)
    const existingWeightKeys = new Set<string>()

    const normalizedRecords = records.map((record) => {
      if (record.type !== 'weight') return record
      const weightGrams =
        typeof record.weightGrams === 'number'
          ? record.weightGrams
          : parseWeightFromTitle(record.title)
      const normalized = weightGrams ? { ...record, weightGrams } : record
      existingWeightKeys.add(`${dateMillis(record.date)}:${weightGrams ?? ''}`)
      return normalized
    })

    for (const entry of legacyEntries) {
      const record = legacyWeightToRecord(entry, exportedBy, animal.updatedAt ?? animal.createdAt)
      if (!record) continue
      const key = `${dateMillis(record.date)}:${record.weightGrams}`
      if (!existingWeightKeys.has(key)) {
        normalizedRecords.push(record)
        existingWeightKeys.add(key)
      }
    }

    const summarizedWeight =
      typeof animal.weight === 'string' ? Number(animal.weight) : animal.weight
    if (
      normalizedRecords.every((record) => record.type !== 'weight') &&
      typeof summarizedWeight === 'number' &&
      Number.isFinite(summarizedWeight) &&
      summarizedWeight > 0
    ) {
      const synthetic = legacyWeightToRecord(
        { weight: summarizedWeight },
        exportedBy,
        animal.updatedAt ?? animal.createdAt,
      )
      if (synthetic) normalizedRecords.push(synthetic)
    }

    const { weightRecords: _legacyWeightRecords, ...currentAnimal } = animal
    return { ...currentAnimal, records: normalizedRecords }
  })

  const counts: BackupCounts = {
    animals: normalizedAnimals.length,
    animalRecords: normalizedAnimals.reduce(
      (total, animal) => total + asArray(animal.records).length,
      0,
    ),
    breedingRecords: asArray(source.breedingRecords).length,
    reminders: asArray(source.reminders).length,
    farmInvitations: asArray(source.farmInvitations).filter(
      (invitation) => !invitation.status || invitation.status === 'pending',
    ).length,
    sales: asArray(source.sales).length,
  }

  return {
    _meta: {
      version: CURRENT_BACKUP_VERSION,
      exportDate:
        typeof sourceMeta.exportDate === 'string'
          ? sourceMeta.exportDate
          : new Date().toISOString(),
      farmId: typeof sourceMeta.farmId === 'string' ? sourceMeta.farmId : '',
      farmName: typeof sourceMeta.farmName === 'string' ? sourceMeta.farmName : '',
      exportedBy,
      counts,
    },
    ...(source._types && typeof source._types === 'object'
      ? { _types: asObject(source._types) }
      : {}),
    farm: asObject(source.farm),
    animals: normalizedAnimals,
    breedingRecords: asArray(source.breedingRecords),
    reminders: asArray(source.reminders),
    farmInvitations: asArray(source.farmInvitations).filter(
      (invitation) => !invitation.status || invitation.status === 'pending',
    ),
    sales: asArray(source.sales),
  }
}

const REQUIRED_COLLECTIONS = [
  'animals',
  'breedingRecords',
  'reminders',
  'farmInvitations',
  'sales',
] as const

export function validateBackupFile(data: unknown, currentFarmId: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      errors: ['El archivo no contiene un objeto JSON válido'],
      warnings,
      preview: null,
      data: null,
    }
  }
  const source = data as Record<string, unknown>
  const rawMeta = asObject(source._meta)
  const version = rawMeta.version
  if (version !== 1 && version !== CURRENT_BACKUP_VERSION) {
    errors.push(`Versión de respaldo no soportada: ${String(version)}`)
  }
  if (version === 1) {
    warnings.push('El respaldo v1 se convertirá al modelo actual de registros unificados.')
  }
  if (!source.farm || typeof source.farm !== 'object' || Array.isArray(source.farm)) {
    errors.push('El respaldo no contiene datos válidos de la granja')
  }
  for (const collectionName of REQUIRED_COLLECTIONS) {
    if (!(collectionName in source)) {
      warnings.push(`Colección "${collectionName}" no encontrada; se importará vacía.`)
    } else if (!Array.isArray(source[collectionName])) {
      errors.push(`La colección "${collectionName}" no es un arreglo válido`)
    }
  }
  if (errors.length > 0) {
    return { valid: false, errors, warnings, preview: null, data: null }
  }

  const backup = normalizeBackupFile(source)
  if (!backup._meta.farmId) errors.push('El respaldo no tiene un ID de granja válido')
  if (!isISODate(backup._meta.exportDate)) warnings.push('La fecha de exportación no es válida')
  if (backup._meta.farmId && backup._meta.farmId !== currentFarmId) {
    warnings.push(
      `Este respaldo pertenece a ${backup._meta.farmName || backup._meta.farmId}; se importará en la granja actual.`,
    )
  }

  const animalIds = new Set<string>()
  const animalNumbers = new Set<string>()
  const areaIds = new Set<string>()
  asArray(backup.farm.areas).forEach((area, index) => {
    if (typeof area.id !== 'string' || !area.id) {
      errors.push(`Área ${index + 1}: falta id`)
    } else if (areaIds.has(area.id)) {
      errors.push(`Área ${index + 1}: ID duplicado ${area.id}`)
    } else {
      areaIds.add(area.id)
    }
  })
  backup.animals.forEach((animal, index) => {
    const label = `Animal ${index + 1}`
    for (const field of ['id', 'animalNumber', 'type', 'stage', 'gender']) {
      if (typeof animal[field] !== 'string' || !(animal[field] as string).trim()) {
        errors.push(`${label}: falta ${field}`)
      }
    }
    for (const [field, values] of Object.entries({
      type: animals_types,
      stage: animals_stages,
      gender: animals_genders,
      status: animal_statuses,
    })) {
      if (field === 'status' && animal[field] === undefined) continue
      if (!(values as readonly unknown[]).includes(animal[field])) {
        errors.push(`${label}: ${field} inválido; usa ${values.join(', ')}`)
      }
    }
    for (const field of ['createdAt', 'updatedAt']) {
      if (dateMillis(animal[field]) === null) errors.push(`${label}: ${field} inválido`)
    }
    if (typeof animal.id === 'string') {
      if (animalIds.has(animal.id)) errors.push(`${label}: ID duplicado ${animal.id}`)
      animalIds.add(animal.id)
    }
    if (typeof animal.animalNumber === 'string') {
      if (animalNumbers.has(animal.animalNumber)) {
        errors.push(`${label}: número duplicado ${animal.animalNumber}`)
      }
      animalNumbers.add(animal.animalNumber)
    }
    const recordIds = new Set<string>()
    asArray(animal.records).forEach((record, recordIndex) => {
      const recordLabel = `${label}, registro ${recordIndex + 1}`
      if (typeof record.id !== 'string' || !record.id) errors.push(`${recordLabel}: falta id`)
      if (typeof record.id === 'string' && recordIds.has(record.id)) {
        errors.push(`${recordLabel}: ID duplicado ${record.id}`)
      }
      if (typeof record.id === 'string') recordIds.add(record.id)
      if (typeof record.type !== 'string') errors.push(`${recordLabel}: falta type`)
      if (dateMillis(record.date) === null) errors.push(`${recordLabel}: fecha inválida`)
      if (
        record.type === 'weight' &&
        (typeof record.weightGrams !== 'number' || record.weightGrams <= 0)
      ) {
        errors.push(`${recordLabel}: weightGrams debe ser mayor que cero`)
      }
      if (
        record.type === 'milk' &&
        (typeof record.amountMl !== 'number' || record.amountMl <= 0 || !record.session)
      ) {
        errors.push(`${recordLabel}: el ordeño requiere amountMl y session`)
      }
    })
  })

  const checkAnimalReference = (value: unknown, context: string, required = false) => {
    if (typeof value === 'string' && value && !animalIds.has(value) && !animalNumbers.has(value)) {
      const message = `${context}: referencia a animal no incluido (${value})`
      if (required) errors.push(message)
      else warnings.push(`${message}; se omitirá al restaurar`)
    }
  }
  const breedingIds = new Set<string>()
  backup.breedingRecords.forEach((breeding, index) => {
    if (typeof breeding.id !== 'string' || !breeding.id) {
      errors.push(`Empadre ${index + 1}: falta id`)
    } else if (breedingIds.has(breeding.id)) {
      errors.push(`Empadre ${index + 1}: ID duplicado ${breeding.id}`)
    } else {
      breedingIds.add(breeding.id)
    }
    checkAnimalReference(breeding.maleId, `Empadre ${index + 1}.maleId`, true)
    asArray(breeding.femaleBreedingInfo).forEach((info, femaleIndex) => {
      checkAnimalReference(
        info.femaleId,
        `Empadre ${index + 1}.femaleBreedingInfo[${femaleIndex}].femaleId`,
        true,
      )
      if (Array.isArray(info.offspring)) {
        info.offspring.forEach((offspringId) => {
          checkAnimalReference(offspringId, `Empadre ${index + 1}.offspring[]`)
        })
      }
    })
  })
  backup.animals.forEach((animal) => {
    const label = `Animal ${String(animal.animalNumber || animal.id)}`
    checkAnimalReference(animal.motherId, `${label}.motherId`)
    checkAnimalReference(animal.fatherId, `${label}.fatherId`)
    checkAnimalReference(animal.pregnantBy, `${label}.pregnantBy`)
    if (
      typeof animal.pregnantBreedingRecordId === 'string' &&
      animal.pregnantBreedingRecordId &&
      !breedingIds.has(animal.pregnantBreedingRecordId)
    ) {
      warnings.push(
        `${label}.pregnantBreedingRecordId: empadre no incluido; se omitirá al restaurar`,
      )
    }
    if (
      typeof animal.currentAreaId === 'string' &&
      animal.currentAreaId &&
      !areaIds.has(animal.currentAreaId)
    ) {
      warnings.push(`${label}.currentAreaId: área no incluida (${animal.currentAreaId})`)
    }
    asArray(animal.records).forEach((record) => {
      if (Array.isArray(record.appliedToAnimals)) {
        record.appliedToAnimals.forEach((id) => {
          checkAnimalReference(id, `${label}.records[].appliedToAnimals`)
        })
      }
    })
  })
  backup.sales.forEach((sale, saleIndex) => {
    asArray(sale.animals).forEach((animal, animalIndex) => {
      checkAnimalReference(
        animal.animalId,
        `Venta ${saleIndex + 1}.animals[${animalIndex}].animalId`,
        true,
      )
    })
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    preview: errors.length === 0 ? backup._meta : null,
    data: errors.length === 0 ? backup : null,
  }
}
