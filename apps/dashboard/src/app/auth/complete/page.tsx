'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Esta página ya no se usa (se migró a código por email).
 * Redirige al login por si alguien tiene un magic link viejo.
 */
export default function CompleteAuthPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/auth')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Redirigiendo al login...</p>
    </div>
  )
}
