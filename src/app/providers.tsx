'use client'

import React, { useEffect } from 'react'
import { Provider, useDispatch } from 'react-redux'
import { store } from '@/features/store'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { setUser } from '@/features/auth/authSlice'

interface ProvidersProps {
  children: React.ReactNode
}

const AuthInitializer: React.FC<ProvidersProps> = ({ children }) => {
  const dispatch = useDispatch()
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        dispatch(
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            farmName: '',
            roles: [],
            createdAt: new Date()
          })
        )
      } else {
        dispatch(setUser(null))
      }
    })
    return unsubscribe
  }, [dispatch])

  return <>{children}</>
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <Provider store={store}>
      <AuthInitializer>
        {children}
      </AuthInitializer>
    </Provider>
  )
}
