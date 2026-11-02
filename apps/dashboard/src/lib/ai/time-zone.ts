export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > 100) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format(0)
    return true
  } catch {
    return false
  }
}

/** Explicit policy: configured farm zone, declared browser zone, then UTC. */
export function resolveOperationTimeZone(configured: unknown, browser: unknown): string {
  return isValidTimeZone(configured) ? configured : isValidTimeZone(browser) ? browser : 'UTC'
}
export function dateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}
