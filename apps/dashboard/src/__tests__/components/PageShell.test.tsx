import { fireEvent, render, screen } from '@testing-library/react'
import PageShell from '@/components/PageShell'

const mockBack = jest.fn()
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}))
jest.mock('react-redux', () => ({
  useSelector: (select: any) => select({ auth: { user: { id: 'u' } } }),
}))
jest.mock('@/components/Navbar', () => ({ __esModule: true, default: () => null }))
beforeEach(() => jest.clearAllMocks())

it('regresa directamente al panel aunque el historial anterior sea Stripe', () => {
  render(
    <PageShell title="Plan y facturación" backHref="/">
      Planes
    </PageShell>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Volver al panel' }))
  expect(mockReplace).toHaveBeenCalledWith('/')
  expect(mockBack).not.toHaveBeenCalled()
})

it('conserva el regreso habitual en páginas sin destino explícito', () => {
  render(<PageShell title="Otra página">Contenido</PageShell>)
  fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
  expect(mockBack).toHaveBeenCalledTimes(1)
  expect(mockReplace).not.toHaveBeenCalled()
})
