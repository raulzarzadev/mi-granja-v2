import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sin Conexión',
  description: 'No hay conexión a internet. Verifica tu conexión e intenta de nuevo.',
  openGraph: {
    title: 'Sin Conexión | Mi Granja',
    description: 'No hay conexión a internet. Verifica tu conexión e intenta de nuevo.',
  },
}

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children
}
