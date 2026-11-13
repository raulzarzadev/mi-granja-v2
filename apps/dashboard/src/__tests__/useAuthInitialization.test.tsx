import { act, renderHook, waitFor } from '@testing-library/react'
import { getDoc } from 'firebase/firestore'
import { useAuthInitialization } from '@/hooks/useAuthInitialization'

const mockDispatch = jest.fn()
let mockAuthChanged: (user: any) => Promise<void>
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch }))
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, callback: any) => {
    mockAuthChanged = callback
    return jest.fn()
  },
}))
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn() }))
jest.mock('@/lib/firebase', () => ({ auth: {}, db: {} }))
beforeEach(() => jest.clearAllMocks())
afterEach(() => jest.useRealTimers())

it('muestra error recuperable cuando falla el perfil en vez de esperar indefinidamente', async () => {
  jest.mocked(getDoc).mockRejectedValue(new Error('offline'))
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
  const { result } = renderHook(() => useAuthInitialization())
  await act(async () => {
    await mockAuthChanged({ uid: 'u', email: 'a@example.com' })
  })
  expect(result.current).toMatch(/No se pudo cargar tu perfil/)
  expect(mockDispatch).not.toHaveBeenCalled()
  spy.mockRestore()
})
it('limita a 15 segundos una restauración de sesión que no responde', () => {
  jest.useFakeTimers()
  const { result } = renderHook(() => useAuthInitialization())
  act(() => {
    jest.advanceTimersByTime(15000)
  })
  expect(result.current).toMatch(/tardando demasiado/)
})
it('no restaura un perfil viejo cuando se cierra sesión durante su lectura', async () => {
  let resolve!: (value: any) => void
  jest.mocked(getDoc).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done
      }) as any,
  )
  renderHook(() => useAuthInitialization())
  act(() => {
    void mockAuthChanged({ uid: 'old' })
  })
  await act(async () => {
    await mockAuthChanged(null)
  })
  await act(async () => {
    resolve({ exists: () => true, data: () => ({ email: 'old@example.com' }) })
  })
  await waitFor(() => expect(mockDispatch).toHaveBeenCalledTimes(1))
  expect(mockDispatch.mock.calls[0][0].payload).toBeNull()
})
