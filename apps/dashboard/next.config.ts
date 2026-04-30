import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  transpilePackages: ['@mi-granja/shared'],
  poweredByHeader: false,
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseio.com https://*.googleapis.com https://*.posthog.com https://*.i.posthog.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://*.googleapis.com https://*.googleusercontent.com https://*.i.posthog.com",
            "worker-src 'self' blob:",
            `connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.firebase.google.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.posthog.com https://*.i.posthog.com${isDev ? ' http://localhost:* http://127.0.0.1:*' : ''}`,
            "frame-src 'self' https://*.firebaseapp.com https://*.firebase.google.com",
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
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
      ],
    },
  ],
}

export default nextConfig
