import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ReminderForm from '@/components/ReminderForm'
import type { Animal } from '@/types/animals'

jest.mock('@/hooks/useCurrentFarmAreas', () => ({ useCurrentFarmAreas: () => [] }))
jest.mock('@/components/inputs/InputSelectAssignees', () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock('@/components/inputs/InputSelectAnimals', () => ({
  __esModule: true,
  default: ({ onAdd }: { onAdd: (id: string) => void }) => (
    <button type="button" onClick={() => onAdd('a1')}>
      Seleccionar animal 1
    </button>
  ),
}))

const animals = [{ id: 'a1', animalNumber: '101' }] as Animal[]

const renderForm = (props: Partial<React.ComponentProps<typeof ReminderForm>> = {}) => {
  const onSubmit = jest.fn().mockResolvedValue(undefined)
  render(<ReminderForm animals={animals} onSubmit={onSubmit} onCancel={jest.fn()} {...props} />)
  return { onSubmit }
}

const title = () => screen.getByLabelText('Titulo *') as HTMLInputElement

it('suggests the title from the type until the user rewrites it', () => {
  renderForm()
  expect(title().value).toBe('Recordatorio')
  fireEvent.click(screen.getByRole('radio', { name: /Sanidad/ }))
  expect(title().value).toBe('Sanidad')
  fireEvent.change(title(), { target: { value: 'Vacuna triple' } })
  fireEvent.click(screen.getByRole('radio', { name: /Peso/ }))
  expect(title().value).toBe('Vacuna triple')
})

it('only shows and sends animals when "Referir animales" is checked', async () => {
  const { onSubmit } = renderForm()
  expect(screen.queryByText('Seleccionar animal 1')).not.toBeInTheDocument()

  const checkbox = screen.getByLabelText('Referir animales')
  fireEvent.click(checkbox)
  fireEvent.click(screen.getByText('Seleccionar animal 1'))
  fireEvent.click(screen.getByRole('button', { name: 'Crear Recordatorio' }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  expect(onSubmit.mock.calls[0][0].animalNumbers).toEqual(['101'])

  fireEvent.click(checkbox)
  fireEvent.click(screen.getByRole('button', { name: 'Crear Recordatorio' }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2))
  expect(onSubmit.mock.calls[1][0].animalNumbers).toBeUndefined()
})

it('starts with animals checked when they come preselected', () => {
  renderForm({ initialAnimalIds: ['a1'] })
  expect(screen.getByLabelText('Referir animales')).toBeChecked()
})
