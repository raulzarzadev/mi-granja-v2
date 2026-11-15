import { auth } from '@/lib/firebase'

export class AuthSessionError extends Error {}

/**
 * fetch con el ID token del usuario actual. Ante un 401 fuerza la renovación
 * del token y reintenta una vez: si la cuenta ya no existe (p. ej. emulador
 * reiniciado), Firebase cierra la sesión y la app redirige al login.
 * Seguro de reintentar: un 401 significa que el servidor no procesó la petición.
 */
export async function authFetch(
  input: string,
  init: RequestInit = {},
  missingSessionMessage = 'Inicia sesión para continuar.',
): Promise<Response> {
  const user = auth.currentUser
  if (!user) throw new AuthSessionError(missingSessionMessage)
  const send = (token: string) => {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${token}`)
    return fetch(input, { ...init, headers })
  }
  const response = await send(await user.getIdToken())
  if (response.status !== 401) return response
  let fresh: string
  try {
    fresh = await user.getIdToken(true)
  } catch {
    throw new AuthSessionError('Tu sesión expiró. Vuelve a iniciar sesión.')
  }
  return send(fresh)
}
