import { groupFemalesByStatus, sortFemalesByAnimalNumber } from '@/components/Dashboard/Animals/AnimalsSection'
import { Animal } from '@/types/animals'
import { FemaleBreedingInfo, BreedingRecord } from '@/types/breedings'

// --- Factories ---

const makeFemale = (overrides: Partial<FemaleBreedingInfo> = {}): FemaleBreedingInfo => ({
  femaleId: `female-${Math.random().toString(36).slice(2, 6)}`,
  pregnancyConfirmedDate: null,
  expectedBirthDate: null,
  actualBirthDate: null,
  offspring: [],
  ...overrides,
})

const makeBreeding = (overrides: Partial<BreedingRecord> = {}): BreedingRecord => ({
  id: 'br-1',
  breedingId: '01-01-26-01',
  farmerId: 'farmer-1',
  maleId: 'male-1',
  breedingDate: new Date('2026-01-01'),
  femaleBreedingInfo: [],
  status: 'active',
  ...overrides,
})

const makeAnimal = (overrides: Partial<Animal> = {}): Animal => ({
  id: `animal-${Math.random().toString(36).slice(2, 6)}`,
  farmerId: 'farmer-1',
  animalNumber: '001',
  type: 'oveja',
  stage: 'reproductor',
  gender: 'hembra',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
} as Animal)

// Simula la lógica de orderedBreedings del componente
function classifyBreedings(records: BreedingRecord[]) {
  const needPregnancyConfirmation: BreedingRecord[] = []
  const terminated: BreedingRecord[] = []

  records.forEach((r) => {
    if (r.status === 'finished') {
      terminated.push(r)
      return
    }
    const hasPending = r.femaleBreedingInfo.some(
      (f) => !f.pregnancyConfirmedDate && !f.actualBirthDate,
    )
    if (hasPending) {
      needPregnancyConfirmation.push(r)
    } else {
      terminated.push(r)
    }
  })

  return { needPregnancyConfirmation, terminated }
}

// Simula la lógica de nursingMotherIds
function getNursingMotherIds(
  allCrias: { motherId: string }[],
): Set<string> {
  const ids = new Set<string>()
  for (const entry of allCrias) {
    if (entry.motherId) ids.add(entry.motherId)
  }
  return ids
}

// Simula la lógica de revertir parto (transformación de datos)
function simulateRevertBirth(record: BreedingRecord, femaleId: string) {
  const femaleInfo = record.femaleBreedingInfo.find((fi) => fi.femaleId === femaleId)
  if (!femaleInfo) return null

  const updatedFemaleInfo = record.femaleBreedingInfo.map((fi) =>
    fi.femaleId === femaleId
      ? { ...fi, actualBirthDate: null, offspring: [] }
      : fi,
  )

  const motherUpdates = {
    birthedAt: null,
    pregnantAt: femaleInfo.pregnancyConfirmedDate ?? null,
  }

  return {
    offspringToDelete: femaleInfo.offspring || [],
    updatedFemaleInfo,
    motherUpdates,
  }
}

// --- Tests ---

describe('groupFemalesByStatus', () => {
  it('agrupa hembras correctamente por status', () => {
    const enEmpadre = makeFemale({ femaleId: 'f1' })
    const embarazada = makeFemale({
      femaleId: 'f2',
      pregnancyConfirmedDate: new Date('2026-02-01'),
    })
    const parida = makeFemale({
      femaleId: 'f3',
      pregnancyConfirmedDate: new Date('2026-02-01'),
      actualBirthDate: new Date('2026-06-01'),
    })

    const groups = groupFemalesByStatus([enEmpadre, embarazada, parida])

    expect(groups).toHaveLength(3)
    expect(groups[0].key).toBe('empadre')
    expect(groups[0].items).toEqual([enEmpadre])
    expect(groups[1].key).toBe('embarazada')
    expect(groups[1].items).toEqual([embarazada])
    expect(groups[2].key).toBe('parida')
    expect(groups[2].items).toEqual([parida])
  })

  it('hembras con birthDate son paridas aunque tengan pregnancyConfirmedDate', () => {
    const parida = makeFemale({
      femaleId: 'f1',
      pregnancyConfirmedDate: new Date('2026-02-01'),
      actualBirthDate: new Date('2026-06-01'),
    })

    const groups = groupFemalesByStatus([parida])

    expect(groups[0].items).toHaveLength(0)
    expect(groups[1].items).toHaveLength(0)
    expect(groups[2].items).toEqual([parida])
  })

  it('maneja lista vacía', () => {
    const groups = groupFemalesByStatus([])
    expect(groups.every((g) => g.items.length === 0)).toBe(true)
  })

  it('múltiples hembras del mismo status se agrupan juntas', () => {
    const females = [
      makeFemale({ femaleId: 'f1' }),
      makeFemale({ femaleId: 'f2' }),
      makeFemale({ femaleId: 'f3', pregnancyConfirmedDate: new Date() }),
    ]

    const groups = groupFemalesByStatus(females)
    expect(groups[0].items).toHaveLength(2) // 2 en empadre
    expect(groups[1].items).toHaveLength(1) // 1 embarazada
    expect(groups[2].items).toHaveLength(0) // 0 paridas
  })
})

describe('sortFemalesByAnimalNumber', () => {
  it('ordena por número de animal numérico', () => {
    const females = [
      makeFemale({ femaleId: 'a3' }),
      makeFemale({ femaleId: 'a1' }),
      makeFemale({ femaleId: 'a2' }),
    ]
    const animals = [
      makeAnimal({ id: 'a1', animalNumber: '100' }),
      makeAnimal({ id: 'a2', animalNumber: '50' }),
      makeAnimal({ id: 'a3', animalNumber: '200' }),
    ]

    const sorted = sortFemalesByAnimalNumber(females, animals)

    expect(sorted[0].femaleId).toBe('a2') // 50
    expect(sorted[1].femaleId).toBe('a1') // 100
    expect(sorted[2].femaleId).toBe('a3') // 200
  })

  it('ordena alfanuméricamente con numeric locale', () => {
    const females = [
      makeFemale({ femaleId: 'a1' }),
      makeFemale({ femaleId: 'a2' }),
      makeFemale({ femaleId: 'a3' }),
    ]
    const animals = [
      makeAnimal({ id: 'a1', animalNumber: '9-A' }),
      makeAnimal({ id: 'a2', animalNumber: '10-A' }),
      makeAnimal({ id: 'a3', animalNumber: '2-A' }),
    ]

    const sorted = sortFemalesByAnimalNumber(females, animals)

    expect(sorted[0].femaleId).toBe('a3') // 2-A
    expect(sorted[1].femaleId).toBe('a1') // 9-A
    expect(sorted[2].femaleId).toBe('a2') // 10-A
  })

  it('no muta el array original', () => {
    const females = [
      makeFemale({ femaleId: 'a2' }),
      makeFemale({ femaleId: 'a1' }),
    ]
    const animals = [
      makeAnimal({ id: 'a1', animalNumber: '1' }),
      makeAnimal({ id: 'a2', animalNumber: '2' }),
    ]

    const sorted = sortFemalesByAnimalNumber(females, animals)

    expect(sorted).not.toBe(females)
    expect(females[0].femaleId).toBe('a2') // original sin modificar
  })
})

describe('terminar empadre — clasificación de records', () => {
  it('empadre finished se mueve a terminados', () => {
    const record = makeBreeding({ status: 'finished', femaleBreedingInfo: [makeFemale()] })
    const { needPregnancyConfirmation, terminated } = classifyBreedings([record])

    expect(needPregnancyConfirmation).toHaveLength(0)
    expect(terminated).toHaveLength(1)
  })

  it('empadre activo con pendientes queda en needPregnancyConfirmation', () => {
    const record = makeBreeding({
      status: 'active',
      femaleBreedingInfo: [makeFemale()],
    })
    const { needPregnancyConfirmation, terminated } = classifyBreedings([record])

    expect(needPregnancyConfirmation).toHaveLength(1)
    expect(terminated).toHaveLength(0)
  })

  it('empadre activo sin pendientes (todas confirmadas) va a terminados', () => {
    const record = makeBreeding({
      status: 'active',
      femaleBreedingInfo: [
        makeFemale({ pregnancyConfirmedDate: new Date() }),
        makeFemale({ actualBirthDate: new Date() }),
      ],
    })
    const { needPregnancyConfirmation, terminated } = classifyBreedings([record])

    expect(needPregnancyConfirmation).toHaveLength(0)
    expect(terminated).toHaveLength(1)
  })

  it('al terminar, embarazadas y paridas conservan sus datos', () => {
    const embarazada = makeFemale({
      femaleId: 'f1',
      pregnancyConfirmedDate: new Date('2026-02-01'),
      expectedBirthDate: new Date('2026-07-01'),
    })
    const parida = makeFemale({
      femaleId: 'f2',
      pregnancyConfirmedDate: new Date('2026-02-01'),
      actualBirthDate: new Date('2026-06-15'),
      offspring: ['cria-1'],
    })
    const enEmpadre = makeFemale({ femaleId: 'f3' })

    const terminated: BreedingRecord = makeBreeding({
      femaleBreedingInfo: [embarazada, parida, enEmpadre],
      status: 'finished',
    })

    const groups = groupFemalesByStatus(terminated.femaleBreedingInfo)

    expect(groups[1].items[0].pregnancyConfirmedDate).toEqual(new Date('2026-02-01'))
    expect(groups[2].items[0].actualBirthDate).toEqual(new Date('2026-06-15'))
    expect(groups[2].items[0].offspring).toEqual(['cria-1'])
    expect(groups[0].items[0].pregnancyConfirmedDate).toBeNull()
    expect(groups[0].items[0].actualBirthDate).toBeNull()
  })
})

describe('revertir parto — transformación de datos', () => {
  it('limpia actualBirthDate y offspring de la hembra', () => {
    const record = makeBreeding({
      femaleBreedingInfo: [
        makeFemale({
          femaleId: 'f1',
          pregnancyConfirmedDate: new Date('2026-02-01'),
          actualBirthDate: new Date('2026-06-15'),
          offspring: ['cria-1', 'cria-2'],
        }),
        makeFemale({
          femaleId: 'f2',
          pregnancyConfirmedDate: new Date('2026-03-01'),
          actualBirthDate: new Date('2026-07-01'),
          offspring: ['cria-3'],
        }),
      ],
    })

    const result = simulateRevertBirth(record, 'f1')!

    // Solo f1 se revierte, f2 no cambia
    const f1 = result.updatedFemaleInfo.find((fi) => fi.femaleId === 'f1')!
    const f2 = result.updatedFemaleInfo.find((fi) => fi.femaleId === 'f2')!

    expect(f1.actualBirthDate).toBeNull()
    expect(f1.offspring).toEqual([])
    expect(f1.pregnancyConfirmedDate).toEqual(new Date('2026-02-01')) // se conserva

    expect(f2.actualBirthDate).toEqual(new Date('2026-07-01')) // no cambia
    expect(f2.offspring).toEqual(['cria-3'])
  })

  it('la madre vuelve a embarazada (pregnantAt restaurado)', () => {
    const record = makeBreeding({
      femaleBreedingInfo: [
        makeFemale({
          femaleId: 'f1',
          pregnancyConfirmedDate: new Date('2026-02-15'),
          actualBirthDate: new Date('2026-06-15'),
          offspring: ['cria-1'],
        }),
      ],
    })

    const result = simulateRevertBirth(record, 'f1')!

    expect(result.motherUpdates.birthedAt).toBeNull()
    expect(result.motherUpdates.pregnantAt).toEqual(new Date('2026-02-15'))
  })

  it('identifica las crías a eliminar', () => {
    const record = makeBreeding({
      femaleBreedingInfo: [
        makeFemale({
          femaleId: 'f1',
          actualBirthDate: new Date('2026-06-15'),
          offspring: ['cria-1', 'cria-2', 'cria-3'],
        }),
      ],
    })

    const result = simulateRevertBirth(record, 'f1')!

    expect(result.offspringToDelete).toEqual(['cria-1', 'cria-2', 'cria-3'])
  })

  it('retorna null si la hembra no existe en el record', () => {
    const record = makeBreeding({
      femaleBreedingInfo: [makeFemale({ femaleId: 'f1' })],
    })

    expect(simulateRevertBirth(record, 'f-inexistente')).toBeNull()
  })

  it('maneja parto sin crías (offspring vacío)', () => {
    const record = makeBreeding({
      femaleBreedingInfo: [
        makeFemale({
          femaleId: 'f1',
          pregnancyConfirmedDate: new Date('2026-02-01'),
          actualBirthDate: new Date('2026-06-15'),
          offspring: [],
        }),
      ],
    })

    const result = simulateRevertBirth(record, 'f1')!

    expect(result.offspringToDelete).toEqual([])
    expect(result.motherUpdates.pregnantAt).toEqual(new Date('2026-02-01'))
  })

  it('después de revertir, la hembra pasa de parida a embarazada en groupFemalesByStatus', () => {
    const record = makeBreeding({
      femaleBreedingInfo: [
        makeFemale({
          femaleId: 'f1',
          pregnancyConfirmedDate: new Date('2026-02-01'),
          actualBirthDate: new Date('2026-06-15'),
          offspring: ['cria-1'],
        }),
      ],
    })

    // Antes de revertir: parida
    const groupsBefore = groupFemalesByStatus(record.femaleBreedingInfo)
    expect(groupsBefore[2].items).toHaveLength(1) // parida
    expect(groupsBefore[1].items).toHaveLength(0) // no embarazada

    // Después de revertir
    const result = simulateRevertBirth(record, 'f1')!
    const groupsAfter = groupFemalesByStatus(result.updatedFemaleInfo)
    expect(groupsAfter[2].items).toHaveLength(0) // ya no parida
    expect(groupsAfter[1].items).toHaveLength(1) // ahora embarazada
    expect(groupsAfter[1].items[0].pregnancyConfirmedDate).toEqual(new Date('2026-02-01'))
  })
})

describe('madres amamantando — conteo', () => {
  it('cuenta madres únicas de las crías', () => {
    const crias = [
      { motherId: 'mom-1' },
      { motherId: 'mom-1' }, // misma madre, no se cuenta doble
      { motherId: 'mom-2' },
      { motherId: 'mom-3' },
    ]

    const ids = getNursingMotherIds(crias)

    expect(ids.size).toBe(3)
    expect(ids.has('mom-1')).toBe(true)
    expect(ids.has('mom-2')).toBe(true)
    expect(ids.has('mom-3')).toBe(true)
  })

  it('ignora crías sin madre (motherId vacío)', () => {
    const crias = [
      { motherId: 'mom-1' },
      { motherId: '' },
      { motherId: '' },
    ]

    const ids = getNursingMotherIds(crias)

    expect(ids.size).toBe(1)
  })

  it('lista vacía retorna 0 madres', () => {
    expect(getNursingMotherIds([]).size).toBe(0)
  })
})

describe('búsqueda de crías por madre', () => {
  // Simula la lógica de filtrado de crías standalone por búsqueda
  function filterCriasBySearch(
    crias: { animal: Animal; motherId: string }[],
    animals: Animal[],
    searchQuery: string,
  ) {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return crias
    return crias.filter((entry) => {
      const num = entry.animal.animalNumber?.toLowerCase() || ''
      const name = entry.animal.name?.toLowerCase() || ''
      if (num.includes(q) || name.includes(q)) return true
      if (entry.motherId) {
        const mother = animals.find((an) => an.id === entry.motherId)
        const motherNum = mother?.animalNumber?.toLowerCase() || ''
        const motherName = mother?.name?.toLowerCase() || ''
        if (motherNum.includes(q) || motherName.includes(q)) return true
      }
      return false
    })
  }

  const mother = makeAnimal({ id: 'mom-241', animalNumber: '241-A', name: 'Luna' })
  const cria1 = makeAnimal({ id: 'c1', animalNumber: '7hy', stage: 'cria' })
  const cria2 = makeAnimal({ id: 'c2', animalNumber: '9l2', stage: 'cria' })
  const allAnimals = [mother, cria1, cria2]

  const criaEntries = [
    { animal: cria1, motherId: 'mom-241' },
    { animal: cria2, motherId: 'mom-241' },
  ]

  it('buscar por número de madre muestra sus crías', () => {
    const filtered = filterCriasBySearch(criaEntries, allAnimals, '241')
    expect(filtered).toHaveLength(2)
  })

  it('buscar por nombre de madre muestra sus crías', () => {
    const filtered = filterCriasBySearch(criaEntries, allAnimals, 'Luna')
    expect(filtered).toHaveLength(2)
  })

  it('buscar por número de cría muestra solo esa cría', () => {
    const filtered = filterCriasBySearch(criaEntries, allAnimals, '7hy')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].animal.id).toBe('c1')
  })

  it('búsqueda sin resultados retorna vacío', () => {
    const filtered = filterCriasBySearch(criaEntries, allAnimals, 'xyz-999')
    expect(filtered).toHaveLength(0)
  })

  it('búsqueda vacía retorna todas', () => {
    const filtered = filterCriasBySearch(criaEntries, allAnimals, '')
    expect(filtered).toHaveLength(2)
  })

  it('búsqueda es case-insensitive', () => {
    const filtered = filterCriasBySearch(criaEntries, allAnimals, 'luna')
    expect(filtered).toHaveLength(2)
  })
})
