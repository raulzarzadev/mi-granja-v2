import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AiPlanUsage } from '@/components/billing/AiPlanUsage'

jest.mock('react-redux', () => ({
  useSelector: (select: any) => select({ auth: { user: { id: 'u' } } }),
}))
jest.mock('@/lib/firebase', () => ({ auth: { currentUser: { getIdToken: async () => 'token' } } }))

const credits = {
  mode: 'credits',
  used: 1,
  limit: 5,
  remaining: 4,
  balanceUsd: 4,
  resetsAt: '2026-12-13T01:21:12.000Z',
  renewalCancelled: false,
}
const daily = {
  mode: 'daily',
  used: 1,
  limit: 3,
  remaining: 2,
  resetsAt: '2026-11-13T07:00:00.000Z',
  renewalCancelled: false,
}
const ok = (body: unknown) => ({ ok: true, json: async () => body }) as Response

beforeEach(() => {
  global.fetch = jest.fn()
})

async function openDetails() {
  const toggle = await screen.findByText('Ver detalles')
  const details = toggle.closest('details')!
  expect(details).not.toHaveAttribute('open')
  fireEvent.click(toggle)
  expect(details).toHaveAttribute('open')
  return details
}

describe('AiPlanUsage compacto (panel del asistente)', () => {
  it('muestra solo la barra con disponible y despliega incluido/usado/disponible y renovación', async () => {
    jest.mocked(fetch).mockResolvedValue(ok(credits))
    render(<AiPlanUsage compact />)
    expect(
      await screen.findByText(
        (_, el) => el?.textContent === 'Créditos IA: USD 4.00 de USD 5.00 disponibles',
      ),
    ).toBeInTheDocument()
    // Cerrado: sin explicación ni contadores repetidos.
    expect(screen.queryByText('Créditos del mes')).not.toBeVisible()

    const details = await openDetails()
    expect(await screen.findByText('Ocultar detalles')).toBeInTheDocument()
    const values = Array.from(details.querySelectorAll('dd')).map((dd) => dd.textContent)
    expect(values).toEqual(['USD 5.00', 'USD 1.00', 'USD 4.00'])
    expect(screen.getByText(/Próxima renovación/)).toBeInTheDocument()
    expect(screen.getByText('(hora de Mazatlán)')).toBeInTheDocument()
    expect(details.querySelector('time')).toHaveAttribute('datetime', credits.resetsAt)
    expect(screen.getByText(/no son un cargo extra ni dinero que debas/)).toBeInTheDocument()
    expect(screen.getByText(/Con tu siguiente pago mensual/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver mi plan' })).toHaveAttribute('href', '/plan')
  })

  it('con renovación cancelada muestra fin de ciclo sin prometer nuevo abono', async () => {
    jest.mocked(fetch).mockResolvedValue(ok({ ...credits, renewalCancelled: true }))
    render(<AiPlanUsage compact />)
    await openDetails()
    expect(screen.getByText(/Fin del ciclo/)).toBeInTheDocument()
    expect(screen.getByText(/después no se agregan créditos nuevos/)).toBeInTheDocument()
    expect(screen.queryByText(/Próxima renovación/)).not.toBeInTheDocument()
    expect(screen.queryByText(/siguiente pago mensual/)).not.toBeInTheDocument()
  })

  it('plan gratis: consultas del día, reinicio con zona y aviso único al agotarse', async () => {
    jest.mocked(fetch).mockResolvedValue(ok({ ...daily, used: 3, remaining: 0 }))
    render(<AiPlanUsage compact />)
    expect(
      await screen.findByText(
        (_, el) => el?.textContent === 'Consultas IA hoy: 0 de 3 disponibles',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Usaste tus consultas de hoy.', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver planes' })).toHaveAttribute('href', '/plan')

    const details = await openDetails()
    const values = Array.from(details.querySelectorAll('dd')).map((dd) => dd.textContent)
    expect(values).toEqual(['3 consultas', '3 consultas', '0 consultas'])
    expect(screen.getByText(/Se reinician/)).toBeInTheDocument()
    expect(screen.getByText(/3 consultas gratis por día/)).toBeInTheDocument()
  })

  it('error: ofrece reintentar y luego muestra los datos', async () => {
    jest
      .mocked(fetch)
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce(ok(daily))
    render(<AiPlanUsage compact />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cargar tu consumo de IA.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(
      await screen.findByText(
        (_, el) => el?.textContent === 'Consultas IA hoy: 2 de 3 disponibles',
      ),
    ).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('al cambiar refreshKey vuelve a consultar sin cerrar los detalles abiertos', async () => {
    jest
      .mocked(fetch)
      .mockResolvedValueOnce(ok(credits))
      .mockResolvedValueOnce(ok({ ...credits, used: 2, remaining: 3, balanceUsd: 3 }))
    const { rerender } = render(<AiPlanUsage compact refreshKey="a" />)
    const details = await openDetails()
    rerender(<AiPlanUsage compact refreshKey="b" />)
    await waitFor(() =>
      expect(Array.from(details.querySelectorAll('dd')).map((dd) => dd.textContent)).toEqual([
        'USD 5.00',
        'USD 2.00',
        'USD 3.00',
      ]),
    )
    expect(details).toHaveAttribute('open')
  })
})

describe('AiPlanUsage completo (/plan)', () => {
  it('muestra todo sin desplegable ni costos internos', async () => {
    jest.mocked(fetch).mockResolvedValue(ok({ ...credits, internalBudgetUsd: 1 }))
    render(<AiPlanUsage />)
    expect(await screen.findByRole('heading', { name: 'Asistente IA' })).toBeInTheDocument()
    expect(await screen.findByText('Créditos del mes')).toBeVisible()
    expect(screen.queryByText('Ver detalles')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/presupuesto|costo/i)
    expect(screen.getByText(/Próxima renovación/)).toBeInTheDocument()
    expect(document.querySelector('details')).toBeNull()
  })
})
