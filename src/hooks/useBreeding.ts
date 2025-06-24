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
import { BreedingRecord } from '@/types'

export const useBreeding = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [breedingRecords, setBreedingRecords] = useState<BreedingRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
          femaleIds: data.femaleIds || [],
          maleId: data.maleId,
          breedingDate: data.breedingDate.toDate(),
          expectedBirthDate: data.expectedBirthDate?.toDate(),
          actualBirthDate: data.actualBirthDate?.toDate(),
          pregnancyConfirmed: data.pregnancyConfirmed || false,
          offspring: data.offspring || [],
          notes: data.notes || '',
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        })
      })
      setBreedingRecords(records)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  // Crear registro de monta
  const createBreedingRecord = async (
    data: Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!user) throw new Error('Usuario no autenticado')

    setIsSubmitting(true)
    try {
      const now = Timestamp.now()
      const docData = {
        farmerId: user.id,
        femaleIds: data.femaleIds,
        maleId: data.maleId,
        breedingDate: Timestamp.fromDate(new Date(data.breedingDate)),
        expectedBirthDate: data.expectedBirthDate
          ? Timestamp.fromDate(new Date(data.expectedBirthDate))
          : null,
        actualBirthDate: data.actualBirthDate
          ? Timestamp.fromDate(new Date(data.actualBirthDate))
          : null,
        pregnancyConfirmed: data.pregnancyConfirmed,
        offspring: data.offspring || [],
        notes: data.notes || '',
        createdAt: now,
        updatedAt: now
      }

      await addDoc(collection(db, 'breedingRecords'), docData)
    } catch (error) {
      console.error('Error creating breeding record:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Actualizar registro de reproducción
  const updateBreedingRecord = async (
    id: string,
    updates: Partial<Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt'>>
  ) => {
    setIsSubmitting(true)
    try {
      const docRef = doc(db, 'breedingRecords', id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {
        updatedAt: Timestamp.now()
      }

      // Añadir campos básicos si existen
      if (updates.femaleIds) updateData.femaleIds = updates.femaleIds
      if (updates.maleId) updateData.maleId = updates.maleId
      if (updates.pregnancyConfirmed !== undefined)
        updateData.pregnancyConfirmed = updates.pregnancyConfirmed
      if (updates.offspring) updateData.offspring = updates.offspring
      if (updates.notes !== undefined) updateData.notes = updates.notes

      // Convertir fechas a Timestamp
      if (updates.breedingDate) {
        updateData.breedingDate = Timestamp.fromDate(
          new Date(updates.breedingDate)
        )
      }
      if (updates.expectedBirthDate) {
        updateData.expectedBirthDate = Timestamp.fromDate(
          new Date(updates.expectedBirthDate)
        )
      }
      if (updates.actualBirthDate) {
        updateData.actualBirthDate = Timestamp.fromDate(
          new Date(updates.actualBirthDate)
        )
      }

      await updateDoc(docRef, updateData)
    } catch (error) {
      console.error('Error updating breeding record:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Registrar parto
  const recordBirth = async (
    breedingRecordId: string,
    birthDate: Date,
    offspringIds: string[] = [],
    notes?: string
  ) => {
    await updateBreedingRecord(breedingRecordId, {
      actualBirthDate: birthDate,
      offspring: offspringIds,
      pregnancyConfirmed: true,
      notes: notes
    })
  }

  // Confirmar embarazo
  const confirmPregnancy = async (
    breedingRecordId: string,
    confirmed: boolean
  ) => {
    await updateBreedingRecord(breedingRecordId, {
      pregnancyConfirmed: confirmed
    })
  }

  // Eliminar registro
  const deleteBreedingRecord = async (id: string) => {
    setIsSubmitting(true)
    try {
      await deleteDoc(doc(db, 'breedingRecords', id))
    } catch (error) {
      console.error('Error deleting breeding record:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Obtener registros por animal
  const getRecordsByAnimal = (animalId: string) => {
    return breedingRecords.filter(
      (record) =>
        record.femaleIds.includes(animalId) || record.maleId === animalId
    )
  }

  // Obtener embarazos activos
  const getActivePregnancies = () => {
    return breedingRecords.filter(
      (record) => record.pregnancyConfirmed && !record.actualBirthDate
    )
  }

  // Obtener partos próximos (dentro de 7 días)
  const getUpcomingBirths = () => {
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    return breedingRecords.filter((record) => {
      if (!record.expectedBirthDate || record.actualBirthDate) return false
      const expected = new Date(record.expectedBirthDate)
      return expected >= now && expected <= nextWeek
    })
  }

  // Obtener estadísticas
  const getStats = () => {
    const activePregnancies = getActivePregnancies().length
    const upcomingBirths = getUpcomingBirths().length
    const totalOffspring = breedingRecords.reduce(
      (total, record) => total + (record.offspring?.length || 0),
      0
    )

    return {
      totalBreedings: breedingRecords.length,
      activePregnancies,
      upcomingBirths,
      totalOffspring
    }
  }

  return {
    breedingRecords,
    isLoading,
    isSubmitting,
    createBreedingRecord,
    updateBreedingRecord,
    recordBirth,
    confirmPregnancy,
    deleteBreedingRecord,
    getRecordsByAnimal,
    getActivePregnancies,
    getUpcomingBirths,
    getStats
  }
}
