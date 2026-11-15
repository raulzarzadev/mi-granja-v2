import { render, screen } from '@testing-library/react'
import ModalChangeStage from '@/components/ModalChangeStage'

const mother = {
  id: 'mother',
  animalNumber: '01-D',
  type: 'ovejo',
  gender: 'hembra',
  stage: 'reproductor',
  computedStage: 'embarazos',
  pregnantBy: 'father',
}
let records: any[] = []
jest.mock('react-redux', () => ({
  useSelector: (selector: any) =>
    selector({ auth: {}, farm: {}, breeding: { breedingRecords: records } }),
}))
jest.mock('@/components/AnimalTag', () => ({
  __esModule: true,
  default: ({ animal }: any) => <span>Padre #{animal.animalNumber}</span>,
}))
jest.mock('@/components/Icon/emoji-icons', () => ({ EmojiIcon: () => null }))
jest.mock('@/lib/changeStage', () => ({
  getApplicableTargets: () => [],
  getFamilyContext: () => null,
}))
jest.mock('@/lib/analytics/track', () => ({ trackAnimalStageChanged: jest.fn() }))
it('shows the expected birth, father and associated mating, including a finished mating', () => {
  records = [
    {
      id: 'record',
      breedingId: 'MONTA-1',
      maleId: 'father',
      status: 'finished',
      breedingDate: new Date(2026, 5, 1),
      femaleBreedingInfo: [
        {
          femaleId: 'mother',
          pregnancyConfirmedDate: new Date(2026, 6, 1),
          expectedBirthDate: new Date(2026, 10, 20),
        },
      ],
    },
  ]
  render(
    <ModalChangeStage
      isOpen
      embedded
      onClose={() => {}}
      animals={[mother] as any}
      allAnimals={[mother, { id: 'father', animalNumber: '02' }] as any}
    />,
  )
  expect(screen.getByText('Fecha aproximada de parto')).toBeInTheDocument()
  expect(screen.getByText(/20 de noviembre de 2026/)).toBeInTheDocument()
  expect(screen.getByText('Padre #02')).toBeInTheDocument()
  expect(screen.getByText(/MONTA-1/)).toBeInTheDocument()
  expect(screen.queryByText('Acciones no disponibles desde esta vista.')).not.toBeInTheDocument()
})
it('shows explicit missing data without guessing a mating', () => {
  records = []
  render(
    <ModalChangeStage
      isOpen
      embedded
      onClose={() => {}}
      animals={[mother] as any}
      allAnimals={[mother] as any}
    />,
  )
  expect(screen.getByText('Sin fecha registrada')).toBeInTheDocument()
  expect(screen.getByText('Sin padre registrado')).toBeInTheDocument()
  expect(screen.getByText('Sin monta asociada')).toBeInTheDocument()
})
