import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  transpilePackages: ['@mi-granja/shared'],
  poweredByHeader: false,
  // Safari puede bloquear WebChannel entre dashboard.localhost y 127.0.0.1.
  // En desarrollo el navegador usa su propio origen y Next reenvía al emulador.
  rewrites: async () =>
    process.env.NEXT_PUBLIC_USE_EMULATOR === 'true'
      ? [
          {
            source: '/google.firestore.v1.Firestore/:path*',
            destination: `http://127.0.0.1:${process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT || 8180}/google.firestore.v1.Firestore/:path*`,
          },
          {
            source: '/v0/b/:path*',
            destination: `http://127.0.0.1:${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_PORT || 9399}/v0/b/:path*`,
          },
        ]
      : [],
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://*.firebaseio.com https://*.googleapis.com https://*.posthog.com https://*.i.posthog.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://*.googleapis.com https://*.googleusercontent.com https://*.i.posthog.com",
            "worker-src 'self' blob:",
            `connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.firebase.google.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com https://apis.google.com https://*.posthog.com https://*.i.posthog.com${isDev ? ' http://localhost:* http://127.0.0.1:*' : ''}`,
            `frame-src 'self' https://apis.google.com https://accounts.google.com https://*.firebaseapp.com https://*.firebase.google.com${isDev ? ' http://localhost:* http://127.0.0.1:*' : ''}`,
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ],
    },
    {
      source: '/((?!auth/session-status).*)',
      headers: [{ key: 'X-Frame-Options', value: 'DENY' }],
    },
    {
      source: '/auth/session-status',
      headers: [
        { key: 'Cache-Control', value: 'no-store' },
        {
          key: 'Content-Security-Policy',
          value: `frame-ancestors https://migranja.app https://www.migranja.app${isDev ? ' http://landing.localhost:1355 http://localhost:3001' : ''}`,
        },
      ],
    },
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
      ],
    },
  ],
}

export default nextConfig
