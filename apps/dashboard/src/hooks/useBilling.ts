'use client'

import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  setLoading,
  setError,
  setSubscription,
  setUsage,
  setInvoices,
  showUpgrade,
  hideUpgrade,
  clearBilling,
  type UpgradeReason,
} from '@/features/billing/billingSlice'
import type { AppDispatch, RootState } from '@/features/store'
import { auth } from '@/lib/firebase'
import type { BillingInterval, BillingUsage } from '@/types/billing'
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
      if (data.invoices) {
        dispatch(setInvoices(data.invoices))
      }
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'Error cargando suscripción'))
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

  const createCheckoutSession = useCallback(
    async (params: {
      extraFarms: number
      extraCollaborators: number
      interval: BillingInterval
    }) => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const data = await billingFetch('/checkout', {
        method: 'POST',
        body: JSON.stringify({
          ...params,
          successUrl: `${appUrl}/billing?success=true`,
          cancelUrl: `${appUrl}/billing?canceled=true`,
        }),
      })
      // Redirigir a Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    },
    [],
  )

  const openCustomerPortal = useCallback(async () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const data = await billingFetch('/portal', {
      method: 'POST',
      body: JSON.stringify({ returnUrl: `${appUrl}/billing` }),
    })
    if (data.url) {
      window.location.href = data.url
    }
  }, [])

  const canCreateFarm = useCallback((): boolean => {
    if (!billing.usage) return true // Sin datos de uso, permitir (se valida server-side)
    return canAddFarm(billing.usage)
  }, [billing.usage])

  const canInviteCollaborator = useCallback((): boolean => {
    if (!billing.usage) return true
    return canAddCollaborator(billing.usage)
  }, [billing.usage])

  const requestUpgrade = useCallback(
    (reason: UpgradeReason) => {
      dispatch(showUpgrade(reason))
    },
    [dispatch],
  )

  const dismissUpgrade = useCallback(() => {
    dispatch(hideUpgrade())
  }, [dispatch])

  const reset = useCallback(() => {
    dispatch(clearBilling())
  }, [dispatch])

  return {
    // State
    ...billing,

    // Loaders
    loadSubscription,
    loadUsage,

    // Actions
    createCheckoutSession,
    openCustomerPortal,

    // Limit checks
    canCreateFarm,
    canInviteCollaborator,

    // Modal
    requestUpgrade,
    dismissUpgrade,

    // Reset
    reset,
  }
}
