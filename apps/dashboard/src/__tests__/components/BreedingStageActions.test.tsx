import { fireEvent, render, screen } from '@testing-library/react'
import BreedingStageActions from '@/components/BreedingStageActions'

let canDelete = true
jest.mock('@/hooks/useFarmPermissions', () => ({
  useFarmPermissions: () => ({
    has: (_module: string, action: string) => action !== 'delete' || canDelete,
  }),
}))
jest.mock('@/components/ModalAnimalDetails', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ModalBreedingDetails', () => ({
  __esModule: true,
  default: ({ initialEditing, initialRemovingAnimal }: any) => (
    <p>
      {initialEditing ? 'Editar monta' : `Confirmar sacar ${initialRemovingAnimal.animalNumber}`}
    </p>
  ),
}))
const animal = { id: 'male', animalNumber: '02-H' } as any
const record = {
  id: 'record',
  maleId: 'male',
  status: 'active',
  femaleBreedingInfo: [{ femaleId: 'female' }],
} as any
beforeEach(() => {
  canDelete = true
})
it('opens the existing mating editor', () => {
  render(<BreedingStageActions animal={animal} animals={[animal]} records={[record]} />)
  fireEvent.click(screen.getByRole('button', { name: 'Configurar monta' }))
  expect(screen.getByText('Editar monta')).toBeInTheDocument()
})
it('opens removal confirmation rather than executing immediately', () => {
  render(<BreedingStageActions animal={animal} animals={[animal]} records={[record]} />)
  fireEvent.click(screen.getByRole('button', { name: 'Sacar del empadre' }))
  expect(screen.getByText('Confirmar sacar 02-H')).toBeInTheDocument()
})
it('requires delete permission to remove the male', () => {
  canDelete = false
  render(<BreedingStageActions animal={animal} animals={[animal]} records={[record]} />)
  expect(screen.getByRole('button', { name: 'Sacar del empadre' })).toBeDisabled()
})
it('does not guess when more than one mating matches', () => {
  render(
    <BreedingStageActions
      animal={animal}
      animals={[animal]}
      records={[record, { ...record, id: 'other' }]}
    />,
  )
  expect(screen.getByRole('status')).toHaveTextContent('Hay varios empadres asociados')
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
