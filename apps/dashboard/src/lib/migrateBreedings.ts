import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase'

export const migrateBreedings = async () => {
  console.log('start migrating breedings')
  const COLLECTION_NAME = 'breedingRecords'
  const query = await getDocs(collection(db, COLLECTION_NAME))
  const breedings = query.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  console.log(' breedings', breedings)
}
