jest.mock('firebase/firestore', () => ({
  Timestamp: class MockTimestamp {
    seconds: number
    nanoseconds: number
    constructor(seconds: number, nanoseconds: number) {
      this.seconds = seconds
      this.nanoseconds = nanoseconds
    }
    toMillis() {
      return this.seconds * 1000 + this.nanoseconds / 1000000
    }
    toDate() {
      return new Date(this.toMillis())
    }
  },
}))

import { formatDate, fromNow, startOfLocalDay, toDate } from '../lib/dates'

describe('dates (legacy)', () => {
  describe('toDate', () => {
    it('should return the same Date if passed a Date', () => {
      const date = new Date('2025-01-01')
      expect(toDate(date)).toBe(date)
    })

    it('should convert string to Date', () => {
      const result = toDate('2025-06-15')
      expect(result).toBeInstanceOf(Date)
      expect(result.getFullYear()).toBe(2025)
    })

    it('should convert number to Date', () => {
      const millis = new Date('2025-01-01').getTime()
      const result = toDate(millis)
      expect(result).toBeInstanceOf(Date)
    })

    it('should return current date for null/undefined', () => {
      const before = Date.now()
      const result = toDate(null as any)
      expect(result).toBeInstanceOf(Date)
      expect(result.getTime()).toBeGreaterThanOrEqual(before)
      expect(result.getTime()).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('formatDate', () => {
    it('should format date as dd/MM/yyyy by default', () => {
      const date = new Date(2025, 5, 15) // June 15, 2025
      const result = formatDate(date)
      expect(result).toBe('15/06/2025')
    })

    it('should use custom format', () => {
      const date = new Date(2025, 0, 5) // Jan 5, 2025
      const result = formatDate(date, 'yyyy-MM-dd')
      expect(result).toBe('2025-01-05')
    })
  })

  describe('fromNow', () => {
    it('should return empty string for null', () => {
      expect(fromNow(null)).toBe('')
    })

    it('should return Spanish relative time for past dates', () => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 35)
      const result = fromNow(thirtyDaysAgo)
      expect(result).toContain('mes')
      expect(result).toContain('atrás')
    })

    it('should return Spanish relative time for future dates', () => {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 35)
      const result = fromNow(thirtyDaysFromNow)
      expect(result).toContain('en')
      expect(result).toContain('mes')
    })
  })

  describe('startOfLocalDay', () => {
    it('should set time to 00:00:00', () => {
      const date = new Date(2025, 5, 15, 14, 30, 45)
      const result = startOfLocalDay(date)
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
      expect(result.getDate()).toBe(15)
    })
  })
})
