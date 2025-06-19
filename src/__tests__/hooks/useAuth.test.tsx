import React from 'react'
import { renderHook } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { useAuth } from '@/hooks/useAuth'
import { authReducer } from '@/features/auth/authSlice'

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  auth: global.mockAuth,
  db: global.mockFirestore
}))

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer
    },
    preloadedState: {
      auth: {
        user: null,
        isLoading: false,
        error: null,
        ...initialState
      }
    }
  })
}

const createWrapper = (store = createMockStore()) => {
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )
  TestWrapper.displayName = 'TestWrapper'
  return TestWrapper
}

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should provide auth methods and state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper()
    })

    expect(result.current).toBeDefined()
    expect(typeof result.current.login).toBe('function')
    expect(typeof result.current.register).toBe('function')
    expect(typeof result.current.logout).toBe('function')
    expect(typeof result.current.loginWithEmailLink).toBe('function')
    expect(typeof result.current.completeEmailLinkSignIn).toBe('function')
    expect(typeof result.current.isEmailLinkSignIn).toBe('function')
    expect(typeof result.current.clearError).toBe('function')
  })

  it('should return initial state from store', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should return custom state from store', () => {
    const mockUser = {
      id: '123',
      email: 'test@test.com',
      farmName: 'Test Farm',
      roles: ['farmer'],
      createdAt: new Date()
    }
    const store = createMockStore({
      user: mockUser,
      isLoading: true,
      error: 'Test error'
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(store)
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isLoading).toBe(true)
    expect(result.current.error).toBe('Test error')
  })
})
