import type { Reminder } from '@/types'

export const reminder_priorities = ['low', 'medium', 'high'] as const
export const reminder_types = ['medical', 'breeding', 'feeding', 'weight', 'other'] as const
export const reminder_priority_labels: Record<Reminder['priority'], string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}
export const reminder_type_labels: Record<Reminder['type'], string> = {
  medical: 'Médico',
  breeding: 'Reproducción',
  feeding: 'Alimentación',
  weight: 'Peso',
  other: 'Otro',
}

export type ReminderInput = {
  title: string
  description?: string
  dueDate: Date
  priority?: Reminder['priority']
  type?: Reminder['type']
  /** Números visibles de los animales vinculados (no IDs de documento). */
  animalNumbers?: string[]
  assigneeIds?: string[]
  completed?: boolean
}

/**
 * Documento de un recordatorio nuevo. Lo comparten el formulario manual y el
 * asistente; cada transporte convierte las fechas a su Timestamp.
 */
export function buildReminderDocument(
  input: ReminderInput,
  context: { userId: string; farmId: string },
  now: Date,
) {
  if (!context.userId || !context.farmId) throw new Error('Selecciona una granja primero')
  const title = input.title?.trim()
  if (!title) throw new Error('Escribe el título del recordatorio.')
  if (!(input.dueDate instanceof Date) || !Number.isFinite(input.dueDate.getTime()))
    throw new Error('La fecha del recordatorio no es válida.')
  const animalNumbers = [...new Set(input.animalNumbers ?? [])]
  return {
    farmerId: context.userId,
    farmId: context.farmId,
    animalNumber: animalNumbers[0] || null, // compatibilidad legacy
    animalNumbers,
    title,
    description: input.description?.trim() || '',
    dueDate: input.dueDate,
    completed: input.completed || false,
    completionByAnimal: Object.fromEntries(animalNumbers.map((number) => [number, false])),
    priority: input.priority || 'medium',
    type: input.type || 'other',
    createdAt: now,
    updatedAt: now,
    ...(input.assigneeIds?.length ? { assigneeIds: input.assigneeIds } : {}),
  }
}
