import { Timestamp } from 'firebase/firestore'

// Campos de fecha conocidos por colección
const DATE_FIELDS_BY_COLLECTION: Record<string, string[]> = {
  animals: [
    'createdAt',
    'updatedAt',
    'birthDate',
    'statusAt',
    'weanedAt',
    // Dentro de records[]
    'date',
    'resolvedDate',
    'nextDueDate',
    // Dentro de soldInfo
    'soldInfo.date',
    // Dentro de lostInfo
    'lostInfo.lostAt',
    'lostInfo.foundAt',
    // Admin action
    'adminAction.originalTimestamp',
  ],
  breedingRecords: [
    'createdAt',
    'updatedAt',
    'breedingDate',
    // Dentro de femaleBreedingInfo[]
    'pregnancyConfirmedDate',
    'expectedBirthDate',
    'actualBirthDate',
    // Dentro de comments[]
    'timestamp',
  ],
  reminders: ['createdAt', 'updatedAt', 'dueDate'],
  weightRecords: ['date'],
  farmInvitations: ['createdAt', 'updatedAt', 'expiresAt'],
  farm: ['createdAt', 'updatedAt'],
}

// Nombres de campos que son fechas en cualquier nivel de profundidad
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
  'timestamp',
  'dueDate',
  'expiresAt',
  'invitedAt',
  'acceptedAt',
  'originalTimestamp',
  'lostAt',
  'foundAt',
])

/**
 * Serializa un objeto para backup, convirtiendo Date y Timestamp a ISO strings
 */
export function serializeForBackup<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeForBackup(item)) as unknown as T
  }

  // Firestore Timestamp
  try {
    if (typeof Timestamp !== 'undefined' && obj instanceof Timestamp) {
      return obj.toDate().toISOString() as unknown as T
    }
  } catch {
    // entornos donde Timestamp no está disponible
  }

  // Duck-typed Timestamp (tiene toDate o toMillis)
  if (
    obj &&
    typeof obj === 'object' &&
    'toDate' in obj &&
    typeof (obj as { toDate: unknown }).toDate === 'function'
  ) {
    return (obj as { toDate: () => Date }).toDate().toISOString() as unknown as T
  }

  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T
  }

  // Millis serializados (número grande que parece timestamp — >2000-01-01)
  if (typeof obj === 'number' && obj > 946684800000 && obj < 32503680000000) {
    return new Date(obj).toISOString() as unknown as T
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

/**
 * Deserializa un documento de backup, convirtiendo ISO strings de campos conocidos
 * de vuelta a Firestore Timestamps
 */
export function deserializeFromBackup(
  collectionName: string,
  docData: Record<string, unknown>,
): Record<string, unknown> {
  return deserializeRecursive(docData, collectionName) as Record<string, unknown>
}

function deserializeRecursive(obj: unknown, _collectionName: string): unknown {
  if (obj === null || obj === undefined) return obj

  if (Array.isArray(obj)) {
    return obj.map((item) => deserializeRecursive(item, _collectionName))
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof value === 'string' && KNOWN_DATE_FIELD_NAMES.has(key) && isISODate(value)) {
        result[key] = Timestamp.fromDate(new Date(value))
      } else {
        result[key] = deserializeRecursive(value, _collectionName)
      }
    }
    return result
  }

  return obj
}

function isISODate(str: string): boolean {
  // Verifica formato ISO 8601: 2024-01-15T00:00:00.000Z o similar
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)
}

// --- Validación del archivo de backup ---

export interface BackupMeta {
  version: number
  exportDate: string
  farmId: string
  farmName: string
  exportedBy: string
  counts: {
    animals: number
    breedingRecords: number
    reminders: number
    weightRecords: number
    farmInvitations: number
  }
}

export interface BackupFile {
  _meta: BackupMeta
  _types?: Record<string, unknown>
  farm: Record<string, unknown>
  animals: Record<string, unknown>[]
  breedingRecords: Record<string, unknown>[]
  reminders: Record<string, unknown>[]
  weightRecords: Record<string, unknown>[]
  farmInvitations: Record<string, unknown>[]
}

/**
 * Descripción de los tipos de cada colección del respaldo.
 * Se incluye en el JSON exportado para que usuarios o sistemas externos
 * conozcan la estructura esperada al importar datos.
 */
export const BACKUP_TYPE_DESCRIPTIONS: Record<string, unknown> = {
  animal: {
    id: 'string',
    farmerId: 'string (ID del usuario dueño)',
    farmId: 'string (ID de la granja)',
    animalNumber: 'string (identificador único asignado por el granjero)',
    name: 'string | undefined (nombre opcional del animal)',
    type: "'oveja' | 'vaca' | 'cabra' | 'cerdo' | 'gallina' | 'perro' | 'gato' | 'equino' | 'otro'",
    breed: 'string | undefined (raza)',
    stage: "'cria' | 'engorda' | 'lechera' | 'reproductor' | 'descarte'",
    gender: "'macho' | 'hembra'",
    weight: 'number | string | null (en gramos)',
    age: 'number | null',
    birthDate: 'string (ISO 8601) | undefined',
    motherId: 'string | undefined (ID del animal madre)',
    fatherId: 'string | undefined (ID del animal padre)',
    status: "'activo' | 'muerto' | 'vendido' | 'perdido' (default: activo)",
    statusAt: 'string (ISO 8601) | undefined',
    statusNotes: 'string | undefined',
    notes: 'string | undefined',
    isWeaned: 'boolean | undefined',
    weanedAt: 'string (ISO 8601) | undefined',
    weightRecords:
      '[{ date: ISO 8601, weight: number (gramos), age?: number (meses), notes?: string }] | undefined',
    soldInfo:
      '{ date: ISO 8601, buyer?: string, weight?: number (gramos), price?: number (centavos) } | undefined',
    lostInfo: '{ lostAt: ISO 8601, foundAt?: ISO 8601 } | undefined',
    records:
      '[ { id, type, category, title, description?, date, severity?, isResolved?, resolvedDate?, treatment?, nextDueDate?, batch?, veterinarian?, cost?, notes?, appliedToAnimals?: string[], isBulkApplication?: boolean, createdAt, createdBy, updatedAt? } ] | undefined',
    customWeaningDays: 'number | undefined (override de días de destete recomendados)',
    adminAction:
      '{ performedByAdmin: boolean, adminEmail?: string, adminId?: string, originalTimestamp: ISO 8601, impersonationReason?: string } | undefined',
    createdAt: 'string (ISO 8601)',
    updatedAt: 'string (ISO 8601)',
  },
  breedingRecord: {
    id: 'string',
    breedingId: 'string | undefined (ID legible, ej: "10-10-25-01")',
    farmerId: 'string (ID del usuario)',
    farmId: 'string (ID de la granja)',
    maleId: 'string (ID del animal macho)',
    breedingDate: 'string (ISO 8601) | null',
    femaleBreedingInfo:
      '[ { femaleId: string, pregnancyConfirmedDate?: ISO 8601, expectedBirthDate?: ISO 8601, actualBirthDate?: ISO 8601, offspring?: string[] } ]',
    notes: 'string | undefined',
    comments:
      '[ { id: string, content: string, urgency?: "none"|"low"|"medium"|"high", createdAt?: ISO 8601, createdBy?: string } ] | undefined',
    createdAt: 'string (ISO 8601)',
    updatedAt: 'string (ISO 8601)',
  },
  reminder: {
    id: 'string',
    farmerId: 'string (ID del usuario)',
    farmId: 'string (ID de la granja)',
    animalNumber: 'string | undefined (arete del animal, deprecated)',
    animalNumbers: 'string[] | undefined (aretes de animales asociados)',
    title: 'string',
    description: 'string',
    dueDate: 'string (ISO 8601)',
    completed: 'boolean',
    completionByAnimal: 'Record<string, boolean> | undefined (estado por animal: { animalNumber: true/false })',
    priority: "'low' | 'medium' | 'high'",
    type: "'medical' | 'breeding' | 'feeding' | 'weight' | 'other'",
    createdAt: 'string (ISO 8601)',
    updatedAt: 'string (ISO 8601)',
  },
  weightRecord: {
    id: 'string',
    animalNumber: 'string (arete del animal)',
    weight: 'number (en gramos)',
    date: 'string (ISO 8601)',
    notes: 'string | undefined',
  },
  farmInvitation: {
    id: 'string',
    farmId: 'string (ID de la granja)',
    email: 'string',
    role: "'admin' | 'manager' | 'caretaker' | 'veterinarian' | 'viewer'",
    permissions:
      "[ { module: 'animals'|'breeding'|'reminders'|'areas'|'collaborators'|'reports'|'invitations', actions: ('create'|'read'|'update'|'delete')[] } ]",
    invitedBy: 'string (ID del usuario)',
    status: "'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked'",
    expiresAt: 'string (ISO 8601)',
    createdAt: 'string (ISO 8601)',
    updatedAt: 'string (ISO 8601)',
  },
  farm: {
    id: 'string',
    name: 'string',
    description: 'string | undefined',
    ownerId: 'string (ID del usuario dueño)',
    location:
      '{ address?: string, city?: string, state?: string, country?: string, coordinates?: { lat: number, lng: number } } | undefined',
    createdAt: 'string (ISO 8601)',
    updatedAt: 'string (ISO 8601)',
  },
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  preview: BackupMeta | null
}

const REQUIRED_COLLECTIONS = [
  'animals',
  'breedingRecords',
  'reminders',
  'weightRecords',
  'farmInvitations',
] as const

export function validateBackupFile(data: unknown, currentFarmId: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: ['El archivo no contiene un objeto JSON válido'],
      warnings,
      preview: null,
    }
  }

  const backup = data as Record<string, unknown>

  // Verificar _meta
  if (!backup._meta || typeof backup._meta !== 'object') {
    errors.push('El archivo no tiene metadatos (_meta)')
    return { valid: false, errors, warnings, preview: null }
  }

  const meta = backup._meta as Record<string, unknown>

  if (meta.version !== 1) {
    errors.push(`Versión de respaldo no soportada: ${meta.version}`)
  }

  if (!meta.farmId || typeof meta.farmId !== 'string') {
    errors.push('El respaldo no tiene un ID de granja válido')
  }

  if (!meta.exportDate || typeof meta.exportDate !== 'string') {
    warnings.push('El respaldo no tiene fecha de exportación')
  }

  // Verificar que tiene la colección farm
  if (!backup.farm || typeof backup.farm !== 'object') {
    errors.push('El respaldo no contiene datos de la granja')
  }

  // Verificar colecciones requeridas
  for (const col of REQUIRED_COLLECTIONS) {
    if (!(col in backup)) {
      warnings.push(`Colección "${col}" no encontrada en el respaldo (se omitirá)`)
    } else if (!Array.isArray(backup[col])) {
      errors.push(`La colección "${col}" no es un array válido`)
    }
  }

  // Warning si es de otra granja
  if (meta.farmId && meta.farmId !== currentFarmId) {
    warnings.push(
      `Este respaldo es de otra granja (${meta.farmName || meta.farmId}). ` +
        'Los datos se importarán a tu granja actual.',
    )
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings, preview: null }
  }

  return {
    valid: true,
    errors,
    warnings,
    preview: meta as unknown as BackupMeta,
  }
}

export { DATE_FIELDS_BY_COLLECTION }
