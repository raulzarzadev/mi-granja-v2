'use client'

import { getApp } from 'firebase/app'
import {
  getMessaging,
  getToken,
  isSupported,
  type MessagePayload,
  type Messaging,
  onMessage,
} from 'firebase/messaging'
import '@/lib/firebase'

let cached: Messaging | null = null

async function getMessagingClient(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null
  if (cached) return cached
  const supported = await isSupported().catch(() => false)
  if (!supported) return null
  cached = getMessaging(getApp())
  return cached
}

/**
 * Registra el SW de Firebase Messaging y obtiene el token FCM del dispositivo.
 * Devuelve null si el browser no soporta push o el usuario rechaza permisos.
 */
export async function requestFcmToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey) {
    console.warn('NEXT_PUBLIC_FIREBASE_VAPID_KEY no está configurado')
    return null
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const messaging = await getMessagingClient()
  if (!messaging) return null

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    scope: '/',
  })
  await navigator.serviceWorker.ready

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  }).catch((err) => {
    console.error('FCM getToken error:', err)
    return null
  })
  return token || null
}

/** Subscribe a notificaciones en foreground. Retorna unsubscribe. */
export async function subscribeForegroundMessages(
  cb: (payload: MessagePayload) => void,
): Promise<() => void> {
  const messaging = await getMessagingClient()
  if (!messaging) return () => {}
  return onMessage(messaging, cb)
}
