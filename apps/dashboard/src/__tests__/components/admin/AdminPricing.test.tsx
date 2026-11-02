import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminPricing from '@/components/admin/AdminPricing'
import { PLAN_TIERS } from '@/types/billing'

jest.mock('@/lib/firebase', () => ({
  auth: { currentUser: { getIdToken: async () => 'admin-token' } },
}))
beforeEach(() => jest.clearAllMocks())
it('muestra el rechazo junto al botón persistente y conserva los cambios', async () => {
  jest.mocked(fetch).mockImplementation(async (_url, options) =>
    options?.method === 'PUT'
      ? ({
          ok: false,
          json: async () => ({
            error: 'Actualiza el Price ID de Stripe para Pro antes de cambiar su precio',
          }),
        } as Response)
      : ({ ok: true, json: async () => ({ tiers: PLAN_TIERS }) } as Response),
  )
  render(<AdminPricing />)
  fireEvent.change(await screen.findByDisplayValue('Pro'), { target: { value: 'Mi Pro' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar planes y precios' }))
  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent('Actualiza el Price ID')
  expect(alert.parentElement).toHaveClass('sticky')
  expect(screen.getByDisplayValue('Mi Pro')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Guardar planes y precios' })).toBeEnabled()
})
it('confirma el guardado junto al botón y bloquea envíos repetidos', async () => {
  let finish: (response: Response) => void = () => {}
  jest.mocked(fetch).mockImplementation(async (_url, options) =>
    options?.method === 'PUT'
      ? new Promise((resolve) => {
          finish = resolve
        })
      : ({ ok: true, json: async () => ({ tiers: PLAN_TIERS }) } as Response),
  )
  render(<AdminPricing />)
  await screen.findByDisplayValue('Pro')
  fireEvent.click(screen.getByRole('button', { name: 'Guardar planes y precios' }))
  expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled()
  await waitFor(() =>
    expect(
      jest.mocked(fetch).mock.calls.filter(([, options]) => options?.method === 'PUT'),
    ).toHaveLength(1),
  )
  finish({ ok: true, json: async () => ({ tiers: PLAN_TIERS }) } as Response)
  expect(await screen.findByRole('status')).toHaveTextContent('actualizados correctamente')
  expect(screen.getByRole('status').parentElement).toHaveClass('sticky')
})

it('aumentar el límite gratis ajusta los rangos siguientes antes de guardar', async () => {
  jest
    .mocked(fetch)
    .mockResolvedValue({ ok: true, json: async () => ({ tiers: PLAN_TIERS }) } as Response)
  render(<AdminPricing />)
  await screen.findByDisplayValue('Pro')
  const maxInputs = screen.getAllByLabelText('Límite máximo')
  fireEvent.change(maxInputs[0], { target: { value: '099' } })
  fireEvent.blur(maxInputs[0])
  expect(maxInputs[0]).toHaveValue(99)
  expect(maxInputs[1]).toHaveValue(100)
  expect(maxInputs[2]).toHaveValue(101)
  fireEvent.click(screen.getByRole('button', { name: 'Guardar planes y precios' }))
  await waitFor(() =>
    expect(jest.mocked(fetch).mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(
      true,
    ),
  )
  const call = jest.mocked(fetch).mock.calls.find(([, options]) => options?.method === 'PUT')!
  const tiers = JSON.parse(String(call[1]?.body)).tiers
  expect(tiers[1]).toMatchObject({ minAnimals: 100, maxAnimals: 100 })
  expect(tiers[2]).toMatchObject({ minAnimals: 101, maxAnimals: 101 })
})

it('los planes archivados no empujan los rangos activos ni se alteran al cambiar el plan gratis', async () => {
  jest
    .mocked(fetch)
    .mockResolvedValue({ ok: true, json: async () => ({ tiers: PLAN_TIERS }) } as Response)
  render(<AdminPricing />)
  await screen.findByDisplayValue('Pro')
  const offering = screen.getAllByRole('checkbox', { name: 'Ofrecer' })
  fireEvent.click(offering[1])
  fireEvent.click(offering[2])
  const inputs = screen.getAllByLabelText('Límite máximo')
  fireEvent.change(inputs[0], { target: { value: '99' } })
  expect(inputs[1]).toBeDisabled()
  expect(inputs[1]).toHaveValue(50)
  expect(screen.getByText('Desde 100 animales')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar planes y precios' }))
  await waitFor(() =>
    expect(jest.mocked(fetch).mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(
      true,
    ),
  )
  const call = jest.mocked(fetch).mock.calls.find(([, options]) => options?.method === 'PUT')!
  const tiers = JSON.parse(String(call[1]?.body)).tiers
  expect(tiers.find((tier: any) => tier.id === 'pro')).toMatchObject({
    minAnimals: 100,
    maxAnimals: 500,
  })
})
