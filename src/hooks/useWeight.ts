import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { RootState } from '@/features/store'
import { WeightRecord } from '@/types'

export const useWeight = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cargar registros de peso
  useEffect(() => {
    if (!user) {
      setWeightRecords([])
      setIsLoading(false)
      return
    }

    const q = query(
      collection(db, 'weightRecords'),
      where('farmerId', '==', user.id),
      orderBy('date', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: WeightRecord[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        records.push({
          id: doc.id,
          animalId: data.animalId,
          weight: data.weight,
          date: data.date.toDate(),
          notes: data.notes || ''
        })
      })
      setWeightRecords(records)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  // Crear registro de peso
  const createWeightRecord = async (data: Omit<WeightRecord, 'id'>) => {
    if (!user) throw new Error('Usuario no autenticado')

    setIsSubmitting(true)
    try {
      const docData = {
        farmerId: user.id,
        animalId: data.animalId,
        weight: data.weight,
        date: Timestamp.fromDate(new Date(data.date)),
        notes: data.notes || ''
      }

      await addDoc(collection(db, 'weightRecords'), docData)
    } catch (error) {
      console.error('Error creating weight record:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Actualizar registro de peso
  const updateWeightRecord = async (
    id: string,
    updates: Partial<Omit<WeightRecord, 'id'>>
  ) => {
    setIsSubmitting(true)
    try {
      const docRef = doc(db, 'weightRecords', id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {}

      if (updates.weight !== undefined) updateData.weight = updates.weight
      if (updates.notes !== undefined) updateData.notes = updates.notes
      if (updates.date) {
        updateData.date = Timestamp.fromDate(new Date(updates.date))
      }

      await updateDoc(docRef, updateData)
    } catch (error) {
      console.error('Error updating weight record:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Eliminar registro de peso
  const deleteWeightRecord = async (id: string) => {
    setIsSubmitting(true)
    try {
      await deleteDoc(doc(db, 'weightRecords', id))
    } catch (error) {
      console.error('Error deleting weight record:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Obtener registros por animal
  const getRecordsByAnimal = (animalId: string) => {
    return weightRecords.filter((record) => record.animalId === animalId)
  }

  // Obtener último peso de un animal
  const getLatestWeight = (animalId: string) => {
    const animalRecords = getRecordsByAnimal(animalId)
    return animalRecords.length > 0 ? animalRecords[0] : null
  }

  // Obtener ganancia de peso entre dos fechas
  const getWeightGain = (animalId: string, fromDate: Date, toDate: Date) => {
    const animalRecords = getRecordsByAnimal(animalId)
    const recordsInRange = animalRecords.filter((record) => {
      const recordDate = new Date(record.date)
      return recordDate >= fromDate && recordDate <= toDate
    })

    if (recordsInRange.length < 2) return null

    // Ordenar por fecha ascendente
    recordsInRange.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const firstWeight = recordsInRange[0].weight
    const lastWeight = recordsInRange[recordsInRange.length - 1].weight

    return {
      gain: lastWeight - firstWeight,
      initialWeight: firstWeight,
      finalWeight: lastWeight,
      days: Math.ceil(
        (new Date(recordsInRange[recordsInRange.length - 1].date).getTime() -
          new Date(recordsInRange[0].date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    }
  }

  // Obtener promedio de peso en un período
  const getAverageWeight = (animalId: string, days: number = 30) => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const recentRecords = getRecordsByAnimal(animalId).filter(
      (record) => new Date(record.date) >= cutoffDate
    )

    if (recentRecords.length === 0) return null

    const totalWeight = recentRecords.reduce(
      (sum, record) => sum + record.weight,
      0
    )
    return totalWeight / recentRecords.length
  }

  return {
    weightRecords,
    isLoading,
    isSubmitting,
    createWeightRecord,
    updateWeightRecord,
    deleteWeightRecord,
    getRecordsByAnimal,
    getLatestWeight,
    getWeightGain,
    getAverageWeight
  }
}
