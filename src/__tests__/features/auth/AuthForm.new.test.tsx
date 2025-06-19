import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import AuthForm from '@/features/auth/AuthForm'
import { AuthProvider } from '@/features/auth/AuthContext'
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

const TestWrapper = ({
  children,
  store = createMockStore()
}: {
  children: React.ReactNode
  store?: ReturnType<typeof createMockStore>
}) => (
  <Provider store={store}>
    <AuthProvider>{children}</AuthProvider>
  </Provider>
)

describe('AuthForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders login form with email link by default', () => {
    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    )

    expect(screen.getByText('Mi Granja')).toBeInTheDocument()
    expect(screen.getByText('Inicia sesión en tu cuenta')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument()
    expect(
      screen.getByText('Enlace por email (recomendado)')
    ).toBeInTheDocument()
    expect(screen.getByText('Con contraseña')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Enviar enlace por email' })
    ).toBeInTheDocument()
  })

  it('switches to password mode when clicked', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    )

    await user.click(screen.getByText('Con contraseña'))

    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Iniciar sesión' })
    ).toBeInTheDocument()
  })

  it('switches to register form', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    )

    await user.click(screen.getByText('¿No tienes cuenta? Regístrate'))

    expect(screen.getByText('Crea tu cuenta de granjero')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Nombre de tu granja (opcional)')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Crear cuenta' })
    ).toBeInTheDocument()
  })

  it('shows email validation error', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    )

    const submitButton = screen.getByRole('button', {
      name: 'Enviar enlace por email'
    })

    // Intentar enviar sin email debe mostrar validación
    await user.click(submitButton)

    // Como usa HTML5 validation, verificamos que el form no se haya enviado
    expect(global.mockAuth.sendSignInLinkToEmail).not.toHaveBeenCalled()
  })

  it('calls loginWithEmailLink in email link mode', async () => {
    const user = userEvent.setup()
    global.mockAuth.sendSignInLinkToEmail.mockResolvedValue(undefined)

    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    )

    const emailInput = screen.getByLabelText('Correo electrónico')
    await user.type(emailInput, 'test@test.com')

    const submitButton = screen.getByRole('button', {
      name: 'Enviar enlace por email'
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(global.mockAuth.sendSignInLinkToEmail).toHaveBeenCalledWith(
        global.mockAuth,
        'test@test.com',
        expect.objectContaining({
          url: expect.stringContaining('localhost'),
          handleCodeInApp: true
        })
      )
    })
  })

  it('calls login in password mode', async () => {
    const user = userEvent.setup()
    global.mockAuth.signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: '123', email: 'test@test.com' }
    })

    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    )

    // Switch to password mode
    await user.click(screen.getByText('Con contraseña'))

    const emailInput = screen.getByLabelText('Correo electrónico')
    const passwordInput = screen.getByLabelText('Contraseña')
    await user.type(emailInput, 'test@test.com')
    await user.type(passwordInput, 'password123')

    const submitButton = screen.getByRole('button', {
      name: 'Iniciar sesión'
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(global.mockAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        global.mockAuth,
        'test@test.com',
        'password123'
      )
    })
  })

  it('shows success message after email link sent', async () => {
    const user = userEvent.setup()
    global.mockAuth.sendSignInLinkToEmail.mockResolvedValue(undefined)

    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    )

    const emailInput = screen.getByLabelText('Correo electrónico')
    await user.type(emailInput, 'test@test.com')

    const submitButton = screen.getByRole('button', {
      name: 'Enviar enlace por email'
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Enlace enviado/)).toBeInTheDocument()
      expect(screen.getByText(/Revisa tu email/)).toBeInTheDocument()
    })
  })

  it('handles authentication errors', async () => {
    const user = userEvent.setup()
    const error = new Error('Invalid credentials')
    global.mockAuth.signInWithEmailAndPassword.mockRejectedValue(error)

    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    )

    // Switch to password mode
    await user.click(screen.getByText('Con contraseña'))

    const emailInput = screen.getByLabelText('Correo electrónico')
    const passwordInput = screen.getByLabelText('Contraseña')

    await user.type(emailInput, 'test@test.com')
    await user.type(passwordInput, 'wrongpassword')

    const submitButton = screen.getByRole('button', {
      name: 'Iniciar sesión'
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials|Error/)).toBeInTheDocument()
    })
  })
})
