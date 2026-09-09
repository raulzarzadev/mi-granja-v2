'use client'

import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { clearAnimalRecords, setAnimalRecords } from '@/features/animalRecords/animalRecordsSlice'
import { serializeObj } from '@/features/libs/serializeObj'
import { RootState } from '@/features/store'
import { db } from '@/lib/firebase'
import type { AnimalRecordDocument } from '@/types/animals'

export const useAnimalRecords = () => {
  const dispatch = useDispatch()
  const { currentFarm } = useSelector((state: RootState) => state.farm)
  const records = useSelector((state: RootState) => state.animalRecords.records)

  const getFarmRecords = useCallback((): (() => void) | undefined => {
    dispatch(clearAnimalRecords())
    if (!currentFarm?.id) return undefined

    const recordsQuery = query(
      collection(db, 'animalRecords'),
      where('farmId', '==', currentFarm.id),
    )

    return onSnapshot(
      recordsQuery,
      (snapshot) => {
        const nextRecords = snapshot.docs.map(
          (record) => serializeObj({ id: record.id, ...record.data() }) as AnimalRecordDocument,
        )
        dispatch(setAnimalRecords(nextRecords))
      },
      (error) => {
        console.error('Animal records listener error:', error)
        dispatch(clearAnimalRecords())
      },
    )
  }, [currentFarm?.id, dispatch])

  return { records, getFarmRecords }
}
