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
    static fromMillis(millis: number) {
      return new MockTimestamp(Math.floor(millis / 1000), (millis % 1000) * 1000000)
    }
  },
}))

import { deserializeObj, serializeObj } from '../lib/serializeObj'

describe('serializeObj', () => {
  it('should return null for null', () => {
    expect(serializeObj(null)).toBeNull()
  })

  it('should return undefined for undefined', () => {
    expect(serializeObj(undefined)).toBeUndefined()
  })

  it('should pass primitives through unchanged', () => {
    expect(serializeObj('hello')).toBe('hello')
    expect(serializeObj(42)).toBe(42)
    expect(serializeObj(true)).toBe(true)
  })

  it('should convert Date to milliseconds', () => {
    const date = new Date('2025-01-01T00:00:00.000Z')
    const result = serializeObj(date)
    expect(result).toBe(date.getTime())
  })

  it('should convert Timestamp-like objects to millis', () => {
    const mockTimestamp = {
      toMillis: () => 1700000000000,
    }
    const result = serializeObj(mockTimestamp)
    expect(result).toBe(1700000000000)
  })

  it('should recursively serialize objects', () => {
    const obj = {
      name: 'test',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      count: 5,
    }
    const result = serializeObj(obj) as any
    expect(result.name).toBe('test')
    expect(result.createdAt).toBe(new Date('2025-01-01T00:00:00.000Z').getTime())
    expect(result.count).toBe(5)
  })

  it('should serialize arrays', () => {
    const arr = [new Date('2025-01-01'), 'hello', 42]
    const result = serializeObj(arr) as any[]
    expect(typeof result[0]).toBe('number')
    expect(result[1]).toBe('hello')
    expect(result[2]).toBe(42)
  })

  it('should handle nested objects', () => {
    const nested = {
      user: {
        name: 'test',
        meta: {
          created: new Date('2025-06-15'),
        },
      },
    }
    const result = serializeObj(nested) as any
    expect(result.user.name).toBe('test')
    expect(typeof result.user.meta.created).toBe('number')
  })
})

describe('deserializeObj', () => {
  it('should return null for null', () => {
    expect(deserializeObj(null)).toBeNull()
  })

  it('should return undefined for undefined', () => {
    expect(deserializeObj(undefined)).toBeUndefined()
  })

  it('should convert numbers to Dates', () => {
    const millis = new Date('2025-01-01').getTime()
    const result = deserializeObj(millis)
    expect(result).toBeInstanceOf(Date)
  })
})
