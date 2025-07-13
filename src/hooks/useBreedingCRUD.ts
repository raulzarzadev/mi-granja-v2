import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { RootState } from '@/features/store'
import { BreedingRecord } from '@/types'
import { setBreedingRecords as setBreedingRecordsSlice } from '@/features/breeding/breedingSlice'
import { useBreeding } from './useBreeding'
import { serializeObj } from '@/features/libs/serializeObj'
import {
  getBreedingUpcomingBirths,
  getUpcomingBirths
} from './libs/breeding-helpers'

export const useBreedingCRUD = () => {
  const dispatch = useDispatch()
  const { breedingRecords, isLoading } = useBreeding()
  const { user } = useSelector((state: RootState) => state.auth)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
        maleId: data.maleId,
        breedingDate: Timestamp.fromDate(new Date(data.breedingDate)),
        expectedBirthDate: data.expectedBirthDate
          ? Timestamp.fromDate(new Date(data.expectedBirthDate))
          : null,
        actualBirthDate: data.actualBirthDate
          ? Timestamp.fromDate(new Date(data.actualBirthDate))
          : null,
        pregnancyConfirmed: data.pregnancyConfirmed,
        femaleBreedingInfo:
          data.femaleBreedingInfo?.map((info) => ({
            ...info,
            pregnancyConfirmedDate: info.pregnancyConfirmedDate
              ? Timestamp.fromDate(new Date(info.pregnancyConfirmedDate))
              : null,
            expectedBirthDate: info.expectedBirthDate
              ? Timestamp.fromDate(new Date(info.expectedBirthDate))
              : null,
            actualBirthDate: info.actualBirthDate
              ? Timestamp.fromDate(new Date(info.actualBirthDate))
              : null
          })) || [],
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
      if (updates.maleId) updateData.maleId = updates.maleId
      if (updates.pregnancyConfirmed !== undefined)
        updateData.pregnancyConfirmed = updates.pregnancyConfirmed
      if (updates.offspring) updateData.offspring = updates.offspring
      if (updates.notes !== undefined) updateData.notes = updates.notes

      // Manejar femaleBreedingInfo con conversión de fechas
      if (updates.femaleBreedingInfo) {
        updateData.femaleBreedingInfo = updates.femaleBreedingInfo.map(
          (info) => ({
            ...info,
            pregnancyConfirmedDate: info.pregnancyConfirmedDate
              ? Timestamp.fromDate(new Date(info.pregnancyConfirmedDate))
              : null,
            expectedBirthDate: info.expectedBirthDate
              ? Timestamp.fromDate(new Date(info.expectedBirthDate))
              : null,
            actualBirthDate: info.actualBirthDate
              ? Timestamp.fromDate(new Date(info.actualBirthDate))
              : null
          })
        )
      }

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

      dispatch(
        setBreedingRecordsSlice(
          serializeObj(
            breedingRecords.map((record) =>
              record.id === id
                ? {
                    ...record,
                    ...updates,
                    updatedAt: new Date() // Update the modification date
                  }
                : record
            )
          )
        )
      )

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
    await updateBreedingRecord(
      breedingRecordId,
      serializeObj({
        actualBirthDate: birthDate,
        offspring: offspringIds,
        pregnancyConfirmed: true,
        notes: notes
      })
    )
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
      dispatch(
        setBreedingRecordsSlice(
          serializeObj(breedingRecords.filter((record) => record.id !== id))
        )
      )
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
        record.femaleBreedingInfo?.some((info) => info.femaleId === animalId) ||
        record.maleId === animalId
    )
  }

  // Obtener embarazos activos
  const getActivePregnancies = () => {
    return breedingRecords.filter((record) =>
      record.femaleBreedingInfo?.some(
        (info) => info.pregnancyConfirmed && !info.actualBirthDate
      )
    )
  }

  // Obtener partos próximos (dentro de 7 días)
  const getUpcomingBirths = () => {
    //TODO: Calculate next birth, upcoming births within the next week and all upcoming births
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    return breedingRecords.filter((record) => {
      const upcoming = getBreedingUpcomingBirths(record)
      console.log({ upcoming })
      return upcoming.some((info) => {
        const expected = new Date(info.expectedBirthDate!)
        return expected >= now && expected <= nextWeek
      })
      // return record.femaleBreedingInfo?.some((info) => {
      //   if (!info.expectedBirthDate || info.actualBirthDate) return false
      //   const expected = new Date(info.expectedBirthDate)
      //   return expected >= now && expected <= nextWeek
      // })
    })
  }

  // Obtener estadísticas
  const getStats = () => {
    const activePregnancies = breedingRecords.reduce(
      (total, record) =>
        total +
        (record.femaleBreedingInfo?.filter(
          (info) => info.pregnancyConfirmed && !info.actualBirthDate
        ).length || 0),
      0
    )
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
  console.log({ breedingRecords })

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
