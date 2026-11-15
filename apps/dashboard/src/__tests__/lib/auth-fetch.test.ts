jest.mock('@/lib/firebase', () => ({ auth: { currentUser: null } }))

import { AuthSessionError, authFetch } from '@/lib/auth-fetch'
import { auth } from '@/lib/firebase'

const getIdToken = jest.fn()
const mockAuth = auth as unknown as { currentUser: { getIdToken: typeof getIdToken } | null }

const fetchMock = jest.fn()
const authHeader = (call: number) =>
  (fetchMock.mock.calls[call][1].headers as Headers).get('Authorization')

beforeEach(() => {
  jest.resetAllMocks()
  mockAuth.currentUser = { getIdToken }
  global.fetch = fetchMock as unknown as typeof fetch
})

it('envía el token y no reintenta si la respuesta no es 401', async () => {
  getIdToken.mockResolvedValue('t1')
  fetchMock.mockResolvedValue({ status: 200 })
  await authFetch('/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(authHeader(0)).toBe('Bearer t1')
  expect((fetchMock.mock.calls[0][1].headers as Headers).get('Content-Type')).toBe(
    'application/json',
  )
})

it('ante 401 fuerza un token nuevo y reintenta una sola vez', async () => {
  getIdToken.mockResolvedValueOnce('old').mockResolvedValueOnce('new')
  fetchMock.mockResolvedValueOnce({ status: 401 }).mockResolvedValueOnce({ status: 401 })
  const response = await authFetch('/api/x')
  expect(getIdToken).toHaveBeenLastCalledWith(true)
  expect(authHeader(1)).toBe('Bearer new')
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(response.status).toBe(401)
})

it('lanza error de sesión si la renovación falla o no hay usuario', async () => {
  getIdToken.mockResolvedValueOnce('old').mockRejectedValueOnce(new Error('user-token-expired'))
  fetchMock.mockResolvedValue({ status: 401 })
  await expect(authFetch('/api/x')).rejects.toThrow('Vuelve a iniciar sesión')
  mockAuth.currentUser = null
  await expect(authFetch('/api/x', {}, 'Sin sesión')).rejects.toBeInstanceOf(AuthSessionError)
})
