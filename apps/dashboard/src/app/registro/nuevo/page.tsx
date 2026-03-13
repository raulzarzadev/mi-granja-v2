import { Suspense } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import NuevoRegistroClient from './NuevoRegistroClient'

export default function NuevoRegistroPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Cargando..." />}>
      <NuevoRegistroClient />
    </Suspense>
  )
}
