import { type NextRequest, NextResponse } from 'next/server'

/**
 * Verifica que la request venga de Vercel Cron o tenga el bearer correcto.
 * Vercel inyecta el header automáticamente cuando el cron ejecuta /api/cron/*.
 */
export function verifyCronAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('CRON_SECRET no está configurado')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
