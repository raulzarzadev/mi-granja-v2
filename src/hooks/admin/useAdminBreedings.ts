'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { BreedingRecord } from '@/types/breedings'

interface UseAdminBreedingsReturn {
  breedings: BreedingRecord[]
  isLoading: boolean
  error: string | null
  refreshBreedings: () => Promise<void>
}

export const useAdminBreedings = (): UseAdminBreedingsReturn => {
  const [breedings, setBreedings] = useState<BreedingRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBreedings = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const breedingsSnapshot = await getDocs(collection(db, 'breedingRecords'))
      const breedingsData: BreedingRecord[] = []

      breedingsSnapshot.forEach((doc) => {
        const data = doc.data()
        breedingsData.push({
          id: doc.id,
          farmerId: data.farmerId,
          maleId: data.maleId,
          breedingDate: data.breedingDate?.toDate() || new Date(),
          femaleBreedingInfo:
            data.femaleBreedingInfo?.map(
              (info: {
                femaleId: string
                pregnancyConfirmedDate?: { toDate: () => Date }
                expectedBirthDate?: { toDate: () => Date }
                actualBirthDate?: { toDate: () => Date }
                offspring?: string[]
              }) => ({
                femaleId: info.femaleId,
                pregnancyConfirmedDate: info.pregnancyConfirmedDate?.toDate(),
                expectedBirthDate: info.expectedBirthDate?.toDate(),
                actualBirthDate: info.actualBirthDate?.toDate(),
                offspring: info.offspring || []
              })
            ) || [],
          notes: data.notes || ''
        })
      })

      // Ordenar por fecha de monta (más recientes primero)
      breedingsData.sort((a, b) => {
        const dateA = a.breedingDate ? a.breedingDate.getTime() : 0
        const dateB = b.breedingDate ? b.breedingDate.getTime() : 0
        return dateB - dateA
      })

      setBreedings(breedingsData)
    } catch (err) {
      console.error('Error fetching breedings:', err)
      setError(
        err instanceof Error ? err.message : 'Error al cargar reproducciones'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBreedings()
  }, [])

  return {
    breedings,
    isLoading,
    error,
    refreshBreedings: fetchBreedings
  }
}
