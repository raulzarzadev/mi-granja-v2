// Jest setup types para evitar conflictos con Cypress/Chai
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveBeenCalled(): R
      toHaveBeenCalledWith(...args: any[]): R
      toBeTruthy(): R
      toBeFalsy(): R
      toBeNull(): R
      toBeDefined(): R
      toBeUndefined(): R
      toEqual(expected: any): R
      toBe(expected: any): R
      toContain(expected: any): R
      toMatch(expected: string | RegExp): R
      toThrow(expected?: string | RegExp | Error): R
    }
  }

  interface Window {
    mockAuth: any
    mockFirestore: any
    mockRouter: any
  }

  declare const global: Window & {
    mockAuth: any
    mockFirestore: any
    mockRouter: any
  }
}

export {}
