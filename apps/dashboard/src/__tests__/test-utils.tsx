import { configureStore } from '@reduxjs/toolkit'
import { render } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'
import { animalsReducer } from '@/features/animals/animalsSlice'
import { authReducer } from '@/features/auth/authSlice'
import { breedingReducer } from '@/features/breeding/breedingSlice'
import { farmReducer } from '@/features/farm/farmSlice'
import { remindersReducer } from '@/features/reminders/remindersSlice'
import { User } from '@/types'
import '@testing-library/jest-dom'

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'test-user-123',
  email: 'test@test.com',
  farmName: 'Test Farm',
  roles: ['farmer'],
  createdAt: new Date('2023-01-01'),
  ...overrides,
})

export const createMockStore = (initialAuthState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      animals: animalsReducer,
      breeding: breedingReducer,
      reminders: remindersReducer,
      farm: farmReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        isLoading: false,
        error: null,
        emailLinkSent: false,
        emailForLink: null,
        ...initialAuthState,
      },
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  })
}

export const renderWithProviders = (
  ui: React.ReactElement,
  { store = createMockStore(), ...renderOptions } = {},
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

export const renderWithAuth = (
  ui: React.ReactElement,
  user: User | null = null,
  otherAuthState = {},
) => {
  const store = createMockStore({
    user,
    ...otherAuthState,
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
  ...overrides,
})

// Mock Firebase auth responses
export const mockFirebaseAuthSuccess = (user = createMockFirebaseUser()) => {
  const mockAuth = (global as any).mockAuth
  mockAuth.signInWithEmailAndPassword.mockResolvedValue({ user })
  mockAuth.createUserWithEmailAndPassword.mockResolvedValue({ user })
  mockAuth.signInWithEmailLink.mockResolvedValue({ user })
}

export const mockFirebaseAuthError = (error = new Error('Authentication failed')) => {
  const mockAuth = (global as any).mockAuth
  mockAuth.signInWithEmailAndPassword.mockRejectedValue(error)
  mockAuth.createUserWithEmailAndPassword.mockRejectedValue(error)
  mockAuth.signInWithEmailLink.mockRejectedValue(error)
}

export const mockFirestoreSuccess = () => {
  const mockFirestore = (global as any).mockFirestore
  mockFirestore.doc.mockReturnValue({})
  mockFirestore.getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      email: 'test@test.com',
      farmName: 'Test Farm',
      createdAt: new Date(),
    }),
  })
  mockFirestore.setDoc.mockResolvedValue(undefined)
}

export const mockFirestoreError = (error = new Error('Firestore error')) => {
  const mockFirestore = (global as any).mockFirestore
  mockFirestore.getDoc.mockRejectedValue(error)
  mockFirestore.setDoc.mockRejectedValue(error)
}

// Wait for async operations
export const waitForAuthOperation = () => new Promise((resolve) => setTimeout(resolve, 0))

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
  waitForAuthOperation,
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
    if (state.auth.isLoading !== false) throw new Error('Loading should be false')
  })
})
