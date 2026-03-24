'use client'

import { signInWithCustomToken, signOut } from 'firebase/auth'
import { useDispatch, useSelector } from 'react-redux'
import {
  clearEmailLinkState,
  clearError,
  clearImpersonation,
  logout,
  setEmailLinkSent,
  setError,
  setImpersonating,
  setLoading,
} from '@/features/auth/authSlice'
import { serializeObj } from '@/features/libs/serializeObj'
import { RootState } from '@/features/store'
import { auth } from '@/lib/firebase'
import { User } from '@/types'

/**
 * Hook personalizado para el manejo de autenticación
 * Gestiona autenticación con Firebase y estado global con Redux
 * Usa código de 6 dígitos enviado por email (sin magic link)
 */
export const useAuth = () => {
  const dispatch = useDispatch()
  const {
    user,
    isLoading,
    error,
    emailLinkSent,
    emailForLink,
    impersonatingUser,
    impersonationToken,
    originalUser,
  } = useSelector((state: RootState) => state.auth)

  // Enviar código de autenticación por email
  // En desarrollo, retorna el código directamente (sin enviar email real)
  const sendCode = async (email: string): Promise<string | undefined> => {
    try {
      dispatch(setLoading(true))
      dispatch(clearError())

      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        dispatch(setError(data.error || 'Error enviando código'))
        dispatch(setLoading(false))
        return
      }

      // Reuse emailLinkSent state to indicate code was sent
      dispatch(setEmailLinkSent({ sent: true, email }))
      dispatch(setLoading(false))

      // En desarrollo, el API devuelve el código directamente
      return data.devCode
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error enviando código'
      dispatch(setError(errorMessage))
      dispatch(setLoading(false))
    }
  }

  // Verificar código e iniciar sesión
  const verifyCode = async (email: string, code: string) => {
    try {
      dispatch(setLoading(true))
      dispatch(clearError())

      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })

      const data = await res.json()

      if (!res.ok) {
        dispatch(setError(data.error || 'Error verificando código'))
        dispatch(setLoading(false))
        return false
      }

      // Sign in with the custom token from the server
      await signInWithCustomToken(auth, data.token)

      // AuthInitializer will handle setUser when it detects auth change
      dispatch(setLoading(false))
      return true
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error verificando código'
      dispatch(setError(errorMessage))
      dispatch(setLoading(false))
      return false
    }
  }

  // Cerrar sesión
  const handleLogout = async () => {
    try {
      await signOut(auth)
      dispatch(logout())
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cerrar sesión'
      dispatch(setError(errorMessage))
      throw error
    }
  }

  // Limpiar error
  const clearAuthError = () => {
    dispatch(clearError())
  }

  // Limpiar estado de email (volver al form)
  const clearEmailLink = () => {
    dispatch(clearEmailLinkState())
  }

  return {
    user,
    isLoading,
    error,
    emailLinkSent, // reused: now means "code was sent"
    emailForLink, // reused: the email the code was sent to
    impersonatingUser,
    originalUser,
    sendCode,
    verifyCode,
    logout: handleLogout,
    clearError: clearAuthError,
    clearEmailLink,
    // Funciones de impersonación
    getCurrentToken: () => impersonationToken || localStorage.getItem('token') || '',
    getCurrentUser: () => impersonatingUser || user,
    isImpersonating: !!impersonatingUser,
    startImpersonation: (originalUser: User, targetUser: User, token: string) => {
      localStorage.setItem('originalAdminUser', JSON.stringify(originalUser))
      localStorage.setItem('impersonationToken', token)

      dispatch(
        setImpersonating({
          originalUser: serializeObj(originalUser),
          impersonatedUser: serializeObj(targetUser),
          impersonationToken: token,
        }),
      )
    },
    stopImpersonation: () => {
      localStorage.removeItem('originalAdminUser')
      localStorage.removeItem('impersonationToken')

      dispatch(clearImpersonation())
    },
  }
}
