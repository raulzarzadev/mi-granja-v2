import { act, fireEvent, render, screen, within } from '@testing-library/react'
import TabAreas from '@/components/Dashboard/Animals/tabs/TabAreas'

const mockPersist = jest.fn()
const mockNotify = jest.fn()
jest.mock('@/hooks/useAnimalCRUD', () => ({ useAnimalCRUD: () => ({ assignArea: mockPersist }) }))
jest.mock('@/hooks/useFarmCRUD', () => ({ useFarmCRUD: () => ({ currentFarm: { id: 'farm-1' } }) }))
jest.mock('@/components/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({ notify: mockNotify }),
}))
jest.mock('@/components/Dashboard/Animals/FarmMapEditor', () => ({
  UNASSIGNED_AREA_ID: '__unassigned__',
  __esModule: true,
  default: ({ animalsByArea, onMoveAnimal, savingIds }: any) => (
    <div>
      {[...animalsByArea].map(([id, animals]: any) => (
        <section aria-label={id} key={id}>
          {animals.map((animal: any) => (
            <button
              key={animal.id}
              disabled={savingIds.has(animal.id)}
              onClick={() => onMoveAnimal(animal.id, 'area-2')}
            >
              Mover {animal.animalNumber}
            </button>
          ))}
        </section>
      ))}
    </div>
  ),
}))
function deferred() {
  let resolve!: () => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<void>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const animals = [{ id: 'animal-1', animalNumber: '233', currentAreaId: 'area-1' }] as any
const areas = [
  { id: 'area-1', name: 'Área 1', isActive: true },
  { id: 'area-2', name: 'Área 2', isActive: true },
] as any
beforeEach(() => {
  jest.clearAllMocks()
})

it('shows an instant move, restores a failed request, notifies and retries from the recovery banner', async () => {
  const first = deferred()
  const second = deferred()
  mockPersist.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  render(<TabAreas animals={animals} areas={areas} />)
  fireEvent.click(screen.getByRole('button', { name: 'Mover 233' }))
  expect(
    within(screen.getByRole('region', { name: 'area-2' })).getByRole('button', {
      name: 'Mover 233',
    }),
  ).toBeEnabled()
  await act(async () => {
    first.reject(new Error('offline'))
    await Promise.resolve()
    await Promise.resolve()
  })
  expect(
    within(screen.getByRole('region', { name: 'area-1' })).getByRole('button', {
      name: 'Mover 233',
    }),
  ).toBeEnabled()
  expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('233'), 'error')
  expect(screen.getByRole('alert')).toHaveTextContent('Área 2')
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(
    within(screen.getByRole('region', { name: 'area-2' })).getByRole('button', {
      name: 'Mover 233',
    }),
  ).toBeEnabled()
  await act(async () => {
    second.resolve()
    await Promise.resolve()
  })
  expect(mockPersist).toHaveBeenCalledTimes(2)
})
