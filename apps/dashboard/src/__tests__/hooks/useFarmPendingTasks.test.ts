jest.mock('@/hooks/useAnimalCRUD', () => ({ useAnimalCRUD: () => ({ animals: [] }) }))

import { buildFarmPendingTasks } from '@/hooks/useFarmPendingTasks'

const now = new Date(2026, 10, 15, 10)
const daysAgo = (n: number) => new Date(2026, 10, 15 - n, 12)

const pregnantEntry = (id: string, expected: Date) => ({
  animal: { id, animalNumber: id, type: 'oveja', gender: 'hembra', pregnantAt: daysAgo(100) },
  record: null,
  info: { femaleId: id, expectedBirthDate: expected },
  father: null,
})

it('incluye partos vencidos sin importar antigüedad y próximos dentro de 7 días', () => {
  const tasks = buildFarmPendingTasks({
    activeAnimals: [],
    pregnant: [
      pregnantEntry('vencido', daysAgo(40)),
      pregnantEntry('pronto', daysAgo(-5)),
      pregnantEntry('lejos', daysAgo(-30)),
    ] as any,
    now,
  })
  expect(tasks.map((t) => [t.animal.id, t.daysUntil])).toEqual([
    ['vencido', -40],
    ['pronto', 5],
  ])
})

it('incluye destetes de crías sin destetar vencidos o de la próxima semana', () => {
  const calf = (id: string, bornDaysAgo: number, extra = {}) => ({
    id,
    animalNumber: id,
    type: 'oveja',
    stage: 'cria',
    status: 'activo',
    birthDate: daysAgo(bornDaysAgo),
    customWeaningDays: 60,
    ...extra,
  })
  const tasks = buildFarmPendingTasks({
    activeAnimals: [
      calf('vencida', 70),
      calf('hoy', 60),
      calf('semana', 55),
      calf('lejos', 10),
      calf('destetada', 90, { isWeaned: true }),
    ] as any,
    pregnant: [],
    now,
  })
  expect(tasks.map((t) => [t.kind, t.animal.id, t.daysUntil])).toEqual([
    ['destete', 'vencida', -10],
    ['destete', 'hoy', 0],
    ['destete', 'semana', 5],
  ])
})
