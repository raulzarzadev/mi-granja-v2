'use client'

import React, { useEffect } from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { RootState, store } from '@/features/store'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { setUser } from '@/features/auth/authSlice'
import { serializeObj } from '@/features/libs/serializeObj'
import { doc, getDoc } from 'firebase/firestore'
import { User } from '@/types'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'

interface ProvidersProps {
  children: React.ReactNode
}

const AuthInitializer: React.FC<ProvidersProps> = ({ children }) => {
  const dispatch = useDispatch()

  //* ==================================== AUTH INITIALIZER
  const user = useSelector((state: RootState) => state.auth.user)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userFound = await getDoc(doc(db, 'users', firebaseUser.uid))
          const userData = userFound.data() as User
          const serializedUser = serializeObj({
            ...userData,
            id: firebaseUser.uid
          })
          dispatch(setUser(serializedUser))
        } catch (error) {
          console.error('Error loading user data:', error)
        }
      } else {
        dispatch(setUser(null))
      }
    })
    return unsubscribe
  }, [dispatch])

  //* ==================================== FARM INITIALIZER
  const { loadUserFarms } = useFarmCRUD()
  useEffect(() => {
    if (user) {
      loadUserFarms()
    }
  }, [user])

  //* ==================================== FARM ANIMALS INITIALIZER
  const { getUserAnimals } = useAnimalCRUD()
  const currentFarm = useSelector((state: RootState) => state.farm.currentFarm)
  useEffect(() => {
    if (user) {
      getUserAnimals()
    }
    // también cuando cambia la granja actual
  }, [user, currentFarm?.id])

  return <>{children}</>
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <Provider store={store}>
      <AuthInitializer>{children}</AuthInitializer>
    </Provider>
  )
}
