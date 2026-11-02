/** Calendar-only conversion shared by browser/domain and server executors. */
export function farmDateKey(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

export function parseFarmDate(value: string, timeZone: string, time = '00:00'): Date {
  const [year, month, day] = value.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const naive = new Date(Date.UTC(year, month - 1, day, hour, minute))
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !/^\d{2}:\d{2}$/.test(time) ||
    !Number.isFinite(naive.getTime()) ||
    naive.toISOString().slice(0, 10) !== value ||
    hour > 23 ||
    minute > 59
  )
    throw new Error('La fecha no es válida.')
  let formatter: Intl.DateTimeFormat
  try {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
  } catch {
    throw new Error('La zona horaria no es válida.')
  }
  let millis = naive.getTime()
  for (let i = 0; i < 3; i++) {
    const fields = Object.fromEntries(
      formatter.formatToParts(new Date(millis)).map((part) => [part.type, part.value]),
    )
    const seen = Date.UTC(
      +fields.year,
      +fields.month - 1,
      +fields.day,
      +fields.hour,
      +fields.minute,
      +fields.second,
    )
    millis += naive.getTime() - seen
  }
  const result = new Date(millis)
  const finalFields = Object.fromEntries(
    formatter.formatToParts(result).map((part) => [part.type, part.value]),
  )
  if (
    farmDateKey(result, timeZone) !== value ||
    Number(finalFields.hour) !== hour ||
    Number(finalFields.minute) !== minute
  )
    throw new Error('La fecha y hora no existen en esta zona horaria.')
  return result
}

export function addFarmCalendarDays(value: Date, days: number, timeZone: string): Date {
  const date = new Date(`${farmDateKey(value, timeZone)}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return parseFarmDate(date.toISOString().slice(0, 10), timeZone)
}
