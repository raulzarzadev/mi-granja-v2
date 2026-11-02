import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { updateDoc } from 'firebase/firestore'
import PersonalDetails from '@/components/PersonalDetails'

const mockDispatch = jest.fn()
const mockUser = { id: 'user-1', name: 'Ana', email: 'ana@example.com', roles: ['farmer'] }
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (select: (state: unknown) => unknown) => select({ auth: { user: mockUser } }),
}))
jest.mock('@/lib/firebase', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => 'user-document'),
  serverTimestamp: () => 'server-time',
  updateDoc: jest.fn(),
}))
jest.mock('@/components/Modal', () => ({
  Modal: ({
    isOpen,
    children,
    footer,
  }: {
    isOpen: boolean
    children: React.ReactNode
    footer: React.ReactNode
  }) =>
    isOpen ? (
      <div role="dialog">
        {children}
        {footer}
      </div>
    ) : null,
}))

beforeEach(() => {
  jest.clearAllMocks()
})

it('guarda el nombre personal y actualiza la sesión después del guardado', async () => {
  jest.mocked(updateDoc).mockResolvedValue(undefined)
  render(<PersonalDetails />)
  fireEvent.click(screen.getByRole('button', { name: 'Editar datos personales' }))
  fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: '  Ana María  ' } })
  fireEvent.submit(document.getElementById('personal-details-form')!)
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(updateDoc).toHaveBeenCalledWith('user-document', {
    name: 'Ana María',
    updatedAt: 'server-time',
  })
  expect(mockDispatch).toHaveBeenCalledWith(
    expect.objectContaining({ payload: { ...mockUser, name: 'Ana María' } }),
  )
  expect(screen.getByRole('status')).toHaveTextContent('Datos guardados')
})

it('conserva el nombre ingresado y permite reintentar si falla el guardado', async () => {
  jest.mocked(updateDoc).mockRejectedValueOnce(new Error('offline'))
  render(<PersonalDetails />)
  fireEvent.click(screen.getByRole('button', { name: 'Editar datos personales' }))
  fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Ana María' } })
  fireEvent.submit(document.getElementById('personal-details-form')!)
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron guardar')
  expect(screen.getByLabelText('Nombre *')).toHaveValue('Ana María')
  expect(mockDispatch).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()
})
