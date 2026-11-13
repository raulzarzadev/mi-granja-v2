import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ModalRestoreBackup from '@/components/ModalRestoreBackup'

const mockParse = jest.fn()
const mockRestore = jest.fn()
jest.mock('@/hooks/useBackup', () => ({
  useBackup: () => ({ parseBackupFile: mockParse, restoreBackup: mockRestore, isRestoring: false }),
}))
jest.mock('@/components/Modal', () => ({
  Modal: ({ children, isOpen }: any) => (isOpen ? <div>{children}</div> : null),
}))

beforeEach(() => jest.clearAllMocks())

it('procesa el archivo soltado sin ejecutar la restauración', async () => {
  mockParse.mockResolvedValue({ valid: false, errors: ['Respaldo de prueba inválido'] })
  render(<ModalRestoreBackup isOpen onClose={jest.fn()} />)
  const file = new File(['{}'], 'respaldo.JSON', { type: 'application/json' })
  const zone = screen.getByLabelText('Subir respaldo')
  fireEvent.dragOver(zone, { dataTransfer: { files: [file] } })
  expect(screen.getByText('Suelta el archivo aquí')).toBeInTheDocument()
  fireEvent.drop(zone, { dataTransfer: { files: [file] } })
  await screen.findByText('Respaldo de prueba inválido')
  expect(mockParse).toHaveBeenCalledWith(file)
  expect(mockRestore).not.toHaveBeenCalled()
})

it('rechaza varios archivos y formatos ajenos a JSON', () => {
  render(<ModalRestoreBackup isOpen onClose={jest.fn()} />)
  const zone = screen.getByLabelText('Subir respaldo')
  const file = new File(['x'], 'archivo.txt')
  fireEvent.drop(zone, { dataTransfer: { files: [file, file] } })
  expect(screen.getByText('Arrastra un solo archivo de respaldo .json')).toBeInTheDocument()
  fireEvent.drop(zone, { dataTransfer: { files: [file] } })
  expect(screen.getByText('Solo se aceptan archivos .json')).toBeInTheDocument()
  expect(mockParse).not.toHaveBeenCalled()
})

it('bloquea cargas simultáneas y permite reintentar el mismo archivo', async () => {
  let complete!: (value: unknown) => void
  mockParse.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve
      }),
  )
  mockParse.mockResolvedValue({ valid: false, errors: ['Inválido'] })
  render(<ModalRestoreBackup isOpen onClose={jest.fn()} />)
  const file = new File(['{}'], 'respaldo.json')
  const zone = screen.getByLabelText('Subir respaldo')
  fireEvent.drop(zone, { dataTransfer: { files: [file] } })
  fireEvent.drop(zone, { dataTransfer: { files: [file] } })
  expect(mockParse).toHaveBeenCalledTimes(1)
  complete({ valid: false, errors: ['Inválido'] })
  await screen.findByText('Inválido')
  fireEvent.drop(zone, { dataTransfer: { files: [file] } })
  await waitFor(() => expect(mockParse).toHaveBeenCalledTimes(2))
})
