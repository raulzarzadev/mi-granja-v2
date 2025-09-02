import { AnimalRecord, RecordCategory } from '@/types/animals'
import { RecordFormState } from '@/components/RecordForm'

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
    date: new Date(form.date)
  }

  if (form.description?.trim()) base.description = form.description.trim()
  if (form.notes?.trim()) base.notes = form.notes.trim()

  if (form.type === 'health') {
    const isClinical = clinicalCategories.includes(form.category as any)
    if (isClinical) {
      if (form.severity)
        base.severity = form.severity as NonNullable<AnimalRecord['severity']>
      if (form.isResolved) base.isResolved = true
      if (form.resolvedDate) base.resolvedDate = new Date(form.resolvedDate)
      if (form.treatment?.trim()) base.treatment = form.treatment.trim()
    }

    if (form.nextDueDate) base.nextDueDate = new Date(form.nextDueDate)
    if (form.batch?.trim()) base.batch = form.batch.trim()
    if (form.veterinarian?.trim()) base.veterinarian = form.veterinarian.trim()
    if (form.cost) {
      const n = parseFloat(form.cost)
      if (!isNaN(n)) base.cost = n
    }
  }

  return base as RecordPayload
}
