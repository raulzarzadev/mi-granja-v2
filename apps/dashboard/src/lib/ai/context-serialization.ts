export function asAiDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'object' && typeof (value as { toDate?: unknown }).toDate === 'function') {
    try {
      const date = (value as { toDate: () => Date }).toDate()
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null
    } catch {
      return null
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

export function aiDateKey(value: unknown): string | null {
  return asAiDate(value)?.toISOString().slice(0, 10) ?? null
}

export function normalizeAiReminder(id: string, data: Record<string, unknown>) {
  return {
    id,
    titulo: typeof data.title === 'string' ? data.title : '',
    fecha: aiDateKey(data.dueDate),
    prioridad: typeof data.priority === 'string' ? data.priority : 'medium',
    tipo: typeof data.type === 'string' ? data.type : 'other',
    animales: Array.isArray(data.animalNumbers)
      ? data.animalNumbers.filter((value): value is string => typeof value === 'string')
      : [],
  }
}
