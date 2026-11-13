'use client'

import { usePathname } from 'next/navigation'
import React, { useEffect } from 'react'
import { Provider, useSelector } from 'react-redux'
import { AppFeedbackProvider } from '@/components/AppFeedbackProvider'
import { PostHogProvider } from '@/components/PostHogProvider'
import { RootState, store } from '@/features/store'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useAnimalRecords } from '@/hooks/useAnimalRecords'
import { useAuthInitialization } from '@/hooks/useAuthInitialization'
import { useBilling } from '@/hooks/useBilling'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'
import { useSalesCRUD } from '@/hooks/useSalesCRUD'

interface ProvidersProps {
  children: React.ReactNode
}

const AuthInitializer: React.FC<ProvidersProps> = ({ children }) => {
  const authError = useAuthInitialization()

  //* ==================================== AUTH INITIALIZER
  const user = useSelector((state: RootState) => state.auth.user)

  //* ==================================== FARM INITIALIZER
  const { loadUserFarms } = useFarmCRUD()
  useEffect(() => {
    if (user) {
      loadUserFarms()
    }
  }, [user])

  //* ==================================== BILLING INITIALIZER
  const { loadSubscription, loadUsage } = useBilling()
  const impersonatingUser = useSelector((state: RootState) => state.auth.impersonatingUser)
  useEffect(() => {
    if (user) {
      loadSubscription()
      loadUsage()
    }
  }, [user?.id, impersonatingUser?.id])

  //* ==================================== FARM ANIMALS LISTENER
  const { getFarmAnimals } = useAnimalCRUD()
  const { getFarmRecords } = useAnimalRecords()
  const currentFarm = useSelector((state: RootState) => state.farm.currentFarm)
  useEffect(() => {
    if (currentFarm) {
      const unsub = getFarmAnimals()
      return () => unsub?.()
    }
  }, [currentFarm?.id])

  //* ==================================== MASS RECORDS LISTENER
  useEffect(() => {
    const unsub = getFarmRecords()
    return () => unsub?.()
  }, [getFarmRecords])

  //* ==================================== BREEDINGS LISTENER
  const { getFarmBreedings } = useBreedingCRUD()
  useEffect(() => {
    if (currentFarm) {
      const unsub = getFarmBreedings()
      return () => unsub?.()
    }
  }, [currentFarm?.id])

  //* ==================================== NOTIFICATION PREFS LISTENER
  useNotificationPreferences()

  //* ==================================== SALES LISTENER
  const { getFarmSales } = useSalesCRUD()
  useEffect(() => {
    if (currentFarm) {
      const unsub = getFarmSales()
      return () => unsub?.()
    }
  }, [currentFarm?.id])

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div
          role="alert"
          className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-center"
        >
          <h1 className="text-lg font-semibold text-slate-900">No pudimos cargar tu sesión</h1>
          <p className="text-sm text-slate-600">{authError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 cursor-pointer rounded-lg bg-green-700 px-4 py-2 font-medium text-white hover:bg-green-800 focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }
  return (
    <>
      <PostHogProvider />
      {children}
    </>
  )
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  const pathname = usePathname()
  // La portada solo consulta si existe sesión; no carga datos privados de la granja.
  if (pathname === '/auth/session-status') return <>{children}</>
  return (
    <Provider store={store}>
      <AppFeedbackProvider>
        <AuthInitializer>{children}</AuthInitializer>
      </AppFeedbackProvider>
    </Provider>
  )
}
