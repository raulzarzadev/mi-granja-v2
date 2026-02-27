import { AnimalRecord, RecordCategory } from '../types/animals'
import { RecordFormState } from '../types/records'

const clinicalCategories: ReadonlyArray<RecordCategory> = [
  'illness',
  'injury',
  'treatment',
  'surgery'
]

export type RecordPayload = Omit<
  AnimalRecord,
  'id' | 'createdAt' | 'createdBy' | 'appliedToAnimals' | 'isBulkApplication'
>

export function buildRecordFromForm(form: RecordFormState): RecordPayload {
  const base: Partial<RecordPayload> = {
    type: form.type,
    category: form.category,
    title: form.title.trim(),
    date: parseLocalDate(form.date)
  }

  if (form.description?.trim()) base.description = form.description.trim()

  if (form.type === 'health') {
    const isClinical = clinicalCategories.includes(form.category as any)
    if (isClinical) {
      if (form.severity)
        base.severity = form.severity as NonNullable<AnimalRecord['severity']>
      if (form.isResolved) base.isResolved = true
      if (form.resolvedDate)
        base.resolvedDate = parseLocalDate(form.resolvedDate)
      if (form.treatment?.trim()) base.treatment = form.treatment.trim()
    }

    if (form.nextDueDate) base.nextDueDate = parseLocalDate(form.nextDueDate)
    if (form.batch?.trim()) base.batch = form.batch.trim()
    if (form.veterinarian?.trim()) base.veterinarian = form.veterinarian.trim()
    if (form.cost) {
      const n = parseFloat(form.cost)
      if (!isNaN(n)) base.cost = n
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
