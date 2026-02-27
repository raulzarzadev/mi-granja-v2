import '@testing-library/jest-dom'

declare global {
  var mockAuth: unknown
  var mockFirestore: unknown
  var mockRouter: unknown
}

export {}

// Simple test to prevent "no test" error  
describe('Setup types', () => {
  it('should have global declarations', () => {
    // Just a placeholder test
    if (typeof global === 'undefined') throw new Error('Global not available')
  })
})
