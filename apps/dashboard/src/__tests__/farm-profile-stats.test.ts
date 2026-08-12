import { computeFarmProfileStats, formatFarmProfile } from '@/lib/admin/farm-profile-stats'

describe('farm profile statistics', () => {
  it('aggregates multiple purposes and species without counting deleted farms', () => {
    const stats = computeFarmProfileStats([
      {
        id: 'farm-1',
        ownerId: 'user-1',
        location: { country: 'México' },
        productionProfile: {
          activityType: 'livestock',
          productionPurposes: ['breeding', 'milk'],
          animalSpecies: ['vaca', 'cabra'],
        },
      },
      {
        id: 'farm-2',
        ownerId: 'user-2',
      },
      {
        id: 'farm-deleted',
        deletedAt: new Date(),
        productionProfile: { activityType: 'crops', cropTypes: ['grains'] },
      },
    ])

    expect(stats.totalFarms).toBe(2)
    expect(stats.profiledFarms).toBe(1)
    expect(stats.missingProfiles).toBe(1)
    expect(stats.coveragePercent).toBe(50)
    expect(stats.activities).toEqual([{ key: 'livestock', label: 'Ganadería', count: 1 }])
    expect(stats.purposes).toEqual([
      { key: 'milk', label: 'Leche', count: 1 },
      { key: 'breeding', label: 'Reproducción', count: 1 },
    ])
    expect(stats.species).toEqual([
      { key: 'vaca', label: 'Bovinos', count: 1 },
      { key: 'cabra', label: 'Caprinos', count: 1 },
    ])
  })

  it('formats profile summaries and marks legacy farms', () => {
    expect(formatFarmProfile()).toBe('Sin perfil')
    expect(
      formatFarmProfile({
        activityType: 'mixed',
        productionPurposes: ['meat'],
        cropTypes: ['forage'],
      }),
    ).toBe('Mixta · Carne / engorda · Forrajes / pasturas')
  })
})
