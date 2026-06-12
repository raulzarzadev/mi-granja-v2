'use client'

import { GoogleAuthProvider, signInWithCustomToken, signInWithPopup, signOut } from 'firebase/auth'
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
  setUser,
} from '@/features/auth/authSlice'
import { serializeObj } from '@/features/libs/serializeObj'
import { RootState } from '@/features/store'
import { trackLoginCompleted, trackLogout } from '@/lib/analytics/track'
import { auth } from '@/lib/firebase'
import { User } from '@/types'

const getGoogleLoginErrorMessage = (error: unknown) => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : ''

  if (code === 'auth/popup-closed-by-user') return 'Inicio con Google cancelado.'
  if (code === 'auth/popup-blocked') {
    return 'El navegador bloqueó la ventana de Google. Permite popups e intenta de nuevo.'
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'Ya existe una cuenta con ese correo usando otro método de acceso.'
  }

  return error instanceof Error ? error.message : 'Error iniciando sesión con Google'
}

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
      trackLoginCompleted('email')

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

  const loginWithGoogle = async () => {
    try {
      dispatch(setLoading(true))
      dispatch(clearError())

      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })

      const result = await signInWithPopup(auth, provider)
      const token = await result.user.getIdToken()

      const res = await fetch('/api/auth/ensure-user', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await res.json()

      if (!res.ok) {
        await signOut(auth)
        dispatch(setError(data.error || 'Error preparando tu cuenta de Google'))
        dispatch(setLoading(false))
        return false
      }

      trackLoginCompleted('google')
      dispatch(clearEmailLinkState())
      dispatch(setUser(data.user))
      dispatch(setLoading(false))
      return true
    } catch (error: unknown) {
      dispatch(setError(getGoogleLoginErrorMessage(error)))
      dispatch(setLoading(false))
      return false
    }
  }

  // Cerrar sesión
  const handleLogout = async () => {
    try {
      trackLogout()
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
    loginWithGoogle,
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
