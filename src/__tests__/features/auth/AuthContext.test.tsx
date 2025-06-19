import React from 'react'
import { render, renderHook, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { AuthProvider, useAuth } from '@/store/auth/AuthContext'
import authSlice from '@/store/authSlice'

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  auth: global.mockAuth,
  db: global.mockFirestore
}))

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice
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
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <AuthProvider>{children}</AuthProvider>
    </Provider>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should provide auth context', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper()
    })

    expect(result.current).toBeDefined()
    expect(result.current.login).toBeInstanceOf(Function)
    expect(result.current.register).toBeInstanceOf(Function)
    expect(result.current.logout).toBeInstanceOf(Function)
    expect(result.current.loginWithEmailLink).toBeInstanceOf(Function)
    expect(result.current.completeEmailLinkSignIn).toBeInstanceOf(Function)
    expect(result.current.isEmailLinkSignIn).toBeInstanceOf(Function)
  })

  it('should throw error when used outside provider', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleError.mockRestore()
  })

  describe('login', () => {
    it('should call signInWithEmailAndPassword', async () => {
      const mockUser = { uid: '123', email: 'test@test.com' }
      global.mockAuth.signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await result.current.login('test@test.com', 'password')

      expect(global.mockAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        global.mockAuth,
        'test@test.com',
        'password'
      )
    })

    it('should handle login errors', async () => {
      const error = new Error('Invalid credentials')
      global.mockAuth.signInWithEmailAndPassword.mockRejectedValue(error)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await expect(
        result.current.login('test@test.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials')
    })
  })

  describe('register', () => {
    it('should call createUserWithEmailAndPassword', async () => {
      const mockUser = { uid: '123', email: 'test@test.com' }
      global.mockAuth.createUserWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      })
      global.mockFirestore.doc.mockReturnValue({})
      global.mockFirestore.setDoc.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await result.current.register('test@test.com', 'password', 'Test Farm')

      expect(
        global.mockAuth.createUserWithEmailAndPassword
      ).toHaveBeenCalledWith(global.mockAuth, 'test@test.com', 'password')
    })

    it('should handle registration errors', async () => {
      const error = new Error('Email already in use')
      global.mockAuth.createUserWithEmailAndPassword.mockRejectedValue(error)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await expect(
        result.current.register('test@test.com', 'password')
      ).rejects.toThrow('Email already in use')
    })
  })

  describe('loginWithEmailLink', () => {
    it('should call sendSignInLinkToEmail', async () => {
      global.mockAuth.sendSignInLinkToEmail.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await result.current.loginWithEmailLink('test@test.com')

      expect(global.mockAuth.sendSignInLinkToEmail).toHaveBeenCalledWith(
        global.mockAuth,
        'test@test.com',
        expect.objectContaining({
          url: expect.stringContaining('/auth/complete'),
          handleCodeInApp: true
        })
      )
    })

    it('should store email in localStorage', async () => {
      global.mockAuth.sendSignInLinkToEmail.mockResolvedValue(undefined)
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem')

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await result.current.loginWithEmailLink('test@test.com')

      expect(setItemSpy).toHaveBeenCalledWith('emailForSignIn', 'test@test.com')
    })
  })

  describe('completeEmailLinkSignIn', () => {
    it('should call signInWithEmailLink', async () => {
      const mockUser = {
        uid: '123',
        email: 'test@test.com',
        metadata: {
          creationTime: '2023-01-01T00:00:00.000Z',
          lastSignInTime: '2023-01-02T00:00:00.000Z'
        }
      }
      global.mockAuth.signInWithEmailLink.mockResolvedValue({
        user: mockUser
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await result.current.completeEmailLinkSignIn(
        'test@test.com',
        'http://localhost:3000/auth/complete?apiKey=...'
      )

      expect(global.mockAuth.signInWithEmailLink).toHaveBeenCalledWith(
        global.mockAuth,
        'test@test.com',
        'http://localhost:3000/auth/complete?apiKey=...'
      )
    })

    it('should remove email from localStorage on success', async () => {
      const mockUser = {
        uid: '123',
        email: 'test@test.com',
        metadata: {
          creationTime: '2023-01-01T00:00:00Z',
          lastSignInTime: '2023-01-01T00:00:00Z'
        }
      }
      global.mockAuth.signInWithEmailLink.mockResolvedValue({
        user: mockUser
      })
      global.mockFirestore.doc.mockReturnValue({})
      global.mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          email: 'test@test.com',
          farmName: 'Test Farm',
          roles: ['farmer']
        })
      })

      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem')

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await result.current.completeEmailLinkSignIn(
        'test@test.com',
        'http://localhost:3000/auth/complete?apiKey=...'
      )

      expect(removeItemSpy).toHaveBeenCalledWith('emailForSignIn')
    })
  })

  describe('logout', () => {
    it('should call signOut', async () => {
      global.mockAuth.signOut.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await result.current.logout()

      expect(global.mockAuth.signOut).toHaveBeenCalledWith(global.mockAuth)
    })
  })

  describe('isEmailLinkSignIn', () => {
    it('should call Firebase isSignInWithEmailLink', () => {
      global.mockAuth.isSignInWithEmailLink.mockReturnValue(true)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      const isEmailLink = result.current.isEmailLinkSignIn(
        'http://localhost:3000/auth/complete?apiKey=...'
      )

      expect(global.mockAuth.isSignInWithEmailLink).toHaveBeenCalledWith(
        global.mockAuth,
        'http://localhost:3000/auth/complete?apiKey=...'
      )
      expect(isEmailLink).toBe(true)
    })
  })
})
