import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { BetaBanner } from '@/components/BetaBanner'
import { OfflineBanner } from '@/components/OfflineBanner'
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar'
import WhatsAppCommunityFab from '@/components/WhatsAppCommunityFab'
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

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://panel.migranja.app'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Mi Granja - Gestión ganadera',
    template: '%s | Mi Granja',
  },
  description: 'Panel privado de gestión ganadera de Mi Granja.',
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
    icon: [
      { url: '/favicon.ico?v=4', sizes: 'any' },
      { url: '/favicon-32x32.png?v=4', type: 'image/png', sizes: '32x32' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png?v=4', sizes: '180x180' }],
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
        <OfflineBanner />
        <BetaBanner />
        <Providers>{children}</Providers>
        <WhatsAppCommunityFab />
      </body>
    </html>
  )
}
