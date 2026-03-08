import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const viewport: Viewport = {
  themeColor: '#16a34a',
}

export const metadata: Metadata = {
  title: {
    default: 'Mi Granja - Gestión de Ganado',
    template: '%s | Mi Granja',
  },
  description: 'Aplicación para gestionar tu ganado de manera eficiente',
  manifest: '/manifest.json',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    siteName: 'Mi Granja',
    title: 'Mi Granja - Gestión de Ganado',
    description: 'Aplicación para gestionar tu ganado de manera eficiente',
    images: [{ url: '/icons/icon-512x512.png', width: 512, height: 512, alt: 'Mi Granja' }],
  },
  twitter: {
    card: 'summary',
    title: 'Mi Granja - Gestión de Ganado',
    description: 'Aplicación para gestionar tu ganado de manera eficiente',
    images: ['/icons/icon-512x512.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mi Granja',
  },
  icons: {
    icon: [{ url: '/logo/logo-migranja-verde.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}>
        <ServiceWorkerRegistrar />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
