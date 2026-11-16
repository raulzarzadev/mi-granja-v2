import { AnimalRecord, RecordCategory, RecordMedication } from '../types/animals'
import { RecordFormState } from '../types/records'

const clinicalCategories: ReadonlyArray<RecordCategory> = [
  'illness',
  'injury',
  'treatment',
  'surgery',
]

/** Categorías de un registro; los registros antiguos solo tienen `category`. */
export function getRecordCategories(
  record: Pick<AnimalRecord, 'category' | 'categories'>,
): RecordCategory[] {
  return record.categories?.length ? record.categories : [record.category]
}

export function isClinicalRecord(
  record: Pick<AnimalRecord, 'type' | 'category' | 'categories'>,
): boolean {
  return (
    record.type === 'health' &&
    getRecordCategories(record).some((category) => clinicalCategories.includes(category))
  )
}

/** Quita filas sin nombre y espacios sobrantes. */
export function cleanMedications(medications?: RecordMedication[]): RecordMedication[] {
  return (medications ?? []).flatMap((medication) => {
    const name = medication.name?.trim()
    if (!name) return []
    const batch = medication.batch?.trim()
    return [batch ? { name, batch } : { name }]
  })
}

export type RecordPayload = Omit<
  AnimalRecord,
  'id' | 'createdAt' | 'createdBy' | 'appliedToAnimals' | 'isBulkApplication'
>

export function buildRecordFromForm(form: RecordFormState): RecordPayload {
  const { createReminder: _createReminder, reminderDate: _reminderDate, ...fields } = form

  const categories = fields.categories?.length ? fields.categories : [fields.category]
  const base: Partial<RecordPayload> = {
    type: fields.type as 'note' | 'health',
    category: categories[0],
    title: fields.title.trim(),
    date: parseLocalDate(fields.date),
  }
  // Siempre se escribe el arreglo en nota/salud para que una edición reemplace el anterior.
  if (fields.type === 'note' || fields.type === 'health') base.categories = categories

  if (fields.description?.trim()) base.description = fields.description.trim()

  if (fields.type === 'health') {
    const isClinical = categories.some((category) => clinicalCategories.includes(category))
    if (isClinical) {
      if (fields.severity) base.severity = fields.severity as NonNullable<AnimalRecord['severity']>
      if (fields.isResolved) base.isResolved = true
      if (fields.resolvedDate) base.resolvedDate = parseLocalDate(fields.resolvedDate)
      if (fields.treatment?.trim()) base.treatment = fields.treatment.trim()
    }

    if (fields.nextDueDate) base.nextDueDate = parseLocalDate(fields.nextDueDate)
    if (fields.batch?.trim()) base.batch = fields.batch.trim()
    // Siempre se escribe en salud para que una edición reemplace la lista anterior.
    base.medications = cleanMedications(fields.medications)
    if (fields.veterinarian?.trim()) base.veterinarian = fields.veterinarian.trim()
    if (fields.cost) {
      const n = parseFloat(fields.cost)
      if (!Number.isNaN(n)) base.cost = n
    }
  }

  if (fields.type === 'expense') {
    ;(base as any).expenseCategory = fields.expenseCategory || 'other_expense'
    if (fields.supplier?.trim()) (base as any).supplier = fields.supplier.trim()
    if (fields.cost) {
      const n = parseFloat(fields.cost)
      if (!Number.isNaN(n)) base.cost = n
    }
  }

  return base as RecordPayload
}

// Helper para convertir fecha del input (yyyy-MM-dd) a Date local evitando problemas de UTC
function parseLocalDate(dateStr: string): Date {
  if (!dateStr) {
    // Si no hay fecha, usar hoy en horario local
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), today.getDate())
  }
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day) // month es 0-indexed en JS
}

// Helper para obtener la fecha actual en formato yyyy-MM-dd local (sin problemas de UTC)
export function getTodayLocalDateString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
