import { render, screen } from '@testing-library/react'
import ReminderCard from '@/components/ReminderCard'

jest.mock('@/components/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({ notify: jest.fn(), confirm: jest.fn() }),
}))
jest.mock('@/components/AnimalTag', () => ({
  __esModule: true,
  default: ({ animal, showModalOnClick }: any) => (
    <span data-testid="animal-tag" data-modal={String(!!showModalOnClick)}>
      {animal.animalNumber}
    </span>
  ),
}))

it('muestra la etiqueta del animal con acceso a sus detalles', () => {
  render(
    <ReminderCard
      reminder={
        {
          id: 'r1',
          title: 'Sanidad',
          type: 'medical',
          priority: 'medium',
          dueDate: new Date(),
          completed: false,
          animalNumbers: ['11-R'],
        } as any
      }
      animals={[{ id: 'a1', animalNumber: '11-R', type: 'oveja' }] as any}
    />,
  )
  const tag = screen.getByTestId('animal-tag')
  expect(tag).toHaveTextContent('11-R')
  expect(tag).toHaveAttribute('data-modal', 'true')
})
