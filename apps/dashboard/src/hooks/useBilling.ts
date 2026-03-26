'use client'

import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  clearBilling,
  setError,
  setLoading,
  setSubscription,
  setUsage,
} from '@/features/billing/billingSlice'
import type { AppDispatch, RootState } from '@/features/store'
import { auth } from '@/lib/firebase'
import type { BillingUsage } from '@/types/billing'
import { canAddCollaborator, canAddFarm } from '@/types/billing'

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error('Usuario no autenticado')
  return user.getIdToken()
}

async function billingFetch(path: string, options: RequestInit = {}) {
  const token = await getAuthToken()
  const res = await fetch(`/api/billing${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Error ${res.status}`)
  }
  return res.json()
}

export function useBilling() {
  const dispatch = useDispatch<AppDispatch>()
  const billing = useSelector((state: RootState) => state.billing)

  const loadSubscription = useCallback(async () => {
    dispatch(setLoading(true))
    try {
      const data = await billingFetch('/subscription')
      dispatch(setSubscription(data.subscription))
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'Error cargando suscripcion'))
    }
  }, [dispatch])

  const loadUsage = useCallback(async () => {
    try {
      const data: BillingUsage = await billingFetch('/usage')
      dispatch(setUsage(data))
    } catch (error) {
      console.error('Error cargando uso:', error)
    }
  }, [dispatch])

  const canCreateFarm = useCallback((): boolean => {
    if (!billing.usage) return false // Sin datos de uso, no permitir hasta que se carguen
    return canAddFarm(billing.usage)
  }, [billing.usage])

  const canInviteCollaborator = useCallback((): boolean => {
    if (!billing.usage) return false
    return canAddCollaborator(billing.usage)
  }, [billing.usage])

  const reset = useCallback(() => {
    dispatch(clearBilling())
  }, [dispatch])

  return {
    // State
    ...billing,

    // Loaders
    loadSubscription,
    loadUsage,

    // Limit checks
    canCreateFarm,
    canInviteCollaborator,

    // Reset
    reset,
  }
}
