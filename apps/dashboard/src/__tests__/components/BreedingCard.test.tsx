/**
 * Test para BreedingCard component
 *
 * BreedingCard usa useBreedingCRUD que accede a Redux + Firestore.
 * Verificamos que el componente se monta correctamente con Provider.
 */

import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import BreedingCard from '@/components/BreedingCard'
import { Animal } from '@/types/animals'
import { BreedingRecord } from '@/types/breedings'
import { renderWithProviders } from '../test-utils'

const mockAnimals: Animal[] = [
  {
    id: 'male1',
    animalNumber: 'M001',
    type: 'vaca',
    gender: 'macho',
    stage: 'reproductor',
    farmerId: 'farmer1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'female1',
    animalNumber: 'F001',
    type: 'vaca',
    gender: 'hembra',
    stage: 'reproductor',
    farmerId: 'farmer1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockRecord: BreedingRecord = {
  id: 'breeding1',
  farmerId: 'farmer1',
  maleId: 'male1',
  breedingDate: new Date('2024-01-01'),
  femaleBreedingInfo: [
    {
      femaleId: 'female1',
      pregnancyConfirmedDate: null,
      offspring: [],
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('BreedingCard', () => {
  it('should render breeding card without crashing', () => {
    const { container } = renderWithProviders(
      <BreedingCard record={mockRecord} animals={mockAnimals} />,
    )
    expect(container).toBeTruthy()
  })

  it('should display male animal number', () => {
    const { container } = renderWithProviders(
      <BreedingCard record={mockRecord} animals={mockAnimals} />,
    )
    expect(container.textContent).toContain('M001')
  })

  it('should render with optional action handlers', () => {
    const { container } = renderWithProviders(
      <BreedingCard
        record={mockRecord}
        animals={mockAnimals}
        onRemoveFromBreeding={jest.fn()}
        onDeleteBirth={jest.fn()}
        onUnconfirmPregnancy={jest.fn()}
      />,
    )
    expect(container).toBeTruthy()
  })

  it('muestra las crías junto a su madre y solo el total en el resumen', () => {
    const calf = { ...mockAnimals[1], id: 'calf1', animalNumber: 'C001', stage: 'cria' } as Animal
    const record: BreedingRecord = {
      ...mockRecord,
      femaleBreedingInfo: [
        {
          femaleId: 'female1',
          pregnancyConfirmedDate: null,
          actualBirthDate: new Date(2024, 9, 1),
          offspring: [calf.id],
        },
      ],
    }

    renderWithProviders(<BreedingCard record={record} animals={[...mockAnimals, calf]} />)

    fireEvent.click(screen.getByText('C001'))

    const dialogs = screen.getAllByRole('dialog')
    expect(dialogs).toHaveLength(1)
    expect(within(dialogs[0]).getAllByText('C001').length).toBeGreaterThan(0)
    expect(screen.getByText('Parida 01/10/24')).toBeInTheDocument()
    expect(screen.queryByText(/Parto:/)).not.toBeInTheDocument()
    expect(screen.getByText(/1 parto \(1\)/)).toBeInTheDocument()
    expect(screen.queryByText(/Crías registradas/)).not.toBeInTheDocument()
    expect(screen.queryByText(/F001 parió/)).not.toBeInTheDocument()
  })

  it('allows finishing an active breeding from the action menu', async () => {
    const onFinish = jest.fn()
    renderWithProviders(
      <BreedingCard record={mockRecord} animals={mockAnimals} onFinish={onFinish} />,
    )

    fireEvent.click(screen.getByText('Abrir acciones'))
    fireEvent.click(screen.getByRole('button', { name: 'Terminar empadre' }))

    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Terminar empadre' }))

    await waitFor(() => expect(onFinish).toHaveBeenCalledWith(mockRecord))
  })

  it('does not offer finishing an already finished breeding', () => {
    renderWithProviders(
      <BreedingCard
        record={{ ...mockRecord, status: 'finished' }}
        animals={mockAnimals}
        onFinish={jest.fn()}
      />,
    )

    expect(screen.queryByText('Abrir acciones')).not.toBeInTheDocument()
  })
})
