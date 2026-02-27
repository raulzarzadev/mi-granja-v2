'use client'

import { collection, getDocs } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { toLocalDateStart } from '@/lib/dates'
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
          breedingId: data.breedingId || '', // Campo agregado para compatibilidad
          farmerId: data.farmerId,
          maleId: data.maleId,
          breedingDate: data.breedingDate
            ? toLocalDateStart(data.breedingDate.toDate())
            : new Date(),
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
                pregnancyConfirmedDate: info.pregnancyConfirmedDate
                  ? toLocalDateStart(info.pregnancyConfirmedDate.toDate())
                  : undefined,
                expectedBirthDate: info.expectedBirthDate
                  ? toLocalDateStart(info.expectedBirthDate.toDate())
                  : undefined,
                actualBirthDate: info.actualBirthDate
                  ? toLocalDateStart(info.actualBirthDate.toDate())
                  : undefined,
                offspring: info.offspring || [],
              }),
            ) || [],
          notes: data.notes || '',
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
      setError(err instanceof Error ? err.message : 'Error al cargar reproducciones')
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
    refreshBreedings: fetchBreedings,
  }
}
