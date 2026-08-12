import {
  CURRENT_BACKUP_VERSION,
  normalizeBackupFile,
  prepareAnimalForRestore,
  prepareBreedingForRestore,
  validateBackupFile,
} from '@/lib/backup-serialization'

const DATE = '2026-08-12T12:00:00.000Z'

function baseBackup() {
  return {
    _meta: {
      version: CURRENT_BACKUP_VERSION,
      exportDate: DATE,
      farmId: 'farm-source',
      farmName: 'Origen',
      exportedBy: 'user-1',
      counts: {},
    },
    farm: { id: 'farm-source', name: 'Origen' },
    animals: [
      {
        id: 'animal-1',
        animalNumber: '001',
        type: 'vaca',
        stage: 'reproductor',
        gender: 'hembra',
        createdAt: DATE,
        updatedAt: DATE,
        records: [
          {
            id: 'record-1',
            type: 'weight',
            category: 'general',
            title: '420 kg',
            weightGrams: 420000,
            date: DATE,
            createdAt: DATE,
            createdBy: 'user-1',
          },
        ],
      },
    ],
    breedingRecords: [],
    reminders: [],
    farmInvitations: [],
    sales: [],
  }
}

describe('backup serialization v2', () => {
  it('validates a current backup and recalculates record counts', () => {
    const result = validateBackupFile(baseBackup(), 'farm-target')

    expect(result.valid).toBe(true)
    expect(result.data?._meta.counts).toMatchObject({ animals: 1, animalRecords: 1 })
    expect(result.warnings).toContainEqual(expect.stringContaining('granja actual'))
  })

  it('converts embedded and collection-level v1 weights into animal records', () => {
    const legacy = baseBackup() as any
    legacy._meta.version = 1
    legacy.animals[0].records = []
    legacy.animals[0].weightRecords = [{ date: DATE, weight: 410000, notes: 'embebido' }]
    legacy.weightRecords = [
      {
        id: 'legacy-global',
        animalNumber: '001',
        date: '2026-08-11T12:00:00.000Z',
        weight: 400000,
      },
      { animalNumber: 'fuera-del-respaldo', date: DATE, weight: 999000 },
    ]

    const normalized = normalizeBackupFile(legacy)
    const animal = normalized.animals[0]
    const records = animal.records as Record<string, unknown>[]

    expect(normalized._meta.version).toBe(2)
    expect(animal).not.toHaveProperty('weightRecords')
    expect(normalized).not.toHaveProperty('weightRecords')
    expect(records).toHaveLength(2)
    expect(records.every((record) => record.type === 'weight')).toBe(true)
    expect(records.map((record) => record.weightGrams)).toEqual([410000, 400000])
  })

  it('rejects invalid weight records and duplicate animal numbers', () => {
    const invalid = baseBackup()
    invalid.animals.push({ ...invalid.animals[0], id: 'animal-2' })
    ;(invalid.animals[0].records[0] as Record<string, unknown>).weightGrams = 0

    const result = validateBackupFile(invalid, 'farm-source')

    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.stringContaining('weightGrams'))
    expect(result.errors).toContainEqual(expect.stringContaining('número duplicado'))
  })

  it('keeps only pending invitations', () => {
    const backup = baseBackup() as any
    backup.farmInvitations = [
      { id: 'pending', email: 'a@example.com', status: 'pending' },
      { id: 'accepted', email: 'b@example.com', status: 'accepted' },
    ]

    const normalized = normalizeBackupFile(backup)

    expect(normalized.farmInvitations).toEqual([
      expect.objectContaining({ id: 'pending', status: 'pending' }),
    ])
  })

  it('remaps every animal and breeding reference used by the current model', () => {
    const animalMap = new Map([
      ['mother-old', 'mother-new'],
      ['father-old', 'father-new'],
      ['child-old', 'child-new'],
    ])
    const breedingMap = new Map([['breeding-old', 'breeding-new']])
    const animal = prepareAnimalForRestore(
      {
        id: 'child-old',
        motherId: 'mother-old',
        fatherId: 'father-old',
        pregnantBy: 'father-old',
        pregnantBreedingRecordId: 'breeding-old',
        currentAreaId: 'area-old',
        records: [{ id: 'bulk', appliedToAnimals: ['mother-old', 'child-old'] }],
      },
      animalMap,
      breedingMap,
      new Map([['area-old', 'area-new']]),
      'farm-new',
      'user-new',
    )
    const breeding = prepareBreedingForRestore(
      {
        id: 'breeding-old',
        maleId: 'father-old',
        femaleBreedingInfo: [{ femaleId: 'mother-old', offspring: ['child-old'] }],
      },
      animalMap,
      'farm-new',
      'user-new',
    )

    expect(animal).toMatchObject({
      motherId: 'mother-new',
      fatherId: 'father-new',
      pregnantBy: 'father-new',
      pregnantBreedingRecordId: 'breeding-new',
      currentAreaId: 'area-new',
      farmId: 'farm-new',
      farmerId: 'user-new',
      records: [{ appliedToAnimals: ['mother-new', 'child-new'] }],
    })
    expect(animal).not.toHaveProperty('id')
    expect(breeding).toMatchObject({
      maleId: 'father-new',
      femaleBreedingInfo: [{ femaleId: 'mother-new', offspring: ['child-new'] }],
    })
  })
})
