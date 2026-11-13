'use client'

import { onAuthStateChanged } from 'firebase/auth'
import { useEffect } from 'react'
import { auth } from '@/lib/firebase'

export default function SessionStatus() {
  useEffect(() => {
    const origin = new URLSearchParams(window.location.search).get('origin')
    const allowed = ['https://migranja.app', 'https://www.migranja.app']
    if (process.env.NODE_ENV === 'development') {
      allowed.push('http://landing.localhost:1355', 'http://localhost:3001')
    }
    if (!origin || !allowed.includes(origin) || window.parent === window) return
    const send = (signedIn: boolean) =>
      window.parent.postMessage({ type: 'migranja:session', signedIn }, origin)
    return onAuthStateChanged(
      auth,
      (user) => send(Boolean(user)),
      () => send(false),
    )
  }, [])
  return null
}
