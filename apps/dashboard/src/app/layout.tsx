import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { BetaBanner } from '@/components/BetaBanner'
import { OfflineBanner } from '@/components/OfflineBanner'
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar'
import { Providers } from './providers'

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

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.migranja.app'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Mi Granja',
  url: appUrl,
  description:
    'Aplicación para gestionar tu ganado de manera eficiente. Registra animales, montas, recordatorios y colaboradores.',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Farm Management',
  operatingSystem: 'Web',
  inLanguage: 'es',
  image: `${appUrl}/icons/icon-512x512.png`,
  offers: [
    {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'MXN',
      description: 'Plan gratuito: 1 granja, 1 usuario',
    },
    {
      '@type': 'Offer',
      price: '250',
      priceCurrency: 'MXN',
      description: 'Lugar adicional (granja o colaborador): $250 MXN/mes',
    },
  ],
  creator: {
    '@type': 'Organization',
    name: 'Mi Granja',
    url: 'https://migranja.app',
  },
}

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
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
    images: [{ url: '/icons/icon-512x512.png', width: 512, height: 512, alt: 'Mi Granja' }],
  },
  twitter: {
    card: 'summary',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ServiceWorkerRegistrar />
        <OfflineBanner />
        <BetaBanner />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
