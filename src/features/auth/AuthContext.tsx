'use client'

import React, { createContext, useContext, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  User as FirebaseUser
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { setUser, setLoading, setError, logout } from '@/store/authSlice'
import { User } from '@/types'
import { assignUserRoles } from '@/lib/userUtils'

interface AuthContextType {
  login: (email: string, password: string) => Promise<void>
  loginWithEmailLink: (email: string) => Promise<void>
  completeEmailLinkSignIn: (email: string, url: string) => Promise<void>
  register: (
    email: string,
    password: string,
    farmName?: string
  ) => Promise<void>
  logout: () => Promise<void>
  isEmailLinkSignIn: (url: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(setLoading(true))

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          try {
            // Obtener datos adicionales del usuario desde Firestore
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))

            if (userDoc.exists()) {
              const userData = userDoc.data()
              const user: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email!,
                name: userData.name,
                farmName: userData.farmName,
                roles: userData.roles || [], // Si ya tiene roles asignados, los respetamos
                createdAt: userData.createdAt?.toDate() || new Date()
              }
              // Asignar roles si no los tiene
              const userWithRole = assignUserRoles(user)
              dispatch(setUser(userWithRole))
            } else {
              // Si no existe el documento del usuario en Firestore, crearlo
              const user: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email!,
                roles: [], // Se asignarán automáticamente
                createdAt: new Date()
              }

              // Asignar rol automáticamente
              const userWithRole = assignUserRoles(user)

              await setDoc(doc(db, 'users', firebaseUser.uid), {
                email: firebaseUser.email,
                roles: userWithRole.roles,
                createdAt: new Date()
              })

              dispatch(setUser(userWithRole))
            }
          } catch (error) {
            console.error('Error fetching user data:', error)
            dispatch(setError('Error al cargar los datos del usuario'))
          }
        } else {
          dispatch(setUser(null))
        }
        dispatch(setLoading(false))
      }
    )

    return () => unsubscribe()
  }, [dispatch])

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

  const value: AuthContextType = {
    login,
    register,
    logout: handleLogout,
    loginWithEmailLink,
    completeEmailLinkSignIn,
    isEmailLinkSignIn
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
