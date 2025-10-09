'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Animal, AnimalStatus } from '@/types/animals'

interface UseAdminAnimalsReturn {
  animals: Animal[]
  isLoading: boolean
  error: string | null
  refreshAnimals: () => Promise<void>
  fetchByStatus: (status: AnimalStatus) => Promise<void>
}

const getAge = (birthDate: Date | null | undefined): number | null => {
  if (!birthDate) return null
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export const useAdminAnimals = (): UseAdminAnimalsReturn => {
  const [animals, setAnimals] = useState<Animal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mapDoc = (doc: any): Animal => {
    const data = doc.data()
    const birthdateDate = data.birthDate?.toDate()
    const age = getAge(birthdateDate)
    return {
      id: doc.id,
      farmerId: data.farmerId,
      animalNumber: data.animalNumber,
      type: data.type,
      stage: data.stage,
      gender: data.gender,
      weight: data.weight,
      age, // Calculated age from birthDate
      birthDate: birthdateDate,
      motherId: data.motherId,
      fatherId: data.fatherId,
      notes: data.notes || '',
      status: data.status,
      statusAt: data.statusAt?.toDate?.() || data.statusAt,
      statusNotes: data.statusNotes,
      soldInfo: data.soldInfo,
      lostInfo: data.lostInfo,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    }
  }

  const fetchAnimals = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const animalsSnapshot = await getDocs(collection(db, 'animals'))
      const animalsData: Animal[] = animalsSnapshot.docs.map(mapDoc)

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

  const fetchByStatus = async (status: AnimalStatus) => {
    try {
      setIsLoading(true)
      setError(null)
      if (status === 'activo') {
        return await fetchAnimals()
      }
      const q = query(collection(db, 'animals'), where('status', '==', status))
      const snap = await getDocs(q)
      const list: Animal[] = snap.docs.map(mapDoc)
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      setAnimals(list)
    } catch (err) {
      console.error('Error fetching animals by status:', err)
      setError(
        err instanceof Error ? err.message : 'Error al cargar por estado'
      )
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
    refreshAnimals: fetchAnimals,
    fetchByStatus
  }
}
