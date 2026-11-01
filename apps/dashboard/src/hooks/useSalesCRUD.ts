'use client'

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
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
import { trackSaleCompleted, trackSaleReverted } from '@/lib/analytics/track'
import { batchUpdateAnimals } from '@/lib/batchUpdateAnimals'
import { toDate, toLocalDateStart } from '@/lib/dates'
import { db } from '@/lib/firebase'
import { commitMovement, createMovementId, undoMovement } from '@/lib/record-movements'
import type { AnimalRecord } from '@/types/animals'
import { isSaleComplete, Sale, SaleStatus } from '@/types/sales'

export const useSalesCRUD = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.auth)
  const { currentFarm } = useSelector((state: RootState) => state.farm)
  const { sales } = useSelector((state: RootState) => state.sales)
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
    opts?: { onProgress?: (current: number, total: number) => void; overrideData?: Partial<Sale> },
  ) => {
    const saleFromRedux = sales.find((s) => s.id === id)
    if (!saleFromRedux && !opts?.overrideData) throw new Error('Venta no encontrada')

    // Al crear y completar en una sola acción, el listener de Firestore puede no haber
    // incorporado todavía la venta a Redux. En ese caso usamos los datos validados del formulario.
    const sale = saleFromRedux
      ? opts?.overrideData
        ? { ...saleFromRedux, ...opts.overrideData }
        : saleFromRedux
      : opts?.overrideData
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
      const saleAnimals = sale.animals || []

      if (!user?.id || !currentFarm?.id)
        throw new Error('Selecciona una granja y un usuario válidos.')
      const movementId = createMovementId()
      const ids = saleAnimals.map((entry) => entry.animalId)
      const totalCentavos = saleAnimals.reduce(
        (sum, entry) => sum + Math.round((pricePerKg * (entry.weight || 0)) / 1000),
        0,
      )
      await commitMovement(
        { userId: user.id, farmId: currentFarm.id },
        movementId,
        ids,
        [`sales/${id}`],
        (docs) => {
          const currentSale = docs.get(`sales/${id}`)
          if (!currentSale || currentSale.status === 'completed')
            throw new Error('La venta ya está completada o no existe.')
          return {
            changes: [
              ...saleAnimals.map((entry) => {
                const animal = docs.get(`animals/${entry.animalId}`)
                if ((animal?.status ?? 'activo') !== 'activo')
                  throw new Error('Solo se pueden vender animales activos.')
                return {
                  path: `animals/${entry.animalId}`,
                  data: {
                    status: 'vendido',
                    statusAt: saleDate,
                    availableToSaleAt: null,
                    soldInfo: {
                      date: saleDate,
                      buyer: sale.buyer ?? '',
                      weight: entry.weight,
                      price: Math.round((pricePerKg * (entry.weight || 0)) / 1000),
                    },
                  },
                }
              }),
              {
                path: `sales/${id}`,
                data: { status: 'completed', completionRecordId: movementId, updatedBy: user.id },
              },
            ],
            record: {
              type: 'event',
              category: 'other',
              eventType: 'venta',
              title: 'Venta registrada',
              date: saleDate,
              description: sale.notes ?? '',
              details: {
                Comprador: sale.buyer || 'Sin especificar',
                'Precio por kg': `$${(pricePerKg / 100).toFixed(2)}`,
                Total: `$${(totalCentavos / 100).toFixed(2)}`,
              },
            },
          }
        },
      )
      opts?.onProgress?.(ids.length, ids.length)
      trackSaleCompleted({ animal_count: saleAnimals.length, price_type: sale.priceType })
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
      const saleDoc = await getDoc(doc(db, 'sales', id))
      const recordId = saleDoc.data()?.completionRecordId
      if (recordId) {
        if (!user?.id || !currentFarm?.id)
          throw new Error('Selecciona una granja y un usuario válidos.')
        const receipt = await getDoc(doc(db, 'recordMovements', recordId))
        const record = receipt.data()?.record as AnimalRecord | undefined
        if (!record) throw new Error('No se encontró el registro de la venta.')
        await undoMovement({ userId: user.id, farmId: currentFarm.id }, record)
        trackSaleReverted({ animal_count: sale.animals.length })
        return
      }
      // Revertir cada animal a activo
      await batchUpdateAnimals(
        sale.animals.map((e) => e.animalId),
        { status: 'activo', statusNotes: 'Venta revertida' },
      )

      // Volver la venta a pendiente
      await updateSale(id, { status: 'pending' as SaleStatus })
      trackSaleReverted({ animal_count: sale.animals.length })
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
