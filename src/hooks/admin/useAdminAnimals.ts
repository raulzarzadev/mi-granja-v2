'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Animal } from '@/types/animals'

interface UseAdminAnimalsReturn {
  animals: Animal[]
  isLoading: boolean
  error: string | null
  refreshAnimals: () => Promise<void>
}

export const useAdminAnimals = (): UseAdminAnimalsReturn => {
  const [animals, setAnimals] = useState<Animal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnimals = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const animalsSnapshot = await getDocs(collection(db, 'animals'))
      const animalsData: Animal[] = []

      animalsSnapshot.forEach((doc) => {
        const data = doc.data()
        animalsData.push({
          id: doc.id,
          farmerId: data.farmerId,
          animalNumber: data.animalNumber,
          type: data.type,
          stage: data.stage,
          gender: data.gender,
          weight: data.weight,
          age: data.age,
          birthDate: data.birthDate?.toDate(),
          motherId: data.motherId,
          fatherId: data.fatherId,
          notes: data.notes || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        })
      })

      // Ordenar por fecha de creación (más recientes primero)
      animalsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      setAnimals(animalsData)
    } catch (err) {
      console.error('Error fetching animals:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar animales')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnimals()
  }, [])

  return {
    animals,
    isLoading,
    error,
    refreshAnimals: fetchAnimals
  }
}
