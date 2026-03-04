'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'next/navigation'
import Dashboard from '@/components/Dashboard/Dashboard'
import AuthForm from '@/features/auth/components/AuthForm'
import { RootState } from '@/features/store'
import { useBilling } from '@/hooks/useBilling'
import { auth as firebaseAuth } from '@/lib/firebase'

function BillingCallback() {
  const searchParams = useSearchParams()
  const { user } = useSelector((state: RootState) => state.auth)
  const { loadSubscription, loadUsage } = useBilling()
  const [status, setStatus] = useState<'idle' | 'confirming' | 'success' | 'canceled'>('idle')
  const confirmedRef = useRef(false)

  // Capturar params antes de que se limpien
  const billing = searchParams.get('billing')
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!user || confirmedRef.current) return

    if (billing === 'canceled') {
      confirmedRef.current = true
      setStatus('canceled')
      window.history.replaceState({}, '', '/')
      const timer = setTimeout(() => setStatus('idle'), 6000)
      return () => clearTimeout(timer)
    }

    if (billing === 'success' && sessionId) {
      confirmedRef.current = true
      setStatus('confirming')
      window.history.replaceState({}, '', '/')

      const confirm = async () => {
        try {
          const token = await firebaseAuth.currentUser?.getIdToken()
          if (!token) {
            console.error('BillingCallback: no hay token de auth')
            setStatus('idle')
            return
          }

          const res = await fetch('/api/billing/confirm', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ sessionId }),
          })

          const data = await res.json()
          console.log('Confirm response:', res.status, data)

          if (!res.ok) {
            console.error('Error en confirm:', data)
            setStatus('idle')
            return
          }

          // Recargar datos de billing en Redux
          await loadSubscription()
          await loadUsage()
          setStatus('success')
          setTimeout(() => setStatus('idle'), 6000)
        } catch (err) {
          console.error('Error confirmando pago:', err)
          setStatus('idle')
        }
      }
      confirm()
    }
  }, [billing, sessionId, user])

  if (status === 'idle') return null

  if (status === 'confirming') {
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
        <span className="font-medium">Activando tu plan...</span>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
        <span className="font-medium">Tu plan ha sido actualizado exitosamente</span>
      </div>
    )
  }

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
      <span className="font-medium">El pago fue cancelado. Puedes intentar de nuevo cuando quieras.</span>
    </div>
  )
}

export default function Home() {
  const { user } = useSelector((state: RootState) => state.auth)

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si el usuario no está autenticado, mostrar formulario de login
  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <AuthForm />
        </div>
      </div>
    )
  }

  // Si el usuario está autenticado, mostrar dashboard
  return (
    <>
      <BillingCallback />
      <Dashboard />
    </>
  )
}
