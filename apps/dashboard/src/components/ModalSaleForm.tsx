'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import AnimalSelector from '@/components/inputs/AnimalSelector'
import DateTimeInput from '@/components/inputs/DateTimeInput'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { WeightInput } from '@/components/inputs/WeightInput'
import { Modal } from '@/components/Modal'
import { RootState } from '@/features/store'
import { useSalesCRUD } from '@/hooks/useSalesCRUD'
import { Animal } from '@/types/animals'
import {
  Sale,
  SaleAnimalEntry,
  SalePriceType,
  SaleStatus,
  sale_price_type_labels,
  sale_price_types,
  sale_status_labels,
  sale_statuses,
} from '@/types/sales'

interface ModalSaleFormProps {
  isOpen: boolean
  onClose: () => void
  sale?: Sale
}

const ModalSaleForm: React.FC<ModalSaleFormProps> = ({ isOpen, onClose, sale }) => {
  const { animals } = useSelector((state: RootState) => state.animals)
  const {
    createSale,
    updateSale,
    completeSale,
    revertSale,
    deleteSale,
    isSubmitting,
    getAnimalsInActiveSales,
  } = useSalesCRUD()

  const [status, setStatus] = useState<SaleStatus>('scheduled')
  const [date, setDate] = useState<Date | null>(new Date())
  const [pricePerKg, setPricePerKg] = useState<number | null>(null) // centavos
  const [priceType, setPriceType] = useState<SalePriceType>('en_pie')
  const [buyer, setBuyer] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([])
  const [animalWeights, setAnimalWeights] = useState<Record<string, number | null>>({}) // gramos
  const [error, setError] = useState('')
  const [completeProgress, setCompleteProgress] = useState<{
    current: number
    total: number
  } | null>(null)

  const isEditing = !!sale

  const animalsInActiveSales = useMemo(() => getAnimalsInActiveSales(), [getAnimalsInActiveSales])
  const currentSaleAnimalIds = useMemo(
    () => new Set(sale?.animals.map((a) => a.animalId) || []),
    [sale],
  )

  const availableAnimals = useMemo(
    () =>
      animals.filter((a) => {
        const animalStatus = a.status ?? 'activo'
        if (animalStatus !== 'activo') return false
        if (currentSaleAnimalIds.has(a.id)) return true
        if (animalsInActiveSales.has(a.id)) return false
        return true
      }),
    [animals, animalsInActiveSales, currentSaleAnimalIds],
  )

  useEffect(() => {
    if (sale) {
      setStatus(sale.status)
      setDate(sale.date ? new Date(sale.date) : new Date())
      setPricePerKg(sale.pricePerKg || null)
      setPriceType(sale.priceType || 'en_pie')
      setBuyer(sale.buyer || '')
      setNotes(sale.notes || '')
      setSelectedAnimalIds(sale.animals.map((a) => a.animalId))
      const weights: Record<string, number | null> = {}
      for (const a of sale.animals) {
        weights[a.animalId] = a.weight || null
      }
      setAnimalWeights(weights)
    } else {
      setStatus('scheduled')
      setDate(new Date())
      setPricePerKg(null)
      setPriceType('en_pie')
      setBuyer('')
      setNotes('')
      setSelectedAnimalIds([])
      setAnimalWeights({})
    }
    setError('')
  }, [sale, isOpen])

  const buildAnimalsEntries = (): SaleAnimalEntry[] => {
    return selectedAnimalIds.map((id) => {
      const animal = animals.find((a) => a.id === id)
      return {
        animalId: id,
        animalNumber: animal?.animalNumber || '',
        weight: animalWeights[id] || undefined,
      }
    })
  }

  const buildSaleData = () => ({
    animals: buildAnimalsEntries(),
    status,
    priceType,
    date: date || undefined,
    pricePerKg: pricePerKg || undefined,
    buyer,
    notes,
  })

  const handleSave = async () => {
    setError('')
    if (selectedAnimalIds.length === 0) {
      setError('Selecciona al menos un animal')
      return
    }
    try {
      const data = buildSaleData()
      if (isEditing && sale) {
        await updateSale(sale.id, data)
      } else {
        await createSale(data)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const handleComplete = async () => {
    if (!sale) return
    setError('')
    if (selectedAnimalIds.length === 0) {
      setError('Selecciona al menos un animal')
      return
    }
    if (!date) {
      setError('Ingresa la fecha de venta')
      return
    }
    if (!pricePerKg || pricePerKg <= 0) {
      setError('Ingresa el precio por kg')
      return
    }
    const missingWeight = selectedAnimalIds.find((id) => {
      const w = animalWeights[id]
      return w == null || w <= 0
    })
    if (missingWeight) {
      const animal = animals.find((a) => a.id === missingWeight)
      setError(`Ingresa el peso del animal ${animal?.animalNumber || missingWeight}`)
      return
    }
    setCompleteProgress({ current: 0, total: sale.animals.length })
    const saleData = buildSaleData()
    try {
      await updateSale(sale.id, saleData)
      await completeSale(sale.id, {
        onProgress: (current, total) => setCompleteProgress({ current, total }),
        overrideData: saleData,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al completar venta')
    } finally {
      setCompleteProgress(null)
    }
  }

  const handleRevert = async () => {
    if (!sale) return
    setError('')
    try {
      await revertSale(sale.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al revertir venta')
    }
  }

  const handleDelete = async () => {
    if (!sale) return
    if (!confirm('¿Eliminar esta venta?')) return
    setError('')
    try {
      await deleteSale(sale.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  const canComplete = useMemo(() => {
    return (
      date !== null &&
      pricePerKg !== null &&
      pricePerKg > 0 &&
      selectedAnimalIds.length > 0 &&
      selectedAnimalIds.every((id) => {
        const w = animalWeights[id]
        return w != null && w > 0
      })
    )
  }, [date, pricePerKg, selectedAnimalIds, animalWeights])

  const isCompleted = sale?.status === 'completed'
  const isCancelled = sale?.status === 'cancelled'
  const isReadOnly = isCompleted || isCancelled

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Venta' : 'Nueva Venta'}
      size="lg"
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SaleStatus)}
            disabled={isReadOnly}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
          >
            {sale_statuses
              .filter((s) => s !== 'completed')
              .map((s) => (
                <option key={s} value={s}>
                  {sale_status_labels[s]}
                </option>
              ))}
          </select>
        </div>

        {/* Fecha */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de venta</label>
          <DateTimeInput value={date} onChange={setDate} disabled={isReadOnly} />
        </div>

        {/* Precio por kg + tipo */}
        <div>
          <div className="flex items-end gap-3">
            <MoneyInput
              label="Precio por kg"
              value={pricePerKg}
              onChange={setPricePerKg}
              suffix="/kg"
              disabled={isReadOnly}
              className="flex-1"
            />
            <div className="flex bg-gray-100 rounded-lg p-0.5 mb-px">
              {sale_price_types.map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => !isReadOnly && setPriceType(pt)}
                  disabled={isReadOnly}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    priceType === pt
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  } disabled:opacity-50`}
                >
                  {sale_price_type_labels[pt]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Comprador */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Comprador</label>
          <input
            type="text"
            value={buyer}
            onChange={(e) => setBuyer(e.target.value)}
            placeholder="Nombre del comprador (opcional)"
            disabled={isReadOnly}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
          />
        </div>

        {/* Animal selector */}
        {!isReadOnly && (
          <AnimalSelector
            animals={availableAnimals}
            selectedIds={selectedAnimalIds}
            onAdd={(id) => setSelectedAnimalIds((prev) => [...prev, id])}
            onRemove={(id) => {
              setSelectedAnimalIds((prev) => prev.filter((x) => x !== id))
              setAnimalWeights((prev) => {
                const next = { ...prev }
                delete next[id]
                return next
              })
            }}
            mode="multi"
            label="Animales para venta"
            placeholder="Buscar animales para la venta..."
          />
        )}

        {/* Pesos individuales */}
        {selectedAnimalIds.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Peso por animal</label>
            <div className="space-y-1.5">
              {selectedAnimalIds.map((id) => {
                const animal = animals.find((a) => a.id === id)
                return (
                  <div key={id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {animal?.animalNumber || id}
                      {animal?.name && <span className="text-gray-400 ml-1">{animal.name}</span>}
                    </span>
                    <WeightInput
                      value={animalWeights[id]}
                      onChange={(g) => setAnimalWeights((prev) => ({ ...prev, [id]: g }))}
                      disabled={isReadOnly}
                      size="sm"
                      className="w-28 shrink-0"
                    />
                  </div>
                )
              })}
            </div>

            {/* Totales */}
            {(() => {
              const totalGrams = selectedAnimalIds.reduce(
                (sum, id) => sum + (animalWeights[id] || 0),
                0,
              )
              const totalKg = totalGrams / 1000
              const totalCentavos = Math.round((pricePerKg || 0) * totalKg)
              return (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Total</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">
                      {totalKg > 0
                        ? `${totalKg.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`
                        : '— kg'}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {totalCentavos > 0
                        ? `$${(totalCentavos / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </span>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            disabled={isReadOnly}
            placeholder="Notas adicionales..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
          />
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
          {isCompleted ? (
            <button
              onClick={handleRevert}
              disabled={isSubmitting}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              Revertir Venta
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={isSubmitting || isReadOnly}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isEditing ? 'Guardar Cambios' : 'Crear Venta'}
              </button>

              {isEditing && (
                <button
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {completeProgress
                    ? `Finalizando ${completeProgress.current}/${completeProgress.total}...`
                    : '✅ Finalizar Venta'}
                </button>
              )}

              {isEditing && !isCompleted && (
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors disabled:opacity-50"
                >
                  Eliminar
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default ModalSaleForm
