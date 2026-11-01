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

  it('permite combinar actividades y conserva la selección al volver', () => {
    render(<ModalCreateFarm open showTrigger={false} />)
    fireEvent.change(screen.getByLabelText('Nombre de la granja'), {
      target: { value: 'Rancho Norte' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Mixta/ })).not.toBeInTheDocument()
    for (const name of [/Ganadería/, /Cultivos/, /^Otro/]) {
      fireEvent.click(screen.getByRole('button', { name }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('¿Qué especies manejas?')).toBeInTheDocument()
    expect(screen.getByText('¿Qué cultivos manejas?')).toBeInTheDocument()
    expect(screen.getByText('¿Cuál es tu actividad?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
    for (const name of [/Ganadería/, /Cultivos/, /^Otro/]) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true')
    }
    fireEvent.click(screen.getByRole('button', { name: /Cultivos/ }))
    expect(screen.getByRole('button', { name: /Cultivos/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('crea una granja con su perfil productivo', async () => {
    render(<ModalCreateFarm open showTrigger={false} />)

    fireEvent.change(screen.getByLabelText('Nombre de la granja'), {
      target: { value: 'Rancho Norte' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: /Ganadería/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
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
          activities: ['livestock'],
          productionPurposes: ['breeding'],
          animalSpecies: ['vaca'],
        },
      }),
    )
  })
})
