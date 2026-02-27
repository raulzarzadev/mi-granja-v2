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
        emailLinkSent: false,
        emailForLink: null,
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

describe('useAuth', () => {
  it('should provide auth context functions', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper()
    })

    // Verificar que el hook retorna un objeto
    if (!result.current) {
      throw new Error('useAuth should return an object')
    }

    // Verificar que las funciones están definidas
    if (typeof result.current.login !== 'function') {
      throw new Error('login should be a function')
    }

    if (typeof result.current.register !== 'function') {
      throw new Error('register should be a function')
    }

    if (typeof result.current.logout !== 'function') {
      throw new Error('logout should be a function')
    }
  })

  it('should have initial state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper()
    })

    // Verificar estado inicial
    if (result.current.user !== null) {
      throw new Error('Initial user should be null')
    }

    if (result.current.isLoading !== false) {
      throw new Error('Initial isLoading should be false')
    }

    if (result.current.error !== null) {
      throw new Error('Initial error should be null')
    }
  })
})
