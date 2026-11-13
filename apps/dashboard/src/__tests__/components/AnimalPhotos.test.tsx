import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AnimalPhotos from '@/components/AnimalPhotos'
import { compressAnimalPhoto, uploadAnimalPhoto } from '@/lib/animal-photo'
import type { Animal } from '@/types/animals'

const mockUpdate = jest.fn().mockResolvedValue(undefined)
jest.mock('@/hooks/useAnimalCRUD', () => ({ useAnimalCRUD: () => ({ update: mockUpdate }) }))
jest.mock('@/hooks/useFarmPermissions', () => ({ useFarmPermissions: () => ({ has: () => true }) }))
jest.mock('@/components/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({ confirmAction: async () => true }),
}))
jest.mock('@/components/Modal', () => ({
  Modal: ({ children, footer }: any) => (
    <div>
      {children}
      {footer}
    </div>
  ),
}))
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img src={props.src} alt={props.alt} />,
}))
jest.mock('@/lib/animal-photo', () => ({
  compressAnimalPhoto: jest.fn(),
  uploadAnimalPhoto: jest.fn(),
}))
beforeEach(() => {
  jest.clearAllMocks()
  URL.createObjectURL = jest.fn(() => 'blob:preview')
  URL.revokeObjectURL = jest.fn()
})
it('optimiza la foto antes de subirla y guarda galería y portada con el servicio del animal', async () => {
  const source = new File(['source'], 'phone.heic')
  const optimized = new File(['image'], 'phone.webp', { type: 'image/webp' })
  jest.mocked(compressAnimalPhoto).mockResolvedValue(optimized)
  jest.mocked(uploadAnimalPhoto).mockResolvedValue('https://photos/new.webp')
  render(
    <AnimalPhotos
      animal={{ id: 'a', animalNumber: '317-A', imageUrl: 'https://photos/old.jpg' } as Animal}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Fotos (1)' }))
  fireEvent.change(screen.getByLabelText('Agregar fotos'), { target: { files: [source] } })
  await waitFor(() => expect(screen.getAllByAltText(/Foto \d de/)).toHaveLength(2))
  fireEvent.click(screen.getByRole('button', { name: 'Usar de portada' }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar fotos' }))
  await waitFor(() =>
    expect(mockUpdate).toHaveBeenCalledWith('a', {
      imageUrl: 'https://photos/new.webp',
      imageUrls: ['https://photos/new.webp', 'https://photos/old.jpg'],
    }),
  )
  expect(uploadAnimalPhoto).toHaveBeenCalledWith(optimized)
})
