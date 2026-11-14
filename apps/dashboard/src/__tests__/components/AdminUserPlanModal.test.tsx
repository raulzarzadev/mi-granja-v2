import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminUserPlanModal from '@/components/admin/AdminUserPlanModal'

jest.mock('@/components/Modal', () => ({
  Modal: ({ children, footer }: any) => (
    <div>
      {children}
      {footer}
    </div>
  ),
}))
jest.mock('@/components/LoadingSpinner', () => () => <span>Cargando</span>)
jest.mock('@/components/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({ notify: jest.fn() }),
}))
jest.mock('@/lib/firebase', () => ({ auth: { currentUser: { getIdToken: async () => 'token' } } }))
const fetchMock = jest.fn()
const tiers = [
  { id: 'free', label: 'Sin costo', description: 'Hasta 25 animales', priceUsd: 0 },
  {
    id: 'pro',
    label: 'Profesional configurado',
    description: 'De 26 a 900 animales',
    priceUsd: 37.5,
  },
  {
    id: 'empresarial',
    label: 'Acuerdo privado',
    description: 'Más de 900 animales',
    priceUsd: null,
    isVisible: false,
  },
]
const usage = {
  tierId: 'free',
  requiredTierId: 'pro',
  animalCount: 30,
  actualFarmCount: 2,
  actualCollaboratorCount: 3,
}
const ok = (data: unknown) => ({ ok: true, json: async () => data })
beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock
  fetchMock.mockImplementation(async (url: string, options: any) =>
    options?.method === 'POST'
      ? ok({ success: true })
      : url.includes('billing-config')
        ? ok({ tiers })
        : ok(usage),
  )
})
it('uses configured names, ranges and prices and saves only the manual assignment', async () => {
  const onClose = jest.fn()
  const onSaved = jest.fn().mockResolvedValue(undefined)
  render(
    <AdminUserPlanModal
      userId="client"
      email="client@example.com"
      onClose={onClose}
      onSaved={onSaved}
    />,
  )
  const select = await screen.findByRole('combobox', { name: 'Plan asignado' })
  expect(
    screen.getByText('Plan requerido por inventario: Profesional configurado.'),
  ).toBeInTheDocument()
  fireEvent.click(select)
  expect(
    screen.getByRole('option', { name: /Acuerdo privado — Precio a convenir \(oculto\)/ }),
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('option', { name: /Profesional configurado — \$37.5 USD\/mes/ }))
  expect(screen.getByText('De 26 a 900 animales')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/admin/billing',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ userId: 'client', tierId: 'pro' }),
    }),
  )
  expect(
    fetchMock.mock.calls.some(([url]) => url.includes('checkout') || url.includes('stripe')),
  ).toBe(false)
  expect(onClose).toHaveBeenCalledTimes(1)
})
it('blocks saving when configuration fails and allows retry', async () => {
  fetchMock.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: false })
  render(
    <AdminUserPlanModal
      userId="client"
      email="client@example.com"
      onClose={() => {}}
      onSaved={async () => {}}
    />,
  )
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar')
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
  expect(await screen.findByRole('combobox')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
})
it('preserves the selection on save failure and prevents duplicate submissions', async () => {
  fetchMock.mockImplementation(async (url: string, options: any) =>
    options?.method === 'POST'
      ? { ok: false }
      : url.includes('billing-config')
        ? ok({ tiers })
        : ok(usage),
  )
  const onClose = jest.fn()
  render(
    <AdminUserPlanModal
      userId="client"
      email="client@example.com"
      onClose={onClose}
      onSaved={async () => {}}
    />,
  )
  await screen.findByRole('combobox')
  const save = screen.getByRole('button', { name: 'Guardar' })
  fireEvent.click(save)
  fireEvent.click(save)
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar')
  expect(screen.getByRole('combobox')).toHaveTextContent('Sin costo')
  expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1)
  expect(onClose).not.toHaveBeenCalled()
})
