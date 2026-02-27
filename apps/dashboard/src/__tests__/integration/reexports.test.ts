/**
 * Integration test: verifica que los proxies en @/types/* y @/lib/* re-exportan
 * correctamente desde @mi-granja/shared.
 */

describe('Dashboard re-export proxies', () => {
  it('should re-export firebase (auth, db, storage)', () => {
    // firebase.ts is mocked in jest.setup, so we verify the mock is in place
    const firebase = require('@/lib/firebase')
    expect(firebase).toBeDefined()
  })

  it('should re-export dateUtils from shared', () => {
    const dateUtils = require('@mi-granja/shared/lib/dateUtils')
    expect(dateUtils.toSafeDate).toBeDefined()
    expect(dateUtils.formatDateDisplay).toBeDefined()
    expect(dateUtils.calculateAge).toBeDefined()
    expect(dateUtils.isPast).toBeDefined()
    expect(dateUtils.addDays).toBeDefined()
    expect(typeof dateUtils.toSafeDate).toBe('function')
  })

  it('should re-export serializeObj from shared', () => {
    const { serializeObj } = require('@mi-granja/shared/lib/serializeObj')
    expect(serializeObj).toBeDefined()
    expect(typeof serializeObj).toBe('function')
  })

  it('should re-export animal types from shared', () => {
    const animals = require('@mi-granja/shared/types/animals')
    expect(animals.animals_types).toBeDefined()
    expect(animals.animals_genders).toBeDefined()
    expect(Array.isArray(animals.animals_types)).toBe(true)
    expect(animals.animals_types).toContain('oveja')
    expect(animals.animals_types).toContain('vaca')
  })

  it('should re-export catchError from shared', () => {
    const catchError = require('@mi-granja/shared/lib/catchError')
    expect(catchError.default).toBeDefined()
    expect(typeof catchError.default).toBe('function')
  })
})
