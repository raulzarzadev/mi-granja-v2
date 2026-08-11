import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ModalCreateFarm from '@/components/ModalCreateFarm'

const createFarm = jest.fn()

jest.mock('@/hooks/useFarmCRUD', () => ({
  useFarmCRUD: () => ({ createFarm }),
}))

jest.mock('@/hooks/useBilling', () => ({
  useBilling: () => ({
    canCreateFarm: () => true,
    usage: null,
  }),
}))

jest.mock('@/hooks/useModal', () => ({
  useModal: () => ({
    isOpen: false,
    openModal: jest.fn(),
    closeModal: jest.fn(),
  }),
}))

jest.mock('react-redux', () => ({
  useSelector: () => ({ user: { id: 'user-1', email: 'test@example.com' } }),
}))

describe('ModalCreateFarm', () => {
  beforeEach(() => {
    createFarm.mockReset()
    createFarm.mockResolvedValue({ id: 'farm-1', name: 'Rancho Norte' })
  })

  it('crea una granja con su perfil productivo', async () => {
    render(<ModalCreateFarm open showTrigger={false} />)

    fireEvent.change(screen.getByLabelText('Nombre de la granja'), {
      target: { value: 'Rancho Norte' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: /Ganadería/ }))
    fireEvent.click(screen.getByRole('button', { name: /Reproducción/ }))
    fireEvent.click(screen.getByRole('button', { name: /Bovinos/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Crear mi granja' }))

    await waitFor(() =>
      expect(createFarm).toHaveBeenCalledWith({
        name: 'Rancho Norte',
        description: '',
        location: { country: 'México' },
        productionProfile: {
          activityType: 'livestock',
          productionPurposes: ['breeding'],
          animalSpecies: ['vaca'],
        },
      }),
    )
  })
})
