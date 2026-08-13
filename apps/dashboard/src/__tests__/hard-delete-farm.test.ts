import { FARM_SCOPED_COLLECTIONS, hardDeleteFarm } from '@/lib/admin/hard-delete-farm'

function makeFirestore(documentCounts: Record<string, number>) {
  const remaining = new Map(Object.entries(documentCounts))
  const committedBatches: string[][] = []
  const deletedFarms: string[] = []

  const firestore = {
    collection: jest.fn((collectionName: string) => {
      if (collectionName === 'farms') {
        return {
          doc: (farmId: string) => ({
            delete: jest.fn(async () => deletedFarms.push(farmId)),
          }),
        }
      }

      const queryApi = {
        where: jest.fn(() => queryApi),
        limit: jest.fn(() => queryApi),
        get: jest.fn(async () => {
          const count = Math.min(400, remaining.get(collectionName) ?? 0)
          return {
            empty: count === 0,
            size: count,
            docs: Array.from({ length: count }, (_, index) => ({
              ref: { collectionName, id: `${collectionName}-${index}` },
            })),
          }
        }),
      }
      return queryApi
    }),
    batch: jest.fn(() => {
      const refs: Array<{ collectionName: string; id: string }> = []
      return {
        delete: (ref: { collectionName: string; id: string }) => refs.push(ref),
        commit: jest.fn(async () => {
          committedBatches.push(refs.map((ref) => ref.id))
          const collectionName = refs[0]?.collectionName
          if (collectionName) {
            remaining.set(collectionName, (remaining.get(collectionName) ?? 0) - refs.length)
          }
        }),
      }
    }),
  }

  return { firestore, committedBatches, deletedFarms }
}

describe('hardDeleteFarm', () => {
  it('crea un batch nuevo para cada página y elimina la granja al final', async () => {
    const { firestore, committedBatches, deletedFarms } = makeFirestore({
      animals: 805,
      reminders: 2,
    })

    const result = await hardDeleteFarm(firestore as any, 'farm-1')

    expect(committedBatches.map((batch) => batch.length)).toEqual([400, 400, 5, 2])
    expect(firestore.batch).toHaveBeenCalledTimes(4)
    expect(deletedFarms).toEqual(['farm-1'])
    expect(result.deletedDocuments).toBe(807)
    expect(result.deletedByCollection.animals).toBe(805)
  })

  it('consulta todas las colecciones asociadas aunque estén vacías', async () => {
    const { firestore } = makeFirestore({})

    await hardDeleteFarm(firestore as any, 'farm-2')

    for (const collectionName of FARM_SCOPED_COLLECTIONS) {
      expect(firestore.collection).toHaveBeenCalledWith(collectionName)
    }
  })
})
