import React from 'react'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { AuthProvider } from '@/features/auth/AuthContext'
import authSlice from '@/store/authSlice'
import { User } from '@/types'

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'test-user-123',
  email: 'test@test.com',
  farmName: 'Test Farm',
  createdAt: new Date('2023-01-01'),
  ...overrides
})

export const createMockStore = (initialAuthState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice
    },
    preloadedState: {
      auth: {
        user: null,
        isLoading: false,
        error: null,
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
    <Provider store={store}>
      <AuthProvider>{children}</AuthProvider>
    </Provider>
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

// Common test assertions
export const expectAuthLoading = (
  store: ReturnType<typeof createMockStore>
) => {
  expect(store.getState().auth.isLoading).toBe(true)
}

export const expectAuthSuccess = (
  store: ReturnType<typeof createMockStore>,
  user: User
) => {
  const state = store.getState().auth
  expect(state.user).toEqual(user)
  expect(state.isLoading).toBe(false)
  expect(state.error).toBe(null)
}

export const expectAuthError = (
  store: ReturnType<typeof createMockStore>,
  error: string
) => {
  const state = store.getState().auth
  expect(state.error).toBe(error)
  expect(state.isLoading).toBe(false)
  expect(state.user).toBe(null)
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
  expectAuthLoading,
  expectAuthSuccess,
  expectAuthError,
  waitForAuthOperation
}

export default testUtils
