import { asAiDate } from './context-serialization'

export function knowledgeTimeZone(value?: string | null): string {
  if (!value) return 'UTC'
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format()
    return value
  } catch {
    return 'UTC'
  }
}

/** Date-only business inputs retain their day; instants use the effective farm zone. */
export function knowledgeDateKey(value: unknown, timeZone = 'UTC'): string | null {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = asAiDate(value)
  if (!date) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: knowledgeTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function knowledgeCalendarDay(value: unknown, timeZone = 'UTC'): Date | null {
  const key = knowledgeDateKey(value, timeZone)
  return key ? new Date(`${key}T00:00:00Z`) : null
}

export function knowledgeDaysUntil(from: unknown, to: unknown, timeZone = 'UTC'): number | null {
  const first = knowledgeCalendarDay(from, timeZone)
  const second = knowledgeCalendarDay(to, timeZone)
  return first && second ? Math.round((second.getTime() - first.getTime()) / 86400000) : null
}
