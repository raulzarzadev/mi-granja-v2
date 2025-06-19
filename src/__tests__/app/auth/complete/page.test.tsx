import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import CompletePage from '@/app/auth/complete/page'
import { authReducer } from '@/features/auth/authSlice'

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  auth: global.mockAuth,
  db: global.mockFirestore
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => global.mockRouter,
  useSearchParams: () => new URLSearchParams('?apiKey=test&oobCode=test')
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

const TestWrapper = ({
  children,
  store = createMockStore()
}: {
  children: React.ReactNode
  store?: ReturnType<typeof createMockStore>
}) => <Provider store={store}>{children}</Provider>

// Override global location for these tests
beforeEach(() => {
  // Clear any existing location mock
  delete (global as unknown as { location?: unknown }).location

  Object.defineProperty(global, 'location', {
    value: {
      href: 'http://localhost:3000/auth/complete?apiKey=test&oobCode=test',
      origin: 'http://localhost:3000',
      pathname: '/auth/complete',
      search: '?apiKey=test&oobCode=test',
      hash: ''
    },
    writable: true,
    configurable: true
  })
})

describe('CompletePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('test@test.com')
    global.mockAuth.isSignInWithEmailLink.mockReturnValue(true)
  })

  it('renders loading state initially', () => {
    render(
      <TestWrapper>
        <CompletePage />
      </TestWrapper>
    )

    expect(screen.getByText('Completando autenticación...')).toBeInTheDocument()
  })

  it('completes email link sign in with stored email', async () => {
    const mockUser = { uid: '123', email: 'test@test.com' }
    global.mockAuth.signInWithEmailLink.mockResolvedValue({
      user: mockUser
    })
    global.mockFirestore.doc.mockReturnValue({})
    global.mockFirestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ email: 'test@test.com', farmName: 'Test Farm' })
    })

    render(
      <TestWrapper>
        <CompletePage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(global.mockAuth.signInWithEmailLink).toHaveBeenCalledWith(
        global.mockAuth,
        'test@test.com',
        'http://localhost:3000/auth/complete?apiKey=test&oobCode=test'
      )
    })

    await waitFor(() => {
      expect(global.mockRouter.push).toHaveBeenCalledWith('/')
    })
  })

  it('prompts for email when not stored', async () => {
    // localStorage is reset globally

    render(
      <TestWrapper>
        <CompletePage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Confirma tu email')).toBeInTheDocument()
      expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Completar autenticación' })
      ).toBeInTheDocument()
    })
  })

  it('shows error when not a valid email link', async () => {
    global.mockAuth.isSignInWithEmailLink.mockReturnValue(false)

    render(
      <TestWrapper>
        <CompletePage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(
        screen.getByText(
          'El enlace de autenticación no es válido o ha expirado.'
        )
      ).toBeInTheDocument()
    })
  })

  it('handles sign in errors', async () => {
    global.mockAuth.signInWithEmailLink.mockRejectedValue(
      new Error('Invalid email link')
    )

    render(
      <TestWrapper>
        <CompletePage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(
        screen.getByText(/Error al completar la autenticación/)
      ).toBeInTheDocument()
    })
  })

  it('provides link to return to login', async () => {
    global.mockAuth.isSignInWithEmailLink.mockReturnValue(false)

    render(
      <TestWrapper>
        <CompletePage />
      </TestWrapper>
    )

    await waitFor(() => {
      const loginLink = screen.getByText('Volver al login')
      expect(loginLink).toBeInTheDocument()
      expect(loginLink.closest('a')).toHaveAttribute('href', '/auth')
    })
  })
})
