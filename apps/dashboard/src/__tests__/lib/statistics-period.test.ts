import { getMonthKey, isDateInMonthBuckets } from '@/lib/statistics-period'

describe('statistics period helpers', () => {
  const selectedMonths = new Set(['2026-2', '2026-3', '2026-4', '2026-5', '2026-6', '2026-7'])

  it('includes dates inside the selected month buckets', () => {
    expect(isDateInMonthBuckets('2026-03-01T12:00:00', selectedMonths)).toBe(true)
    expect(isDateInMonthBuckets(new Date(2026, 7, 31), selectedMonths)).toBe(true)
  })

  it('excludes historical dates outside the selected period', () => {
    expect(isDateInMonthBuckets('2025-08-13T12:00:00', selectedMonths)).toBe(false)
  })

  it('excludes missing or invalid dates instead of adding them to the current period', () => {
    expect(isDateInMonthBuckets(undefined, selectedMonths)).toBe(false)
    expect(isDateInMonthBuckets('not-a-date', selectedMonths)).toBe(false)
  })

  it('builds the same zero-based month key used by the chart buckets', () => {
    expect(getMonthKey(new Date(2026, 7, 13))).toBe('2026-7')
  })
})
