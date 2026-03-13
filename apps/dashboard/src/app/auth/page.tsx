import type { Metadata } from 'next'
import AuthPageClient from './AuthPageClient'

export const metadata: Metadata = {
  title: 'Iniciar Sesión',
  description:
    'Inicia sesión en Mi Granja para gestionar tu ganado, registros de monta, recordatorios y colaboradores.',
  openGraph: {
    title: 'Iniciar Sesión | Mi Granja',
    description:
      'Inicia sesión en Mi Granja para gestionar tu ganado, registros de monta, recordatorios y colaboradores.',
  },
}

export default function AuthPage() {
  return <AuthPageClient />
}
