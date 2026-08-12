jest.mock('date-fns', () => ({
  toDate: (d: any) => (d instanceof Date ? d : new Date(d)),
}))

import {
  computeAnimalStage,
  getWeaningDueDate,
  getWeaningStatus,
  isActiveCalf,
} from '../lib/animal-utils'
import type { Animal } from '../types/animals'

const NOW = new Date(2026, 7, 12, 12)

const daysBefore = (days: number): Date => {
  const date = new Date(NOW)
  date.setDate(date.getDate() - days)
  return date
}

const calf = (overrides: Partial<Animal> = {}): Animal => ({
  id: 'calf-1',
  farmerId: 'farmer-1',
  animalNumber: 'TEST-1',
  type: 'vaca',
  gender: 'hembra',
  stage: 'cria',
  status: 'activo',
  isWeaned: false,
  birthDate: daysBefore(30),
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
})

describe('reglas canónicas de crías y destete', () => {
  it('mantiene como cría a una cría joven no destetada', () => {
    const animal = calf({ birthDate: daysBefore(30) })
    expect(computeAnimalStage(animal)).toBe('cria')
    expect(isActiveCalf(animal)).toBe(true)
  })

  it('mantiene como cría un destete próximo y muestra badge amarillo', () => {
    const animal = calf({ birthDate: daysBefore(110) })
    expect(computeAnimalStage(animal)).toBe('cria')
    expect(getWeaningStatus(animal, NOW)).toMatchObject({
      kind: 'soon',
      tone: 'warning',
      daysUntilDue: 10,
      label: 'En 10d',
    })
  })

  it.each([
    '324-A',
    '663-V',
    '669-V',
  ])('mantiene la cría migrada %s aunque su destete venció hace 40 días', (animalNumber) => {
    const animal = calf({ animalNumber, birthDate: daysBefore(160) })
    expect(computeAnimalStage(animal)).toBe('cria')
    expect(isActiveCalf(animal)).toBe(true)
    expect(getWeaningStatus(animal, NOW)).toMatchObject({
      kind: 'overdue',
      tone: 'danger',
      daysUntilDue: -40,
      label: 'Hace 40d',
    })
  })

  it('excluye de crías cuando el destete fue registrado', () => {
    const animal = calf({ isWeaned: true })
    expect(computeAnimalStage(animal)).toBe('juvenil')
    expect(isActiveCalf(animal)).toBe(false)
    expect(getWeaningStatus(animal, NOW).kind).toBe('completed')
  })

  it('usa customWeaningDays en vez del default de la especie', () => {
    const animal = calf({ birthDate: daysBefore(80), customWeaningDays: 90 })
    expect(getWeaningDueDate(animal)).toEqual(daysBefore(-10))
    expect(getWeaningStatus(animal, NOW)).toMatchObject({
      kind: 'soon',
      daysUntilDue: 10,
    })
  })

  it('marca hoy sin cambiar la etapa real', () => {
    const animal = calf({ birthDate: daysBefore(120) })
    expect(getWeaningStatus(animal, NOW)).toMatchObject({
      kind: 'today',
      tone: 'warning',
      label: 'Hoy',
    })
    expect(computeAnimalStage(animal)).toBe('cria')
  })
})
