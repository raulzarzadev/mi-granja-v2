/**
 * Test de integración para verificar que serializeObj funciona con Redux
 */

import { store } from '../index'
import { addAnimal } from '../animalsSlice'
import { addBreedingRecord } from '../breedingSlice'
import { addReminder } from '../remindersSlice'

describe('Redux Integration with serializeObj', () => {
  test('should serialize animal with dates correctly', () => {
    const animal = {
      id: 'test-animal-1',
      farmerId: 'test-farmer',
      animalId: 'COW-001',
      type: 'vaca_leche' as const,
      stage: 'lechera' as const,
      weight: 450,
      age: 36,
      birthDate: new Date('2021-01-15T00:00:00.000Z'),
      gender: 'hembra' as const,
      notes: 'Test animal',
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
      updatedAt: new Date('2023-06-01T00:00:00.000Z')
    }

    // Dispatch the action
    store.dispatch(addAnimal(animal))

    // Get the state
    const state = store.getState()
    const storedAnimal = state.animals.animals[0]

    // Verify that dates are serialized as numbers
    expect(typeof storedAnimal.birthDate).toBe('number')
    expect(typeof storedAnimal.createdAt).toBe('number')
    expect(typeof storedAnimal.updatedAt).toBe('number')

    // Verify the values are correct
    expect(storedAnimal.birthDate).toBe(animal.birthDate.getTime())
    expect(storedAnimal.createdAt).toBe(animal.createdAt.getTime())
    expect(storedAnimal.updatedAt).toBe(animal.updatedAt.getTime())

    // Verify other properties remain unchanged
    expect(storedAnimal.id).toBe(animal.id)
    expect(storedAnimal.animalId).toBe(animal.animalId)
    expect(storedAnimal.weight).toBe(animal.weight)
  })

  test('should serialize breeding record with dates correctly', () => {
    const breedingRecord = {
      id: 'test-breeding-1',
      farmerId: 'test-farmer',
      femaleId: 'female-1',
      maleId: 'male-1',
      breedingDate: new Date('2023-01-01T00:00:00.000Z'),
      expectedBirthDate: new Date('2023-10-01T00:00:00.000Z'),
      actualBirthDate: null,
      pregnancyConfirmed: true,
      offspring: ['offspring-1'],
      notes: 'Test breeding',
      createdAt: new Date('2023-01-01T10:00:00.000Z'),
      updatedAt: new Date('2023-01-01T10:00:00.000Z')
    }

    store.dispatch(addBreedingRecord(breedingRecord))

    const state = store.getState()
    const storedRecord = state.breeding.breedingRecords[0]

    expect(typeof storedRecord.breedingDate).toBe('number')
    expect(typeof storedRecord.expectedBirthDate).toBe('number')
    expect(storedRecord.actualBirthDate).toBe(null)
    expect(typeof storedRecord.createdAt).toBe('number')
    expect(typeof storedRecord.updatedAt).toBe('number')

    expect(storedRecord.breedingDate).toBe(
      breedingRecord.breedingDate.getTime()
    )
    expect(storedRecord.expectedBirthDate).toBe(
      breedingRecord.expectedBirthDate!.getTime()
    )
  })

  test('should serialize reminder with dates correctly', () => {
    const reminder = {
      id: 'test-reminder-1',
      farmerId: 'test-farmer',
      animalId: 'test-animal-1',
      title: 'Vaccination',
      description: 'Annual vaccination',
      dueDate: new Date('2023-06-01T00:00:00.000Z'),
      completed: false,
      priority: 'high' as const,
      type: 'medical' as const,
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
      updatedAt: new Date('2023-01-01T00:00:00.000Z')
    }

    store.dispatch(addReminder(reminder))

    const state = store.getState()
    const storedReminder = state.reminders.reminders[0]

    expect(typeof storedReminder.dueDate).toBe('number')
    expect(typeof storedReminder.createdAt).toBe('number')
    expect(typeof storedReminder.updatedAt).toBe('number')

    expect(storedReminder.dueDate).toBe(reminder.dueDate.getTime())
    expect(storedReminder.title).toBe(reminder.title)
    expect(storedReminder.priority).toBe(reminder.priority)
  })

  test('should handle arrays of objects with dates', () => {
    const animals = [
      {
        id: 'animal-1',
        farmerId: 'farmer-1',
        animalId: 'COW-001',
        type: 'vaca_leche' as const,
        stage: 'lechera' as const,
        gender: 'hembra' as const,
        birthDate: new Date('2021-01-01T00:00:00.000Z'),
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z')
      },
      {
        id: 'animal-2',
        farmerId: 'farmer-1',
        animalId: 'COW-002',
        type: 'vaca_engorda' as const,
        stage: 'engorda' as const,
        gender: 'macho' as const,
        birthDate: new Date('2021-02-01T00:00:00.000Z'),
        createdAt: new Date('2023-01-02T00:00:00.000Z'),
        updatedAt: new Date('2023-01-02T00:00:00.000Z')
      }
    ]

    // Clear previous animals and add the array
    store.dispatch({ type: 'animals/setAnimals', payload: animals })

    const state = store.getState()
    const storedAnimals = state.animals.animals

    expect(storedAnimals).toHaveLength(2)

    storedAnimals.forEach((animal, index) => {
      expect(typeof animal.birthDate).toBe('number')
      expect(typeof animal.createdAt).toBe('number')
      expect(typeof animal.updatedAt).toBe('number')

      expect(animal.birthDate).toBe(animals[index].birthDate.getTime())
      expect(animal.createdAt).toBe(animals[index].createdAt.getTime())
      expect(animal.updatedAt).toBe(animals[index].updatedAt.getTime())
    })
  })
})

export {}
