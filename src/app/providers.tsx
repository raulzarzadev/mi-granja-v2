'use client'

import React, { useEffect } from 'react'
import { Provider, useDispatch } from 'react-redux'
import { store } from '@/features/store'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { setUser } from '@/features/auth/authSlice'
import { serializeObj } from '@/features/libs/serializeObj'

import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { setAnimals } from '@/features/animals/animalsSlice'
import { useBreeding } from '@/hooks/useBreeding'

interface ProvidersProps {
  children: React.ReactNode
}

const AuthInitializer: React.FC<ProvidersProps> = ({ children }) => {
  const { getUserAnimals } = useAnimalCRUD()
  const dispatch = useDispatch()
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const serializedUser = serializeObj({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          farmName: '',
          roles: [],
          createdAt: new Date()
        })
        dispatch(setUser(serializedUser))
      } else {
        dispatch(setUser(null))
      }
    })
    return unsubscribe
  }, [dispatch])

  useEffect(() => {
    getUserAnimals()
      .then((animals) => {
        dispatch(setAnimals(serializeObj(animals)))
      })
      .catch((error) => {
        console.error('Error fetching user animals:', error)
      })
  }, [dispatch, getUserAnimals])

  // Initialize breeding records
  // This will trigger the useBreeding hook to fetch breeding records
  useBreeding()

  return <>{children}</>
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <Provider store={store}>
      <AuthInitializer>{children}</AuthInitializer>
    </Provider>
  )
}
