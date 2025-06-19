'use client'

import { useDispatch, useSelector } from 'react-redux'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth'
import { setDoc, doc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import {
  setLoading,
  setError,
  logout,
  clearError
} from '@/features/auth/authSlice'
import { User } from '@/types'
import { assignUserRoles } from '@/lib/userUtils'
import { RootState } from '@/features/store'

/**
 * Hook personalizado para el manejo de autenticación
 * Gestiona autenticación con Firebase y estado global con Redux
 */
export const useAuth = () => {
  const dispatch = useDispatch()
  const { user, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  )

  // Listener de autenticación - Ya no es necesario aquí porque está en AuthInitializer
  // El AuthInitializer se encarga del listener de onAuthStateChanged

  // Iniciar sesión con email y contraseña
  const login = async (email: string, password: string) => {
    try {
      dispatch(setLoading(true))
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al iniciar sesión'
      dispatch(setError(errorMessage))
      throw error
    }
  }

  // Registrar nuevo usuario
  const register = async (
    email: string,
    password: string,
    farmName?: string
  ) => {
    try {
      dispatch(setLoading(true))
      const { user: firebaseUser } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      )

      // Crear el objeto usuario para asignar roles
      const user: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        farmName: farmName || '',
        roles: [], // Se asignarán automáticamente
        createdAt: new Date()
      }

      // Asignar roles automáticamente
      const userWithRoles = assignUserRoles(user)

      // Crear documento del usuario en Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        email: firebaseUser.email,
        farmName: farmName || '',
        roles: userWithRoles.roles,
        createdAt: new Date()
      })
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al registrar usuario'
      dispatch(setError(errorMessage))
      throw error
    }
  }

  // Cerrar sesión
  const handleLogout = async () => {
    try {
      await signOut(auth)
      dispatch(logout())
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al cerrar sesión'
      dispatch(setError(errorMessage))
      throw error
    }
  }

  // Configuración para envío de enlaces de autenticación
  const actionCodeSettings = {
    url:
      (typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:3000') + '/auth/complete',
    handleCodeInApp: true
  }

  // Enviar enlace de autenticación por email
  const loginWithEmailLink = async (email: string) => {
    try {
      dispatch(setLoading(true))
      await sendSignInLinkToEmail(auth, email, actionCodeSettings)

      // Guardar el email en localStorage para completar el sign-in
      window.localStorage.setItem('emailForSignIn', email)

      // No dispatch setLoading(false) aquí porque el proceso no ha terminado
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error al enviar enlace de autenticación'
      dispatch(setError(errorMessage))
      dispatch(setLoading(false))
      throw error
    }
  }

  // Completar autenticación con enlace de email
  const completeEmailLinkSignIn = async (email: string, url: string) => {
    try {
      dispatch(setLoading(true))
      const result = await signInWithEmailLink(auth, email, url)

      // Limpiar el email del localStorage
      window.localStorage.removeItem('emailForSignIn')

      // Si es un nuevo usuario, crear documento en Firestore
      if (
        result.user.metadata.creationTime ===
        result.user.metadata.lastSignInTime
      ) {
        // Crear el objeto usuario para asignar roles
        const user: User = {
          id: result.user.uid,
          email: result.user.email!,
          roles: [], // Se asignarán automáticamente
          createdAt: new Date()
        }

        // Asignar roles automáticamente
        const userWithRoles = assignUserRoles(user)

        await setDoc(doc(db, 'users', result.user.uid), {
          email: result.user.email,
          roles: userWithRoles.roles,
          createdAt: new Date()
        })
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error al completar autenticación'
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

  return {
    user,
    isLoading,
    error,
    login,
    register,
    logout: handleLogout,
    loginWithEmailLink,
    completeEmailLinkSignIn,
    isEmailLinkSignIn,
    clearError: clearAuthError
  }
}
