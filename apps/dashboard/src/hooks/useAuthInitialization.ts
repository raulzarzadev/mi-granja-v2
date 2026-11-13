'use client'

import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { setUser } from '@/features/auth/authSlice'
import { serializeObj } from '@/features/libs/serializeObj'
import { auth, db } from '@/lib/firebase'
import type { User } from '@/types'

export function useAuthInitialization() {
  const dispatch = useDispatch()
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    let revision = 0
    let timer: ReturnType<typeof setTimeout>
    const armTimeout = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (active)
          setError(
            'La sesión está tardando demasiado en cargar. Comprueba tu conexión e intenta de nuevo.',
          )
      }, 15000)
    }
    armTimeout()
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        const currentRevision = ++revision
        if (!active) return
        setError(null)
        if (!firebaseUser) {
          clearTimeout(timer)
          dispatch(setUser(null))
          return
        }
        armTimeout()
        try {
          const found = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (!active || revision !== currentRevision) return
          const profile = found.exists() ? (found.data() as User) : ({} as User)
          dispatch(
            setUser(
              serializeObj({
                ...profile,
                id: firebaseUser.uid,
                email: profile.email || firebaseUser.email || '',
              }),
            ),
          )
          setError(null)
        } catch (cause) {
          if (!active || revision !== currentRevision) return
          console.error('Error loading user data:', cause)
          setError('No se pudo cargar tu perfil. Comprueba tu conexión e intenta de nuevo.')
        } finally {
          if (active && revision === currentRevision) clearTimeout(timer)
        }
      },
      (cause) => {
        if (!active) return
        ++revision
        clearTimeout(timer)
        console.error('Error restoring auth session:', cause)
        setError('No se pudo comprobar tu sesión. Intenta de nuevo.')
      },
    )
    return () => {
      active = false
      ++revision
      clearTimeout(timer)
      unsubscribe()
    }
  }, [dispatch])
  return error
}
