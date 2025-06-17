'use client'

import React, { createContext, useContext, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { setUser, setLoading, setError, logout } from '@/store/authSlice'
import { User } from '@/types'

interface AuthContextType {
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    farmName?: string
  ) => Promise<void>
  logout: () => Promise<void>
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
                createdAt: userData.createdAt?.toDate() || new Date()
              }
              dispatch(setUser(user))
            } else {
              // Si no existe el documento del usuario en Firestore, crearlo
              const user: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email!,
                createdAt: new Date()
              }

              await setDoc(doc(db, 'users', firebaseUser.uid), {
                email: firebaseUser.email,
                createdAt: new Date()
              })

              dispatch(setUser(user))
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

      // Crear documento del usuario en Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        email: firebaseUser.email,
        farmName: farmName || '',
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

  const value: AuthContextType = {
    login,
    register,
    logout: handleLogout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
