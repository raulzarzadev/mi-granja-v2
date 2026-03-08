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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Mi Granja',
  description: 'Aplicación para gestionar tu ganado de manera eficiente',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'MXN',
  },
  inLanguage: 'es',
}

export default function AuthPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AuthPageClient />
    </>
  )
}
