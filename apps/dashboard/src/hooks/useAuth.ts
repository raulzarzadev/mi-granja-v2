'use client'

import {
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signOut,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
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
import { auth, db } from '@/lib/firebase'
import { assignUserRoles } from '@/lib/userUtils'
import { User } from '@/types'

/**
 * Hook personalizado para el manejo de autenticación
 * Gestiona autenticación con Firebase y estado global con Redux
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

  // Listener de autenticación - Ya no es necesario aquí porque está en AuthInitializer
  // El AuthInitializer se encarga del listener de onAuthStateChanged

  // Iniciar sesión con email y contraseña
  const login = async (email: string, password: string) => {
    try {
      dispatch(setLoading(true))
      await signInWithEmailAndPassword(auth, email, password)
      // El AuthInitializer se encargará de setUser y setLoading(false) cuando detecte el cambio de auth
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión'
      dispatch(setError(errorMessage))
      dispatch(setLoading(false))
      throw error
    }
  }

  // Registrar nuevo usuario
  const register = async (email: string, password: string, farmName?: string) => {
    try {
      dispatch(setLoading(true))
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password)

      // Crear el objeto usuario para asignar roles
      const user: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        farmName: farmName || '',
        roles: [], // Se asignarán automáticamente
        createdAt: new Date(),
      }

      // Asignar roles automáticamente
      const userWithRoles = assignUserRoles(user)

      // Crear documento del usuario en Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        email: firebaseUser.email,
        farmName: farmName || '',
        roles: userWithRoles.roles,
        createdAt: new Date(),
      })

      // El AuthInitializer se encargará de setUser y setLoading(false) cuando detecte el cambio de auth
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al registrar usuario'
      dispatch(setError(errorMessage))
      dispatch(setLoading(false))
      throw error
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

  // Configuración para envío de enlaces de autenticación
  const actionCodeSettings = {
    url:
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000') +
      '/auth/complete',
    handleCodeInApp: true,
  }

  // Enviar enlace de autenticación por email
  const loginWithEmailLink = async (email: string) => {
    try {
      dispatch(setLoading(true))
      dispatch(clearError())

      console.log('Sending email link to:', email)

      // Marcar como enviado ANTES de intentar enviar
      // Esto asegura que se muestre la UI de "revisa tu email" incluso si hay errores
      dispatch(setEmailLinkSent({ sent: true, email }))

      await sendSignInLinkToEmail(auth, email, actionCodeSettings)

      // Guardar el email en localStorage para completar el sign-in
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('emailForSignIn', email)
        console.log('Email saved to localStorage:', email)

        // Verificar inmediatamente que se guardó
        const savedEmail = window.localStorage.getItem('emailForSignIn')
        console.log('Verification - Email retrieved from localStorage:', savedEmail)

        if (savedEmail !== email) {
          console.error('Failed to save email to localStorage!')
        }
      }

      dispatch(setLoading(false))
      console.log('Email link sent successfully')
    } catch (error: unknown) {
      console.error('Error sending email link:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Error al enviar enlace de autenticación'

      // Mantener emailLinkSent como true incluso si hay error
      // Solo marcar el error y quitar loading
      dispatch(setError(errorMessage))
      dispatch(setLoading(false))

      // NO hacer throw del error para que el componente no entre en catch
      // throw error
    }
  }

  // Completar autenticación con enlace de email
  const completeEmailLinkSignIn = async (email: string, url: string) => {
    try {
      dispatch(setLoading(true))
      dispatch(clearError()) // Limpiar errores anteriores

      console.log('Completing email link sign in for:', email)
      const result = await signInWithEmailLink(auth, email, url)
      console.log('Sign in successful:', result.user.uid)

      // Limpiar el email del localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('emailForSignIn')
      }

      // Si es un nuevo usuario, crear documento en Firestore
      if (result.user.metadata.creationTime === result.user.metadata.lastSignInTime) {
        console.log('New user detected, creating Firestore document')

        // Crear el objeto usuario para asignar roles
        const user: User = {
          id: result.user.uid,
          email: result.user.email!,
          roles: [], // Se asignarán automáticamente
          createdAt: new Date(),
        }

        // Asignar roles automáticamente
        const userWithRoles = assignUserRoles(user)

        await setDoc(doc(db, 'users', result.user.uid), {
          email: result.user.email,
          roles: userWithRoles.roles,
          createdAt: new Date(),
        })

        console.log('User document created successfully')
      }

      // El AuthInitializer se encargará de setUser cuando detecte el cambio de auth
      // Pero podemos despachar setLoading(false) ya que la operación completó
      dispatch(setLoading(false))
      console.log('Email link sign in completed successfully')
    } catch (error: unknown) {
      console.error('Error completing email link sign in:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Error al completar autenticación'
      dispatch(setError(errorMessage))
      dispatch(setLoading(false))
      throw error
    }
  }

  // Verificar si la URL es un enlace de autenticación
  const isEmailLinkSignIn = (url: string) => {
    return isSignInWithEmailLink(auth, url)
  }

  // Limpiar error
  const clearAuthError = () => {
    dispatch(clearError())
  }

  // Limpiar estado de email link
  const clearEmailLink = () => {
    dispatch(clearEmailLinkState())
  }

  return {
    user,
    isLoading,
    error,
    emailLinkSent,
    emailForLink,
    impersonatingUser,
    originalUser,
    login,
    register,
    logout: handleLogout,
    loginWithEmailLink,
    completeEmailLinkSignIn,
    isEmailLinkSignIn,
    clearError: clearAuthError,
    clearEmailLink,
    // Funciones de impersonación
    getCurrentToken: () => impersonationToken || localStorage.getItem('token') || '',
    getCurrentUser: () => impersonatingUser || user,
    isImpersonating: !!impersonatingUser,
    startImpersonation: (originalUser: User, targetUser: User, token: string) => {
      // Guardar el usuario admin original en localStorage para tracking
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
      // Limpiar datos de impersonación
      localStorage.removeItem('originalAdminUser')
      localStorage.removeItem('impersonationToken')

      dispatch(clearImpersonation())
    },
  }
}
