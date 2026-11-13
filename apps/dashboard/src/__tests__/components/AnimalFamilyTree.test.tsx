import { render, screen, within } from '@testing-library/react'
import AnimalFamilyTree from '@/components/AnimalFamilyTree'
import type { Animal } from '@/types/animals'

jest.mock('@/components/AnimalBadges', () => ({
  __esModule: true,
  default: ({ animal }: { animal: Animal }) => <span>{animal.animalNumber}</span>,
}))
jest.mock('@/components/Modal', () => ({
  Modal: ({ isOpen, children }: any) => (isOpen ? <div>{children}</div> : null),
}))
const mother = { id: 'mother', animalNumber: '221', gender: 'hembra' } as Animal
const child = (id: string, eventId?: string) =>
  ({
    id,
    animalNumber: id,
    motherId: 'mother',
    birthDate: new Date('2026-10-16T00:08:19Z'),
    records: eventId
      ? [{ id: `birth-${id}`, details: { legacyEventType: 'BIRTH', legacyEventId: eventId } }]
      : [],
  }) as unknown as Animal

it('agrupa crías con el mismo nacimiento importado aunque falte el empadre', () => {
  render(
    <AnimalFamilyTree
      animal={mother}
      allAnimals={[
        mother,
        child('330-A', 'birth1'),
        child('703-V', 'birth1'),
        child('other', 'birth2'),
      ]}
    />,
  )
  const group = screen.getByRole('group', { name: 'Hermanos del mismo parto registrado' })
  expect(within(group).getByText('330-A')).toBeInTheDocument()
  expect(within(group).getByText('703-V')).toBeInTheDocument()
  expect(within(group).queryByText('other')).not.toBeInTheDocument()
})
it('la misma edad no basta para inventar un parto compartido', () => {
  render(<AnimalFamilyTree animal={mother} allAnimals={[mother, child('330-A'), child('703-V')]} />)
  expect(
    screen.queryByRole('group', { name: 'Hermanos del mismo parto registrado' }),
  ).not.toBeInTheDocument()
})

it('agrupa un parto nuevo sin empadre mediante el movimiento persistido de la madre', () => {
  const bornMother = {
    ...mother,
    records: [
      {
        id: 'new-birth',
        eventType: 'parto',
        undoData: {
          action: 'parto',
          documents: [
            { path: 'animals/a', before: null, after: { motherId: 'mother' } },
            { path: 'animals/b', before: null, after: { motherId: 'mother' } },
          ],
        },
      },
    ],
  } as unknown as Animal
  render(
    <AnimalFamilyTree
      animal={bornMother}
      allAnimals={[bornMother, child('a'), child('b'), child('c')]}
    />,
  )
  const group = screen.getByRole('group', { name: 'Hermanos del mismo parto registrado' })
  expect(within(group).getByText('a')).toBeInTheDocument()
  expect(within(group).getByText('b')).toBeInTheDocument()
  expect(within(group).queryByText('c')).not.toBeInTheDocument()
})
