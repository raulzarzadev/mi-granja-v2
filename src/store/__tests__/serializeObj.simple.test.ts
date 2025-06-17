import { serializeObj } from '../libs/serializeObj'

// Simple test without Firebase dependencies
describe('serializeObj', () => {
  test('should serialize basic values', () => {
    expect(serializeObj(null)).toBe(null)
    expect(serializeObj(undefined)).toBe(undefined)
    expect(serializeObj('string')).toBe('string')
    expect(serializeObj(123)).toBe(123)
    expect(serializeObj(true)).toBe(true)
  })

  test('should serialize Date objects to timestamps', () => {
    const date = new Date('2023-01-01T00:00:00.000Z')
    expect(serializeObj(date)).toBe(date.getTime())
  })

  test('should serialize arrays', () => {
    const date = new Date('2023-01-01T00:00:00.000Z')
    const arr = [1, 'test', date, null]
    const result = serializeObj(arr)
    expect(result).toEqual([1, 'test', date.getTime(), null])
  })

  test('should serialize objects', () => {
    const date = new Date('2023-01-01T00:00:00.000Z')
    const obj = {
      id: 1,
      name: 'test',
      createdAt: date,
      active: true
    }
    const result = serializeObj(obj)
    expect(result).toEqual({
      id: 1,
      name: 'test',
      createdAt: date.getTime(),
      active: true
    })
  })

  test('should serialize nested objects', () => {
    const date1 = new Date('2023-01-01T00:00:00.000Z')
    const date2 = new Date('2023-01-02T00:00:00.000Z')
    const obj = {
      user: {
        id: 1,
        profile: {
          createdAt: date1,
          updatedAt: date2
        }
      },
      items: [
        { id: 1, date: date1 },
        { id: 2, date: date2 }
      ]
    }
    const result = serializeObj(obj)
    expect(result).toEqual({
      user: {
        id: 1,
        profile: {
          createdAt: date1.getTime(),
          updatedAt: date2.getTime()
        }
      },
      items: [
        { id: 1, date: date1.getTime() },
        { id: 2, date: date2.getTime() }
      ]
    })
  })
})

export {}
