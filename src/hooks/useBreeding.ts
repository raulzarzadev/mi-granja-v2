import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { RootState } from '@/features/store'
import { setBreedingRecords as setBreedingRecordsSlice } from '@/features/breeding/breedingSlice'
import { serializeObj } from '@/features/libs/serializeObj'
import { BreedingRecord } from '@/types/breedings'

export const useBreeding = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.auth)
  const [breedingRecords, setBreedingRecords] = useState<BreedingRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Cargar registros de reproducción
  useEffect(() => {
    if (!user) {
      setBreedingRecords([])
      setIsLoading(false)
      return
    }

    const q = query(
      collection(db, 'breedingRecords'),
      where('farmerId', '==', user.id),
      orderBy('breedingDate', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: BreedingRecord[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        records.push({
          id: doc.id,
          farmerId: data.farmerId,
          maleId: data.maleId,
          breedingDate: data.breedingDate.toDate(),
          femaleBreedingInfo:
            data.femaleBreedingInfo?.map(
              (info: {
                animalNumber: string
                pregnancyConfirmed: boolean
                pregnancyConfirmedDate?: Timestamp
                expectedBirthDate?: Timestamp
                actualBirthDate?: Timestamp
                offspring?: string[]
              }) => ({
                ...info,
                pregnancyConfirmedDate: info.pregnancyConfirmedDate?.toDate(),
                expectedBirthDate: info.expectedBirthDate?.toDate(),
                actualBirthDate: info.actualBirthDate?.toDate()
              })
            ) || [],
          notes: data.notes || '',
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        })
      })
      dispatch(setBreedingRecordsSlice(serializeObj(records)))
      setBreedingRecords(records)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user, dispatch])

  return {
    breedingRecords,
    isLoading
  }
}
