import React from 'react'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { authReducer } from '@/features/auth/authSlice'
import { User } from '@/types'
import '@testing-library/jest-dom'

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'test-user-123',
  email: 'test@test.com',
  farmName: 'Test Farm',
  roles: ['farmer'],
  createdAt: new Date('2023-01-01'),
  ...overrides
})

export const createMockStore = (initialAuthState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer
    },
    preloadedState: {
      auth: {
        user: null,
        isLoading: false,
        error: null,
        emailLinkSent: false,
        emailForLink: null,
        ...initialAuthState
      }
    }
  })
}

export const renderWithProviders = (
  ui: React.ReactElement,
  { store = createMockStore(), ...renderOptions } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  }
}

export const renderWithAuth = (
  ui: React.ReactElement,
  user: User | null = null,
  otherAuthState = {}
) => {
  const store = createMockStore({
    user,
    ...otherAuthState
  })

  return renderWithProviders(ui, { store })
}

// Mock Firebase user for testing
export const createMockFirebaseUser = (overrides = {}) => ({
  uid: 'firebase-user-123',
  email: 'test@test.com',
  emailVerified: true,
  displayName: null,
  photoURL: null,
  ...overrides
})

// Mock Firebase auth responses
export const mockFirebaseAuthSuccess = (user = createMockFirebaseUser()) => {
  global.mockAuth.signInWithEmailAndPassword.mockResolvedValue({ user })
  global.mockAuth.createUserWithEmailAndPassword.mockResolvedValue({ user })
  global.mockAuth.signInWithEmailLink.mockResolvedValue({ user })
}

export const mockFirebaseAuthError = (
  error = new Error('Authentication failed')
) => {
  global.mockAuth.signInWithEmailAndPassword.mockRejectedValue(error)
  global.mockAuth.createUserWithEmailAndPassword.mockRejectedValue(error)
  global.mockAuth.signInWithEmailLink.mockRejectedValue(error)
}

export const mockFirestoreSuccess = () => {
  global.mockFirestore.doc.mockReturnValue({})
  global.mockFirestore.getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      email: 'test@test.com',
      farmName: 'Test Farm',
      createdAt: new Date()
    })
  })
  global.mockFirestore.setDoc.mockResolvedValue(undefined)
}

export const mockFirestoreError = (error = new Error('Firestore error')) => {
  global.mockFirestore.getDoc.mockRejectedValue(error)
  global.mockFirestore.setDoc.mockRejectedValue(error)
}

// Wait for async operations
export const waitForAuthOperation = () =>
  new Promise((resolve) => setTimeout(resolve, 0))

const testUtils = {
  createMockUser,
  createMockStore,
  renderWithProviders,
  renderWithAuth,
  createMockFirebaseUser,
  mockFirebaseAuthSuccess,
  mockFirebaseAuthError,
  mockFirestoreSuccess,
  mockFirestoreError,
  waitForAuthOperation
}

export default testUtils

// Simple test to prevent "no test" error
describe('Test Utils', () => {
  it('should create mock user with correct defaults', () => {
    const user = createMockUser()
    if (user.id !== 'test-user-123') throw new Error('Wrong id')
    if (user.email !== 'test@test.com') throw new Error('Wrong email')
    if (user.farmName !== 'Test Farm') throw new Error('Wrong farmName')
  })

  it('should create mock store', () => {
    const store = createMockStore()
    if (!store) throw new Error('Store not created')
    const state = store.getState() as {
      auth: { user: User | null; isLoading: boolean }
    }
    if (state.auth.user !== null) throw new Error('User should be null')
    if (state.auth.isLoading !== false)
      throw new Error('Loading should be false')
  })
})
