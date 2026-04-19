import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from './firebase-admin'

export interface AuthenticatedUser {
  uid: string
  email: string
}

/**
 * Dado el request, retorna el UID efectivo para consultas de billing.
 * Si el requester es admin y envía X-Impersonate-UID, usa ese UID.
 * De lo contrario usa el UID del token autenticado.
 */
export function resolveEffectiveUid(
  authUser: AuthenticatedUser,
  request: NextRequest,
): string {
  const impersonateUid = request.headers.get('x-impersonate-uid')
  if (impersonateUid && isUserAdminEmail(authUser.email)) {
    return impersonateUid
  }
  return authUser.uid
}

function isUserAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? 'raulzarza.dev@gmail.com').split(',').map(e => e.trim())
  return adminEmails.includes(email)
}

/** En dev sin service account, decodifica el JWT sin verificar para no bloquear el flujo */
function decodeTokenUnsafe(token: string): AuthenticatedUser | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return { uid: decoded.user_id ?? decoded.sub ?? '', email: decoded.email ?? '' }
  } catch {
    return null
  }
}

const isDevNoCredentials =
  process.env.NODE_ENV === 'development' && !process.env.FIREBASE_SERVICE_ACCOUNT_KEY

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

  // En desarrollo sin service account, decodificar sin verificar
  if (isDevNoCredentials) {
    const user = decodeTokenUnsafe(token)
    if (user) {
      console.warn('⚠️  [dev] Token no verificado — falta FIREBASE_SERVICE_ACCOUNT_KEY')
      return user
    }
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

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
export function isAuthError(result: AuthenticatedUser | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
