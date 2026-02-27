import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mi Granja - Gestión inteligente para tu granja',
  description:
    'Plataforma de gestión ganadera: controla animales, reproducción, salud y colaboradores desde cualquier dispositivo.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
