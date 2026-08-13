import type { Firestore } from 'firebase-admin/firestore'

export const FARM_SCOPED_COLLECTIONS = [
  'animals',
  'breedingRecords',
  'reminders',
  'sales',
  'farmInvitations',
  // Datos de versiones anteriores que todavía pueden existir en respaldos/migraciones.
  'weightRecords',
] as const

const DELETE_BATCH_SIZE = 400

export interface HardDeleteFarmResult {
  deletedDocuments: number
  deletedByCollection: Record<string, number>
}

async function deleteFarmDocumentsFromCollection(
  firestore: Firestore,
  collectionName: string,
  farmId: string,
): Promise<number> {
  let deletedDocuments = 0

  while (true) {
    const snapshot = await firestore
      .collection(collectionName)
      .where('farmId', '==', farmId)
      .limit(DELETE_BATCH_SIZE)
      .get()

    if (snapshot.empty) break

    // Un WriteBatch no puede volver a usarse después de commit(). Cada página necesita uno nuevo.
    const batch = firestore.batch()
    snapshot.docs.forEach((document) => {
      batch.delete(document.ref)
    })
    await batch.commit()
    deletedDocuments += snapshot.size
  }

  return deletedDocuments
}

/**
 * Elimina los datos asociados primero y la granja al final. Puede ejecutarse otra vez con
 * seguridad si una petición anterior se interrumpió a mitad del proceso.
 */
export async function hardDeleteFarm(
  firestore: Firestore,
  farmId: string,
): Promise<HardDeleteFarmResult> {
  const deletedByCollection: Record<string, number> = {}

  for (const collectionName of FARM_SCOPED_COLLECTIONS) {
    deletedByCollection[collectionName] = await deleteFarmDocumentsFromCollection(
      firestore,
      collectionName,
      farmId,
    )
  }

  await firestore.collection('farms').doc(farmId).delete()

  return {
    deletedDocuments: Object.values(deletedByCollection).reduce((total, count) => total + count, 0),
    deletedByCollection,
  }
}
