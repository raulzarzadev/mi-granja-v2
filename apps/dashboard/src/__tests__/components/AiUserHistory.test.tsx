import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AiUserHistory from '@/components/admin/AiUserHistory'

jest.mock('@/components/Modal', () => ({
  Modal: ({ children, footer }: any) => (
    <div>
      {children}
      {footer}
    </div>
  ),
}))
jest.mock('@/components/LoadingSpinner', () => () => <span>Cargando</span>)
jest.mock('@/lib/firebase', () => ({ auth: { currentUser: { getIdToken: async () => 'token' } } }))
const fetchMock = jest.fn()
beforeEach(() => {
  global.fetch = fetchMock
  fetchMock.mockReset()
})
const item = (id: string) => ({
  id,
  question: `Pregunta ${id}`,
  answer: `Respuesta ${id}`,
  status: 'completed',
  farmName: 'Mi granja',
  createdAt: '2026-11-14T12:00:00Z',
  model: 'modelo',
  tokens: 10,
})
it('loads more history without losing previous questions', async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ items: [item('1')], nextCursor: 'page' }),
  })
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ items: [item('2')], nextCursor: null }),
  })
  render(<AiUserHistory userId="user" name="Cliente" onClose={() => {}} />)
  expect(await screen.findByText('Pregunta 1')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Ver más preguntas' }))
  expect(await screen.findByText('Respuesta 2')).toBeInTheDocument()
  expect(screen.getByText('Pregunta 1')).toBeInTheDocument()
  expect(fetchMock.mock.calls[1][0]).toContain('cursor=page')
})
it('shows an empty state and allows closing', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ items: [], nextCursor: null }) })
  const close = jest.fn()
  render(<AiUserHistory userId="user" name="Cliente" onClose={close} />)
  expect(
    await screen.findByText('Este usuario todavía no tiene preguntas registradas.'),
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
  expect(close).toHaveBeenCalledTimes(1)
})
it('allows retrying a failed request', async () => {
  fetchMock.mockRejectedValueOnce(new Error('Sin conexión'))
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ items: [item('1')], nextCursor: null }),
  })
  render(<AiUserHistory userId="user" name="Cliente" onClose={() => {}} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión')
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
  await waitFor(() => expect(screen.getByText('Respuesta 1')).toBeInTheDocument())
})
