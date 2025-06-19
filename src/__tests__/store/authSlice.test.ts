import { configureStore } from '@reduxjs/toolkit'
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
    expect(state).toEqual({
      user: null,
      isLoading: false,
      error: null
    })
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
    // The user object should be serialized, with dates converted to timestamps
    expect(state.user).toEqual({
      id: '123',
      email: 'test@test.com',
      farmName: 'Test Farm',
      roles: ['farmer'],
      createdAt: user.createdAt.getTime() // Date should be converted to timestamp
    })
    expect(state.isLoading).toBe(false)
    expect(state.error).toBe(null)
  })

  it('should handle setLoading action', () => {
    store.dispatch(setLoading(true))

    const state = store.getState().auth
    expect(state.isLoading).toBe(true)
  })

  it('should handle setError action', () => {
    const error = 'Authentication failed'

    store.dispatch(setError(error))

    const state = store.getState().auth
    expect(state.error).toBe(error)
    expect(state.isLoading).toBe(false)
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
    expect(state.user).toBe(null)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBe(null)
  })

  it('should handle multiple actions in sequence', () => {
    // Start loading
    store.dispatch(setLoading(true))
    expect(store.getState().auth.isLoading).toBe(true)

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
    // The user object should be serialized, with dates converted to timestamps
    expect(state.user).toEqual({
      id: '123',
      email: 'test@test.com',
      farmName: 'Test Farm',
      roles: ['farmer'],
      createdAt: user.createdAt.getTime() // Date should be converted to timestamp
    })
    expect(state.isLoading).toBe(false)
    expect(state.error).toBe(null)
  })

  it('should handle error during loading', () => {
    // Start loading
    store.dispatch(setLoading(true))
    expect(store.getState().auth.isLoading).toBe(true)

    // Set error (should clear loading)
    const error = 'Network error'
    store.dispatch(setError(error))

    const state = store.getState().auth
    expect(state.error).toBe(error)
    expect(state.isLoading).toBe(false)
    expect(state.user).toBe(null)
  })
})
