'use client'

import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import React, { useEffect } from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { setUser } from '@/features/auth/authSlice'
import { serializeObj } from '@/features/libs/serializeObj'
import { RootState, store } from '@/features/store'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { auth, db } from '@/lib/firebase'
import { User } from '@/types'

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
          const userData = userFound.exists() ? (userFound.data() as User) : ({} as User)
          const serializedUser = serializeObj({
            ...userData,
            id: firebaseUser.uid,
            email: userData?.email || firebaseUser.email || '',
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
  const { getFarmAnimals } = useAnimalCRUD()
  const currentFarm = useSelector((state: RootState) => state.farm.currentFarm)
  useEffect(() => {
    if (currentFarm) {
      getFarmAnimals()
    }
    // también cuando cambia la granja actual
  }, [currentFarm?.id])

  //* ==================================== BREEDINGS INITIALIZER
  const { getFarmBreedings } = useBreedingCRUD()
  useEffect(() => {
    if (currentFarm) {
      getFarmBreedings()
    }
  }, [currentFarm?.id])

  return <>{children}</>
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <Provider store={store}>
      <AuthInitializer>{children}</AuthInitializer>
    </Provider>
  )
}
