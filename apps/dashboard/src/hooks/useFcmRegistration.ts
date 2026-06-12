'use client'

import { arrayUnion, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/features/store'
import { requestFcmToken, subscribeForegroundMessages } from '@/lib/fcmClient'
import { db } from '@/lib/firebase'

type Status = 'idle' | 'pending' | 'granted' | 'denied' | 'unsupported'

/**
 * Gestiona el registro FCM del dispositivo actual.
 * - Pide permiso al usuario
 * - Obtiene token y lo guarda en notificationPreferences/{uid}
 * - Subscribe foreground messages para mostrar toast cuando app está abierta
 */
export function useFcmRegistration() {
  const userId = useSelector((s: RootState) => s.auth.user?.id)
  const [status, setStatus] = useState<Status>('idle')
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'granted') setStatus('granted')
    else if (Notification.permission === 'denied') setStatus('denied')
  }, [])

  const enable = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      setError('Usuario no autenticado')
      return false
    }
    setStatus('pending')
    setError(null)
    try {
      const fcmToken = await requestFcmToken()
      if (!fcmToken) {
        const denied = typeof Notification !== 'undefined' && Notification.permission === 'denied'
        setStatus(denied ? 'denied' : 'unsupported')
        return false
      }
      const ref = doc(db, 'notificationPreferences', userId)
      const existing = await getDoc(ref)
      if (existing.exists()) {
        await setDoc(
          ref,
          {
            fcmTokens: arrayUnion(fcmToken),
            pushEnabled: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
      } else {
        await setDoc(ref, {
          userId,
          pushEnabled: true,
          emailEnabled: true,
          marketingEmailEnabled: true,
          fcmTokens: [fcmToken],
          updatedAt: serverTimestamp(),
        })
      }
      setToken(fcmToken)
      setStatus('granted')
      return true
    } catch (err) {
      console.error('useFcmRegistration enable error:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setStatus('idle')
      return false
    }
  }, [userId])

  // Foreground messages → mostrar notificación nativa también
  useEffect(() => {
    if (status !== 'granted') return
    let unsub: (() => void) | undefined
    subscribeForegroundMessages((payload) => {
      const title = payload.notification?.title || 'Mi Granja'
      const body = payload.notification?.body || ''
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          new Notification(title, { body, icon: '/icons/icon-192x192.png' })
        } catch {
          // ignorar si el browser bloquea Notification constructor
        }
      }
    }).then((fn) => {
      unsub = fn
    })
    return () => {
      unsub?.()
    }
  }, [status])

  return { status, token, error, enable }
}
