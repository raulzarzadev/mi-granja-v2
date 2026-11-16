import { fireEvent, render, screen } from '@testing-library/react'
import FarmTaskRow from '@/components/FarmTaskRow'

jest.mock('@/components/AnimalTag', () => ({
  __esModule: true,
  default: ({ animal, showModalOnClick }: any) => (
    <span data-testid="animal-tag" data-modal={String(!!showModalOnClick)}>
      {animal.animalNumber}
    </span>
  ),
}))

it('abre el detalle del pendiente con la etiqueta del animal', () => {
  const onRegister = jest.fn()
  render(
    <FarmTaskRow
      onRegister={onRegister}
      task={{
        id: 'parto-a1',
        kind: 'parto',
        animal: { id: 'a1', animalNumber: '201-A' } as any,
        dueDate: new Date(2026, 10, 10),
        daysUntil: -5,
      }}
    />,
  )
  expect(screen.queryByTestId('animal-tag')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Parto · 201-A/ }))
  expect(screen.getByText('Parto pendiente')).toBeInTheDocument()
  expect(screen.getByText('Fecha esperada de parto')).toBeInTheDocument()
  expect(screen.getAllByText('Vencido hace 5d').length).toBeGreaterThan(0)
  expect(screen.getByTestId('animal-tag')).toHaveAttribute('data-modal', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Registrar parto' }))
  expect(onRegister).toHaveBeenCalledWith(expect.objectContaining({ id: 'parto-a1' }))
  expect(screen.queryByText('Parto pendiente')).not.toBeInTheDocument()
})
