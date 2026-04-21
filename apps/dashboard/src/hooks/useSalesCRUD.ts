'use client'

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { serializeObj } from '@/features/libs/serializeObj'
import { setSales } from '@/features/sales/salesSlice'
import { RootState } from '@/features/store'
import { batchUpdateAnimals } from '@/lib/batchUpdateAnimals'
import { toDate, toLocalDateStart } from '@/lib/dates'
import { db } from '@/lib/firebase'
import { isSaleComplete, Sale, SaleStatus } from '@/types/sales'
import { useAnimalCRUD } from './useAnimalCRUD'

export const useSalesCRUD = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.auth)
  const { currentFarm } = useSelector((state: RootState) => state.farm)
  const { sales } = useSelector((state: RootState) => state.sales)
  const { markStatus } = useAnimalCRUD()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getFarmSales = () => {
    if (!currentFarm?.id) return

    const q = query(
      collection(db, 'sales'),
      where('farmId', '==', currentFarm.id),
      orderBy('createdAt', 'desc'),
    )

    return onSnapshot(q, (snapshot) => {
      const records: Sale[] = []
      snapshot.forEach((d) => {
        const data = d.data()
        records.push({
          id: d.id,
          farmId: data.farmId,
          farmerId: data.farmerId,
          animals: data.animals || [],
          date: data.date ? toLocalDateStart(data.date) : undefined,
          pricePerKg: data.pricePerKg || undefined,
          priceType: data.priceType || 'en_pie',
          buyer: data.buyer || '',
          notes: data.notes || '',
          status: data.status,
          createdBy: data.createdBy,
          updatedBy: data.updatedBy,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        })
      })
      dispatch(setSales(serializeObj(records)))
    })
  }

  const createSale = async (
    data: Pick<Sale, 'animals' | 'status' | 'buyer' | 'notes' | 'priceType'> & {
      date?: Date
      pricePerKg?: number
    },
  ) => {
    if (!user) throw new Error('Usuario no autenticado')
    if (!currentFarm?.id) throw new Error('Selecciona una granja primero')

    setIsSubmitting(true)
    try {
      const now = Timestamp.now()
      // Sanitize animal entries: Firestore does not accept undefined
      const sanitizedAnimals = data.animals.map((a) => ({
        animalId: a.animalId,
        animalNumber: a.animalNumber,
        weight: a.weight ?? null,
      }))

      const docData = {
        farmId: currentFarm.id,
        farmerId: user.id,
        animals: sanitizedAnimals,
        date: data.date ? Timestamp.fromDate(toLocalDateStart(new Date(data.date))) : null,
        pricePerKg: data.pricePerKg || null,
        priceType: data.priceType || 'en_pie',
        buyer: data.buyer || '',
        notes: data.notes || '',
        status: data.status || 'scheduled',
        createdBy: user.id,
        updatedBy: user.id,
        createdAt: now,
        updatedAt: now,
      }

      const docRef = await addDoc(collection(db, 'sales'), docData)
      return docRef.id
    } catch (error) {
      console.error('Error creating sale:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateSale = async (
    id: string,
    updates: Partial<
      Pick<Sale, 'animals' | 'status' | 'buyer' | 'notes' | 'priceType'> & {
        date?: Date
        pricePerKg?: number
      }
    >,
  ) => {
    if (!user) throw new Error('Usuario no autenticado')

    setIsSubmitting(true)
    try {
      const docRef = doc(db, 'sales', id)
      const updateData: Record<string, unknown> = {
        updatedBy: user.id,
        updatedAt: Timestamp.now(),
      }

      if (updates.animals !== undefined) {
        updateData.animals = updates.animals.map((a) => ({
          animalId: a.animalId,
          animalNumber: a.animalNumber,
          weight: a.weight ?? null,
        }))
      }
      if (updates.status !== undefined) updateData.status = updates.status
      if (updates.buyer !== undefined) updateData.buyer = updates.buyer
      if (updates.notes !== undefined) updateData.notes = updates.notes
      if (updates.pricePerKg !== undefined) updateData.pricePerKg = updates.pricePerKg
      if (updates.priceType !== undefined) updateData.priceType = updates.priceType
      if (updates.date !== undefined) {
        updateData.date = updates.date
          ? Timestamp.fromDate(toLocalDateStart(new Date(updates.date)))
          : null
      }

      await updateDoc(docRef, updateData)
    } catch (error) {
      console.error('Error updating sale:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteSale = async (id: string) => {
    const sale = sales.find((s) => s.id === id)
    if (sale?.status === 'completed') {
      throw new Error('No se puede eliminar una venta completada. Reviértela primero.')
    }

    setIsSubmitting(true)
    try {
      await deleteDoc(doc(db, 'sales', id))
    } catch (error) {
      console.error('Error deleting sale:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const completeSale = async (
    id: string,
    opts?: { onProgress?: (current: number, total: number) => void },
  ) => {
    const sale = sales.find((s) => s.id === id)
    if (!sale) throw new Error('Venta no encontrada')

    // Reconstruir sale con Date objects para isSaleComplete
    const saleForValidation = {
      ...sale,
      date: sale.date ? new Date(sale.date) : undefined,
    }
    if (!isSaleComplete(saleForValidation)) {
      throw new Error(
        'La venta debe tener fecha, precio y peso de todos los animales para completarse',
      )
    }

    setIsSubmitting(true)
    try {
      const pricePerKg = sale.pricePerKg || 0 // centavos/kg
      const saleDate = sale.date ? new Date(sale.date) : new Date()

      const entryById = new Map(sale.animals.map((e) => [e.animalId, e]))
      const ids = sale.animals.map((e) => e.animalId)
      await batchUpdateAnimals(
        ids,
        ({ id: animalId }) => {
          const entry = entryById.get(animalId)!
          const animalPrice = Math.round((pricePerKg * (entry.weight || 0)) / 1000)
          return {
            status: 'vendido',
            statusAt: saleDate,
            soldInfo: {
              date: saleDate,
              buyer: sale.buyer,
              weight: entry.weight,
              price: animalPrice,
            },
          }
        },
        { onProgress: opts?.onProgress },
      )

      await updateSale(id, { status: 'completed' as SaleStatus })
    } catch (error) {
      console.error('Error completing sale:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const revertSale = async (id: string) => {
    const sale = sales.find((s) => s.id === id)
    if (!sale) throw new Error('Venta no encontrada')
    if (sale.status !== 'completed') throw new Error('Solo se pueden revertir ventas completadas')

    setIsSubmitting(true)
    try {
      // Revertir cada animal a activo
      await batchUpdateAnimals(
        sale.animals.map((e) => e.animalId),
        { status: 'activo', statusNotes: 'Venta revertida' },
      )

      // Volver la venta a pendiente
      await updateSale(id, { status: 'pending' as SaleStatus })
    } catch (error) {
      console.error('Error reverting sale:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  /** IDs de animales que están en ventas activas (no completadas ni canceladas) */
  const getAnimalsInActiveSales = (): Set<string> => {
    const ids = new Set<string>()
    for (const sale of sales) {
      if (sale.status === 'scheduled' || sale.status === 'pending') {
        for (const entry of sale.animals) {
          ids.add(entry.animalId)
        }
      }
    }
    return ids
  }

  return {
    sales,
    isSubmitting,
    getFarmSales,
    createSale,
    updateSale,
    deleteSale,
    completeSale,
    revertSale,
    getAnimalsInActiveSales,
  }
}
