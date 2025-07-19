import { configureStore } from '@reduxjs/toolkit'
import '@testing-library/jest-dom'
import {
  authReducer,
  setUser,
  setLoading,
  setError,
  logout
} from '@/features/auth/authSlice'
import { User } from '@/types'

interface RootState {
  auth: {
    user: User | null
    isLoading: boolean
    error: string | null
    emailLinkSent: boolean
    emailForLink: string | null
  }
}

describe('Auth Store', () => {
  let store: ReturnType<typeof configureStore<RootState>>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: {
            // Ignore these action types
            ignoredActions: ['auth/setUser'],
            // Ignore these field paths in all actions
            ignoredActionsPaths: ['payload.createdAt'],
            // Ignore these paths in the state
            ignoredPaths: ['auth.user.createdAt']
          }
        })
    })
  })

  it('should have initial state', () => {
    const state = store.getState().auth

    // Verificar estado inicial usando comparaciones básicas
    if (state.user !== null) {
      throw new Error('Initial user should be null')
    }

    if (state.isLoading !== false) {
      throw new Error('Initial isLoading should be false')
    }

    if (state.error !== null) {
      throw new Error('Initial error should be null')
    }

    if (state.emailLinkSent !== false) {
      throw new Error('Initial emailLinkSent should be false')
    }

    if (state.emailForLink !== null) {
      throw new Error('Initial emailForLink should be null')
    }
  })

  it('should handle setUser action', () => {
    const user: User = {
      id: '123',
      email: 'test@test.com',
      farmName: 'Test Farm',
      roles: ['farmer'],
      createdAt: new Date()
    }

    store.dispatch(setUser(user))

    const state = store.getState().auth

    // Verificar que el usuario se serializó correctamente
    if (!state.user) {
      throw new Error('User should be set')
    }

    if (state.user.id !== '123') {
      throw new Error('User ID should be 123')
    }

    if (state.user.email !== 'test@test.com') {
      throw new Error('User email should be test@test.com')
    }

    if (state.user.farmName !== 'Test Farm') {
      throw new Error('User farmName should be Test Farm')
    }

    if (state.isLoading !== false) {
      throw new Error('isLoading should be false')
    }

    if (state.error !== null) {
      throw new Error('error should be null')
    }
  })

  it('should handle setLoading action', () => {
    store.dispatch(setLoading(true))

    const state = store.getState().auth
    if (state.isLoading !== true) {
      throw new Error('isLoading should be true')
    }
  })

  it('should handle setError action', () => {
    const error = 'Authentication failed'

    store.dispatch(setError(error))

    const state = store.getState().auth
    if (state.error !== error) {
      throw new Error(`error should be ${error}`)
    }
    if (state.isLoading !== false) {
      throw new Error('isLoading should be false')
    }
  })

  it('should handle logout action', () => {
    // First set a user
    const user: User = {
      id: '123',
      email: 'test@test.com',
      farmName: 'Test Farm',
      roles: ['farmer'],
      createdAt: new Date()
    }
    store.dispatch(setUser(user))

    // Then logout
    store.dispatch(logout())

    const state = store.getState().auth
    if (state.user !== null) {
      throw new Error('user should be null after logout')
    }
    if (state.isLoading !== false) {
      throw new Error('isLoading should be false after logout')
    }
    if (state.error !== null) {
      throw new Error('error should be null after logout')
    }
  })

  it('should handle multiple actions in sequence', () => {
    // Start loading
    store.dispatch(setLoading(true))
    const loadingState = store.getState().auth
    if (loadingState.isLoading !== true) {
      throw new Error('isLoading should be true')
    }

    // Set user (should clear loading and error)
    const user: User = {
      id: '123',
      email: 'test@test.com',
      farmName: 'Test Farm',
      roles: ['farmer'],
      createdAt: new Date()
    }
    store.dispatch(setUser(user))

    const state = store.getState().auth

    // Verificar que el usuario se estableció
    if (!state.user) {
      throw new Error('User should be set')
    }

    if (state.user.id !== '123') {
      throw new Error('User ID should be 123')
    }

    if (state.isLoading !== false) {
      throw new Error('isLoading should be false after setUser')
    }

    if (state.error !== null) {
      throw new Error('error should be null after setUser')
    }
  })

  it('should handle error during loading', () => {
    // Start loading
    store.dispatch(setLoading(true))
    const loadingState = store.getState().auth
    if (loadingState.isLoading !== true) {
      throw new Error('isLoading should be true')
    }

    // Set error (should clear loading)
    const error = 'Network error'
    store.dispatch(setError(error))

    const state = store.getState().auth
    if (state.error !== error) {
      throw new Error(`error should be ${error}`)
    }
    if (state.isLoading !== false) {
      throw new Error('isLoading should be false after error')
    }
    if (state.user !== null) {
      throw new Error('user should be null')
    }
  })
})
