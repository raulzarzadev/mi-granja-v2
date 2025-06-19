import { renderHook } from '@testing-library/react'
import { useAuth } from '@/features/auth/AuthContext'
import { renderWithProviders } from '../../test-utils'

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  auth: global.mockAuth,
  db: global.mockFirestore
}))

const createWrapper = () => {
  const { container } = renderWithProviders(<div />)
  return ({ children }: { children: React.ReactNode }) => {
    return renderWithProviders(<>{children}</>).container.firstChild as any
  }
}

describe('AuthContext Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Firebase Auth Errors', () => {
    it('should handle invalid email error', async () => {
      const error = new Error('Invalid email')
      Object.assign(error, { code: 'auth/invalid-email' })
      global.mockAuth.signInWithEmailAndPassword.mockRejectedValue(error)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await expect(
        result.current.login('invalid-email', 'password')
      ).rejects.toThrow('Invalid email')
    })

    it('should handle user not found error', async () => {
      const error = new Error('User not found')
      Object.assign(error, { code: 'auth/user-not-found' })
      global.mockAuth.signInWithEmailAndPassword.mockRejectedValue(error)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await expect(
        result.current.login('nonexistent@test.com', 'password')
      ).rejects.toThrow('User not found')
    })

    it('should handle wrong password error', async () => {
      const error = new Error('Wrong password')
      Object.assign(error, { code: 'auth/wrong-password' })
      global.mockAuth.signInWithEmailAndPassword.mockRejectedValue(error)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await expect(
        result.current.login('test@test.com', 'wrongpassword')
      ).rejects.toThrow('Wrong password')
    })

    it('should handle email already in use error', async () => {
      const error = new Error('Email already in use')
      Object.assign(error, { code: 'auth/email-already-in-use' })
      global.mockAuth.createUserWithEmailAndPassword.mockRejectedValue(error)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await expect(
        result.current.register('existing@test.com', 'password')
      ).rejects.toThrow('Email already in use')
    })

    it('should handle weak password error', async () => {
      const error = new Error('Password too weak')
      Object.assign(error, { code: 'auth/weak-password' })
      global.mockAuth.createUserWithEmailAndPassword.mockRejectedValue(error)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await expect(
        result.current.register('test@test.com', '123')
      ).rejects.toThrow('Password too weak')
    })

    it('should handle invalid action code error for email link', async () => {
      const error = new Error('Invalid action code')
      Object.assign(error, { code: 'auth/invalid-action-code' })
      global.mockAuth.signInWithEmailLink.mockRejectedValue(error)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await expect(
        result.current.completeEmailLinkSignIn('test@test.com', 'invalid-link')
      ).rejects.toThrow('Invalid action code')
    })

    it('should handle expired action code error for email link', async () => {
      const error = new Error('Expired action code')
      Object.assign(error, { code: 'auth/expired-action-code' })
      global.mockAuth.signInWithEmailLink.mockRejectedValue(error)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await expect(
        result.current.completeEmailLinkSignIn('test@test.com', 'expired-link')
      ).rejects.toThrow('Expired action code')
    })
  })

  describe('Network Errors', () => {
    it('should handle network timeout', async () => {
      const error = new Error('Network error')
      Object.assign(error, { code: 'auth/network-request-failed' })
      global.mockAuth.signInWithEmailAndPassword.mockRejectedValue(error)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await expect(
        result.current.login('test@test.com', 'password')
      ).rejects.toThrow('Network error')
    })

    it('should handle quota exceeded', async () => {
      const error = new Error('Quota exceeded')
      Object.assign(error, { code: 'auth/quota-exceeded' })
      global.mockAuth.sendSignInLinkToEmail.mockRejectedValue(error)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await expect(
        result.current.loginWithEmailLink('test@test.com')
      ).rejects.toThrow('Quota exceeded')
    })
  })
})
