import { Timestamp } from 'firebase/firestore'
import { serializeObj } from '../libs/serializeObj'

// Mock Firebase Timestamp
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    fromDate: jest.fn((date: Date) => ({
      toMillis: () => date.getTime(),
      __isTimestamp: true
    })),
    now: jest.fn(() => ({
      toMillis: () => Date.now(),
      __isTimestamp: true
    }))
  }
}))

// Create a mock class that extends the mocked behavior
class MockTimestamp {
  private _millis: number

  constructor(millis: number) {
    this._millis = millis
  }

  toMillis(): number {
    return this._millis
  }

  static fromDate(date: Date): MockTimestamp {
    return new MockTimestamp(date.getTime())
  }

  static now(): MockTimestamp {
    return new MockTimestamp(Date.now())
  }
}

// Override instanceof check for our tests
const originalInstanceof = Object.getOwnPropertyDescriptor(
  Object.prototype,
  'constructor'
)
beforeAll(() => {
  // Mock instanceof for Timestamp
  Object.defineProperty(Object.prototype, 'constructor', {
    configurable: true,
    get() {
      if (this.__isTimestamp) return MockTimestamp
      return originalInstanceof?.get?.call(this)
    }
  })
})

describe('serializeObj', () => {
  describe('primitive values', () => {
    it('should return null unchanged', () => {
      expect(serializeObj(null)).toBe(null)
    })

    it('should return undefined unchanged', () => {
      expect(serializeObj(undefined)).toBe(undefined)
    })

    it('should return string unchanged', () => {
      const str = 'test string'
      expect(serializeObj(str)).toBe(str)
    })

    it('should return number unchanged', () => {
      const num = 42
      expect(serializeObj(num)).toBe(num)
    })

    it('should return boolean unchanged', () => {
      expect(serializeObj(true)).toBe(true)
      expect(serializeObj(false)).toBe(false)
    })
  })

  describe('Date objects', () => {
    it('should convert Date to timestamp', () => {
      const date = new Date('2023-01-01T00:00:00.000Z')
      const result = serializeObj(date)
      expect(result).toBe(date.getTime())
    })

    it('should handle current date', () => {
      const now = new Date()
      const result = serializeObj(now)
      expect(result).toBe(now.getTime())
    })
  })

  describe('Firestore Timestamp objects', () => {
    it('should convert Timestamp to millis', () => {
      const timestamp = Timestamp.fromDate(new Date('2023-01-01T00:00:00.000Z'))
      const result = serializeObj(timestamp)
      expect(result).toBe(timestamp.toMillis())
    })

    it('should convert Timestamp.now() to millis', () => {
      const timestamp = Timestamp.now()
      const result = serializeObj(timestamp)
      expect(result).toBe(timestamp.toMillis())
    })
  })

  describe('arrays', () => {
    it('should serialize empty array', () => {
      const arr: unknown[] = []
      expect(serializeObj(arr)).toEqual([])
    })

    it('should serialize array of primitives', () => {
      const arr = [1, 'test', true, null]
      expect(serializeObj(arr)).toEqual([1, 'test', true, null])
    })

    it('should serialize array of dates', () => {
      const date1 = new Date('2023-01-01T00:00:00.000Z')
      const date2 = new Date('2023-01-02T00:00:00.000Z')
      const arr = [date1, date2]
      const result = serializeObj(arr)
      expect(result).toEqual([date1.getTime(), date2.getTime()])
    })

    it('should serialize array of Timestamps', () => {
      const ts1 = Timestamp.fromDate(new Date('2023-01-01T00:00:00.000Z'))
      const ts2 = Timestamp.fromDate(new Date('2023-01-02T00:00:00.000Z'))
      const arr = [ts1, ts2]
      const result = serializeObj(arr)
      expect(result).toEqual([ts1.toMillis(), ts2.toMillis()])
    })

    it('should serialize nested arrays', () => {
      const date = new Date('2023-01-01T00:00:00.000Z')
      const arr = [
        [1, 2],
        ['test', date],
        [true, false]
      ]
      const result = serializeObj(arr)
      expect(result).toEqual([
        [1, 2],
        ['test', date.getTime()],
        [true, false]
      ])
    })
  })

  describe('objects', () => {
    it('should serialize empty object', () => {
      const obj = {}
      expect(serializeObj(obj)).toEqual({})
    })

    it('should serialize object with primitive values', () => {
      const obj = {
        id: 1,
        name: 'test',
        active: true,
        value: null
      }
      expect(serializeObj(obj)).toEqual(obj)
    })

    it('should serialize object with Date', () => {
      const date = new Date('2023-01-01T00:00:00.000Z')
      const obj = {
        id: 1,
        createdAt: date
      }
      const result = serializeObj(obj)
      expect(result).toEqual({
        id: 1,
        createdAt: date.getTime()
      })
    })

    it('should serialize object with Timestamp', () => {
      const timestamp = Timestamp.fromDate(new Date('2023-01-01T00:00:00.000Z'))
      const obj = {
        id: 1,
        createdAt: timestamp
      }
      const result = serializeObj(obj)
      expect(result).toEqual({
        id: 1,
        createdAt: timestamp.toMillis()
      })
    })

    it('should serialize nested objects', () => {
      const date1 = new Date('2023-01-01T00:00:00.000Z')
      const date2 = new Date('2023-01-02T00:00:00.000Z')
      const obj = {
        user: {
          id: 1,
          profile: {
            createdAt: date1,
            updatedAt: date2
          }
        }
      }
      const result = serializeObj(obj)
      expect(result).toEqual({
        user: {
          id: 1,
          profile: {
            createdAt: date1.getTime(),
            updatedAt: date2.getTime()
          }
        }
      })
    })

    it('should serialize object with arrays', () => {
      const date = new Date('2023-01-01T00:00:00.000Z')
      const obj = {
        id: 1,
        tags: ['tag1', 'tag2'],
        dates: [date, new Date('2023-01-02T00:00:00.000Z')]
      }
      const result = serializeObj(obj)
      expect(result).toEqual({
        id: 1,
        tags: ['tag1', 'tag2'],
        dates: [date.getTime(), new Date('2023-01-02T00:00:00.000Z').getTime()]
      })
    })
  })

  describe('complex scenarios', () => {
    it('should serialize Animal-like object', () => {
      const animal = {
        id: 'animal-1',
        farmerId: 'farmer-1',
        animalId: 'COW-001',
        type: 'vaca_leche' as const,
        stage: 'lechera' as const,
        weight: 450,
        age: 36,
        birthDate: new Date('2021-01-15T00:00:00.000Z'),
        gender: 'hembra' as const,
        motherId: 'animal-mother-1',
        fatherId: 'animal-father-1',
        notes: 'Vaca muy productiva',
        createdAt: Timestamp.fromDate(new Date('2023-01-01T00:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2023-06-01T00:00:00.000Z'))
      }

      const result = serializeObj(animal)

      expect(result).toEqual({
        id: 'animal-1',
        farmerId: 'farmer-1',
        animalId: 'COW-001',
        type: 'vaca_leche',
        stage: 'lechera',
        weight: 450,
        age: 36,
        birthDate: new Date('2021-01-15T00:00:00.000Z').getTime(),
        gender: 'hembra',
        motherId: 'animal-mother-1',
        fatherId: 'animal-father-1',
        notes: 'Vaca muy productiva',
        createdAt: animal.createdAt.toMillis(),
        updatedAt: animal.updatedAt.toMillis()
      })
    })

    it('should serialize BreedingRecord-like object', () => {
      const breeding = {
        id: 'breeding-1',
        farmerId: 'farmer-1',
        femaleId: 'female-1',
        maleId: 'male-1',
        breedingDate: new Date('2023-01-01T00:00:00.000Z'),
        expectedBirthDate: new Date('2023-10-01T00:00:00.000Z'),
        actualBirthDate: null,
        pregnancyConfirmed: true,
        offspring: ['offspring-1', 'offspring-2'],
        notes: 'Primera monta del año',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      const result = serializeObj(breeding)

      expect(result).toEqual({
        id: 'breeding-1',
        farmerId: 'farmer-1',
        femaleId: 'female-1',
        maleId: 'male-1',
        breedingDate: breeding.breedingDate.getTime(),
        expectedBirthDate: breeding.expectedBirthDate!.getTime(),
        actualBirthDate: null,
        pregnancyConfirmed: true,
        offspring: ['offspring-1', 'offspring-2'],
        notes: 'Primera monta del año',
        createdAt: breeding.createdAt.toMillis(),
        updatedAt: breeding.updatedAt.toMillis()
      })
    })

    it('should serialize array of animals', () => {
      const animals = [
        {
          id: 'animal-1',
          animalId: 'COW-001',
          birthDate: new Date('2021-01-15T00:00:00.000Z'),
          createdAt: Timestamp.fromDate(new Date('2023-01-01T00:00:00.000Z'))
        },
        {
          id: 'animal-2',
          animalId: 'COW-002',
          birthDate: new Date('2021-02-15T00:00:00.000Z'),
          createdAt: Timestamp.fromDate(new Date('2023-01-02T00:00:00.000Z'))
        }
      ]

      const result = serializeObj(animals)

      expect(result).toEqual([
        {
          id: 'animal-1',
          animalId: 'COW-001',
          birthDate: new Date('2021-01-15T00:00:00.000Z').getTime(),
          createdAt: animals[0].createdAt.toMillis()
        },
        {
          id: 'animal-2',
          animalId: 'COW-002',
          birthDate: new Date('2021-02-15T00:00:00.000Z').getTime(),
          createdAt: animals[1].createdAt.toMillis()
        }
      ])
    })
  })

  describe('edge cases', () => {
    it('should handle objects with undefined properties', () => {
      const obj = {
        id: 1,
        name: 'test',
        optional: undefined,
        date: new Date('2023-01-01T00:00:00.000Z')
      }

      const result = serializeObj(obj)

      expect(result).toEqual({
        id: 1,
        name: 'test',
        optional: undefined,
        date: new Date('2023-01-01T00:00:00.000Z').getTime()
      })
    })

    it('should handle deeply nested objects', () => {
      const date = new Date('2023-01-01T00:00:00.000Z')
      const obj = {
        level1: {
          level2: {
            level3: {
              level4: {
                date: date,
                value: 'deep'
              }
            }
          }
        }
      }

      const result = serializeObj(obj)

      expect(result).toEqual({
        level1: {
          level2: {
            level3: {
              level4: {
                date: date.getTime(),
                value: 'deep'
              }
            }
          }
        }
      })
    })

    it('should handle mixed arrays and objects', () => {
      const date1 = new Date('2023-01-01T00:00:00.000Z')
      const timestamp1 = Timestamp.fromDate(
        new Date('2023-01-02T00:00:00.000Z')
      )

      const complex = {
        items: [
          { id: 1, createdAt: date1 },
          { id: 2, createdAt: timestamp1 },
          'simple string',
          [1, 2, { nested: date1 }]
        ]
      }

      const result = serializeObj(complex)

      expect(result).toEqual({
        items: [
          { id: 1, createdAt: date1.getTime() },
          { id: 2, createdAt: timestamp1.toMillis() },
          'simple string',
          [1, 2, { nested: date1.getTime() }]
        ]
      })
    })
  })
})
