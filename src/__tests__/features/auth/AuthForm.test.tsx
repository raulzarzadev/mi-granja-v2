import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

  it('renders login form by default', () => {
    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    )

    expect(screen.getByText('Mi Granja')).toBeInTheDocument()
    expect(screen.getByText('Inicia sesión en tu cuenta')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument()
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

    expect(screen.getByText('Mi Granja')).toBeInTheDocument()
    expect(screen.getByText('Crea tu cuenta de granjero')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Nombre de tu granja (opcional)')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Crear cuenta' })
    ).toBeInTheDocument()
  })

  it('switches authentication method to email link', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <AuthForm />
      </TestWrapper>
    )

    await user.click(screen.getByText('Enlace por email'))

    // El título permanece igual, pero cambia el botón
    expect(screen.getByText('Mi Granja')).toBeInTheDocument()
    expect(screen.getByText('Inicia sesión en tu cuenta')).toBeInTheDocument()
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Enviar enlace por email' })
    ).toBeInTheDocument()
  })

  describe('Form validation', () => {
    it('shows email validation error', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AuthForm />
        </TestWrapper>
      )

      const submitButton = screen.getByRole('button', {
        name: 'Iniciar sesión'
      })
      await user.click(submitButton)

      expect(screen.getByText('El email es requerido')).toBeInTheDocument()
    })

    it('shows invalid email format error', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AuthForm />
        </TestWrapper>
      )

      const emailInput = screen.getByLabelText('Correo electrónico')
      await user.type(emailInput, 'invalid-email')

      const submitButton = screen.getByRole('button', {
        name: 'Iniciar sesión'
      })
      await user.click(submitButton)

      expect(screen.getByText('El email no es válido')).toBeInTheDocument()
    })

    it('shows password validation errors', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AuthForm />
        </TestWrapper>
      )

      const emailInput = screen.getByLabelText('Correo electrónico')
      await user.type(emailInput, 'test@test.com')

      const submitButton = screen.getByRole('button', {
        name: 'Iniciar sesión'
      })
      await user.click(submitButton)

      expect(screen.getByText('La contraseña es requerida')).toBeInTheDocument()
    })

    it('shows password length validation', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AuthForm />
        </TestWrapper>
      )

      const emailInput = screen.getByLabelText('Correo electrónico')
      const passwordInput = screen.getByLabelText('Contraseña')

      await user.type(emailInput, 'test@test.com')
      await user.type(passwordInput, '123')

      const submitButton = screen.getByRole('button', {
        name: 'Iniciar sesión'
      })
      await user.click(submitButton)

      expect(
        screen.getByText('La contraseña debe tener al menos 6 caracteres')
      ).toBeInTheDocument()
    })

    it('shows password confirmation validation in register mode', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AuthForm />
        </TestWrapper>
      )

      // Switch to register
      await user.click(screen.getByText('¿No tienes cuenta? Regístrate'))

      const emailInput = screen.getByLabelText('Correo electrónico')
      const passwordInput = screen.getByLabelText('Contraseña')
      const confirmPasswordInput = screen.getByLabelText('Confirmar contraseña')

      await user.type(emailInput, 'test@test.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'different')

      const submitButton = screen.getByRole('button', { name: 'Crear cuenta' })
      await user.click(submitButton)

      expect(
        screen.getByText('Las contraseñas no coinciden')
      ).toBeInTheDocument()
    })
  })

  describe('Authentication actions', () => {
    it('calls login function on form submit', async () => {
      const user = userEvent.setup()
      global.mockAuth.signInWithEmailAndPassword.mockResolvedValue({
        user: { uid: '123', email: 'test@test.com' }
      })

      render(
        <TestWrapper>
          <AuthForm />
        </TestWrapper>
      )

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

    it('calls register function in register mode', async () => {
      const user = userEvent.setup()
      global.mockAuth.createUserWithEmailAndPassword.mockResolvedValue({
        user: { uid: '123', email: 'test@test.com' }
      })
      global.mockFirestore.doc.mockReturnValue({})
      global.mockFirestore.setDoc.mockResolvedValue(undefined)

      render(
        <TestWrapper>
          <AuthForm />
        </TestWrapper>
      )

      // Switch to register
      await user.click(screen.getByText('¿No tienes cuenta? Regístrate'))

      const emailInput = screen.getByLabelText('Correo electrónico')
      const passwordInput = screen.getByLabelText('Contraseña')
      const confirmPasswordInput = screen.getByLabelText('Confirmar contraseña')
      const farmNameInput = screen.getByLabelText(
        'Nombre de tu granja (opcional)'
      )

      await user.type(emailInput, 'test@test.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.type(farmNameInput, 'Test Farm')

      const submitButton = screen.getByRole('button', { name: 'Crear cuenta' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          global.mockAuth.createUserWithEmailAndPassword
        ).toHaveBeenCalledWith(global.mockAuth, 'test@test.com', 'password123')
      })
    })

    it('calls loginWithEmailLink in email link mode', async () => {
      const user = userEvent.setup()
      global.mockAuth.sendSignInLinkToEmail.mockResolvedValue(undefined)

      render(
        <TestWrapper>
          <AuthForm />
        </TestWrapper>
      )

      // Switch to email link
      await user.click(screen.getByText('Enlace por email'))

      const emailInput = screen.getByLabelText('Correo electrónico')
      await user.type(emailInput, 'test@test.com')

      const submitButton = screen.getByRole('button', { name: 'Enviar enlace' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(global.mockAuth.sendSignInLinkToEmail).toHaveBeenCalledWith(
          global.mockAuth,
          'test@test.com',
          expect.objectContaining({
            url: expect.stringContaining('localhost:3000/auth/complete'),
            handleCodeInApp: true
          })
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

      // Switch to email link
      await user.click(screen.getByText('Enlace por email'))

      const emailInput = screen.getByLabelText('Correo electrónico')
      await user.type(emailInput, 'test@test.com')

      const submitButton = screen.getByRole('button', { name: 'Enviar enlace' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Enlace enviado/)).toBeInTheDocument()
        expect(screen.getByText(/Revisa tu email/)).toBeInTheDocument()
      })
    })

    it('allows resending email link', async () => {
      const user = userEvent.setup()
      global.mockAuth.sendSignInLinkToEmail.mockResolvedValue(undefined)

      render(
        <TestWrapper>
          <AuthForm />
        </TestWrapper>
      )

      // Switch to email link and send
      await user.click(screen.getByText('Enlace por email'))

      const emailInput = screen.getByLabelText('Correo electrónico')
      await user.type(emailInput, 'test@test.com')

      const submitButton = screen.getByRole('button', { name: 'Enviar enlace' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Enlace enviado/)).toBeInTheDocument()
      })

      // Click resend
      const resendButton = screen.getByText('Reenviar enlace')
      await user.click(resendButton)

      await waitFor(() => {
        expect(global.mockAuth.sendSignInLinkToEmail).toHaveBeenCalledTimes(2)
      })
    })

    it('handles authentication errors', async () => {
      const user = userEvent.setup()
      global.mockAuth.signInWithEmailAndPassword.mockRejectedValue(
        new Error('Invalid credentials')
      )

      render(
        <TestWrapper>
          <AuthForm />
        </TestWrapper>
      )

      const emailInput = screen.getByLabelText('Correo electrónico')
      const passwordInput = screen.getByLabelText('Contraseña')

      await user.type(emailInput, 'test@test.com')
      await user.type(passwordInput, 'wrongpassword')

      const submitButton = screen.getByRole('button', {
        name: 'Iniciar sesión'
      })
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(
            'Error en la autenticación. Verifica tus credenciales.'
          )
        ).toBeInTheDocument()
      })
    })
  })
})
