import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from './firebase-admin'

export interface AuthenticatedUser {
  uid: string
  email: string
}

/**
 * Verifica el token de Firebase en rutas de billing.
 * Retorna el usuario autenticado o una respuesta de error.
 */
export async function verifyBillingAuth(
  request: NextRequest,
): Promise<AuthenticatedUser | NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Token de autenticación requerido' }, { status: 401 })
  }

  const token = authHeader.slice(7)

  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    return {
      uid: decoded.uid,
      email: decoded.email ?? '',
    }
  } catch {
    return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
  }
}

/** Type guard para verificar si la respuesta es un error */
export function isAuthError(
  result: AuthenticatedUser | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse
}
