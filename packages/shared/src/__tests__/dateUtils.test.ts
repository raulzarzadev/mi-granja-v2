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

import {
  addDays,
  calculateAge,
  calculateAgeInMonths,
  daysDifference,
  formatDateDisplay,
  isPast,
  isToday,
  isTomorrow,
  parseLocalDateString,
  toLocalDateString,
  toSafeDate,
  toStartOfDay,
} from '../lib/dateUtils'

describe('dateUtils', () => {
  describe('toSafeDate', () => {
    it('should return current date for null', () => {
      const result = toSafeDate(null)
      expect(result).toBeInstanceOf(Date)
    })

    it('should return the same Date object if passed a Date', () => {
      const date = new Date('2025-06-15')
      expect(toSafeDate(date)).toBe(date)
    })

    it('should parse yyyy-MM-dd string as local date', () => {
      const result = toSafeDate('2025-06-15')
      expect(result.getFullYear()).toBe(2025)
      expect(result.getMonth()).toBe(5) // June = 5
      expect(result.getDate()).toBe(15)
    })

    it('should parse dd/MM/yyyy format', () => {
      const result = toSafeDate('15/06/2025')
      expect(result.getFullYear()).toBe(2025)
      expect(result.getMonth()).toBe(5)
      expect(result.getDate()).toBe(15)
    })

    it('should handle numbers (millis)', () => {
      const millis = new Date(2025, 0, 15).getTime() // Jan 15, 2025 local
      const result = toSafeDate(millis)
      expect(result.getFullYear()).toBe(2025)
    })
  })

  describe('parseLocalDateString', () => {
    it('should parse yyyy-MM-dd correctly', () => {
      const result = parseLocalDateString('2025-03-10')
      expect(result.getFullYear()).toBe(2025)
      expect(result.getMonth()).toBe(2) // March = 2
      expect(result.getDate()).toBe(10)
    })

    it('should return current date for invalid input', () => {
      const result = parseLocalDateString('')
      expect(result).toBeInstanceOf(Date)
    })

    it('should return current date for malformed string', () => {
      const result = parseLocalDateString('not-a-date')
      expect(result).toBeInstanceOf(Date)
    })
  })

  describe('formatDateDisplay', () => {
    it('should format date as dd/MM/yyyy', () => {
      const result = formatDateDisplay(new Date(2025, 5, 15)) // June 15, 2025
      expect(result).toBe('15/06/2025')
    })
  })

  describe('toLocalDateString', () => {
    it('should format date as yyyy-MM-dd', () => {
      const result = toLocalDateString(new Date(2025, 0, 5)) // Jan 5, 2025
      expect(result).toBe('2025-01-05')
    })
  })

  describe('calculateAge', () => {
    it('should calculate age in years', () => {
      const twoYearsAgo = new Date()
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
      twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 1) // ensure we're past the birthday
      const result = calculateAge(twoYearsAgo)
      expect(result).toBe(2)
    })

    it('should return 0 for future dates', () => {
      const future = new Date()
      future.setFullYear(future.getFullYear() + 1)
      expect(calculateAge(future)).toBe(0)
    })
  })

  describe('calculateAgeInMonths', () => {
    it('should calculate months', () => {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      sixMonthsAgo.setDate(1) // ensure day doesn't interfere
      const result = calculateAgeInMonths(sixMonthsAgo)
      expect(result).toBeGreaterThanOrEqual(5)
      expect(result).toBeLessThanOrEqual(7)
    })
  })

  describe('isPast', () => {
    it('should return true for past dates', () => {
      expect(isPast(new Date('2020-01-01'))).toBe(true)
    })

    it('should return false for future dates', () => {
      const future = new Date()
      future.setFullYear(future.getFullYear() + 1)
      expect(isPast(future)).toBe(false)
    })
  })

  describe('isToday', () => {
    it('should return true for today', () => {
      expect(isToday(new Date())).toBe(true)
    })

    it('should return false for yesterday', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isToday(yesterday)).toBe(false)
    })
  })

  describe('isTomorrow', () => {
    it('should return true for tomorrow', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(isTomorrow(tomorrow)).toBe(true)
    })

    it('should return false for today', () => {
      expect(isTomorrow(new Date())).toBe(false)
    })
  })

  describe('addDays', () => {
    it('should add days correctly', () => {
      const result = addDays(new Date(2025, 0, 1), 10)
      expect(result.getDate()).toBe(11)
      expect(result.getMonth()).toBe(0)
    })

    it('should handle month overflow', () => {
      const result = addDays(new Date(2025, 0, 30), 5)
      expect(result.getMonth()).toBe(1) // February
    })
  })

  describe('daysDifference', () => {
    it('should calculate positive difference', () => {
      const result = daysDifference(new Date(2025, 0, 1), new Date(2025, 0, 11))
      expect(result).toBe(10)
    })

    it('should calculate negative difference', () => {
      const result = daysDifference(new Date(2025, 0, 11), new Date(2025, 0, 1))
      expect(result).toBe(-10)
    })
  })

  describe('toStartOfDay', () => {
    it('should set time to 00:00:00', () => {
      const result = toStartOfDay(new Date(2025, 5, 15, 14, 30, 45))
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
    })
  })
})
