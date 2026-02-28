'use client'

import React, { useEffect, useState } from 'react'
import { Modal } from '@/components/Modal'
import RecordForm, { RecordFormState } from '@/components/RecordForm'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useReminders } from '@/hooks/useReminders'
import { buildRecordFromForm, getTodayLocalDateString } from '@/lib/records'
import { Animal, AnimalRecord } from '@/types/animals'

interface ModalCreateRecordProps {
  isOpen: boolean
  onClose: () => void
  animals: Animal[]
  /** Animal IDs that are pre-selected and cannot be removed */
  preSelectedAnimalIds?: string[]
}

const initialFormData = (): RecordFormState => ({
  type: 'note',
  category: 'general',
  title: '',
  description: '',
  date: getTodayLocalDateString(),
  severity: '',
  isResolved: false,
  resolvedDate: '',
  treatment: '',
  nextDueDate: '',
  batch: '',
  veterinarian: '',
  cost: '',
  createReminder: false,
  reminderDate: '',
})

const ModalCreateRecord: React.FC<ModalCreateRecordProps> = ({
  isOpen,
  onClose,
  animals,
  preSelectedAnimalIds = [],
}) => {
  const { addRecord, addBulkRecord } = useAnimalCRUD()
  const { createReminder } = useReminders()

  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([])
  const [formData, setFormData] = useState<RecordFormState>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sync pre-selected animals when modal opens
  useEffect(() => {
    if (isOpen && preSelectedAnimalIds.length > 0) {
      setSelectedAnimalIds((prev) => {
        const merged = new Set([...preSelectedAnimalIds, ...prev])
        return Array.from(merged)
      })
    }
  }, [isOpen, preSelectedAnimalIds])

  const resetForm = () => {
    setSelectedAnimalIds([])
    setFormData(initialFormData())
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleAddAnimal = (animalId: string) => {
    if (animalId && !selectedAnimalIds.includes(animalId)) {
      setSelectedAnimalIds((prev) => [...prev, animalId])
    }
  }

  const handleRemoveAnimal = (animalId: string) => {
    // Don't allow removing pre-selected animals
    if (preSelectedAnimalIds.includes(animalId)) return
    setSelectedAnimalIds((prev) => prev.filter((id) => id !== animalId))
  }

  const isBulk = selectedAnimalIds.length > 1

  const getTotalCost = () => {
    const unitCost = parseFloat(formData.cost) || 0
    return unitCost * selectedAnimalIds.length
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      alert('El titulo del registro es requerido')
      return
    }

    if (selectedAnimalIds.length === 0) {
      alert('Selecciona al menos un animal')
      return
    }

    setIsSubmitting(true)
    try {
      const recordData = buildRecordFromForm(formData)

      if (selectedAnimalIds.length === 1) {
        await addRecord(
          selectedAnimalIds[0],
          recordData as Omit<AnimalRecord, 'id' | 'createdAt' | 'createdBy'>,
        )
      } else {
        await addBulkRecord(selectedAnimalIds, recordData)
      }

      if (formData.createReminder && formData.reminderDate) {
        const [y, m, d] = formData.reminderDate.split('-').map(Number)
        const firstAnimal = animals.find((a) => a.id === selectedAnimalIds[0])
        await createReminder({
          title: `Recordatorio: ${formData.title}`,
          description: formData.description || '',
          dueDate: new Date(y, m - 1, d),
          completed: false,
          priority: 'medium',
          type: formData.type === 'health' ? 'medical' : 'other',
          animalNumber: firstAnimal?.animalNumber || '',
        })
      }

      handleClose()
    } catch (error) {
      console.error('Error al crear registro:', error)
      alert('Error al crear el registro. Intentalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedAnimals = animals.filter((a) => selectedAnimalIds.includes(a.id))
  const preSelectedAnimals = animals.filter((a) => preSelectedAnimalIds.includes(a.id))

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nuevo Registro">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pre-selected animal banner */}
        {preSelectedAnimalIds.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium text-green-800">Registro para:</span>
              {preSelectedAnimals.map((animal) => (
                <span
                  key={animal.id}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300"
                >
                  #{animal.animalNumber || 'Sin numero'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Selector to add more animals */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {preSelectedAnimalIds.length > 0 ? 'Agregar otro animal' : 'Agregar animal'}
          </label>
          <select
            value=""
            onChange={(e) => handleAddAnimal(e.target.value)}
            className="w-full border rounded-lg px-2 py-1.5 text-sm"
          >
            <option value="">Seleccionar animal...</option>
            {animals
              .filter((a) => !selectedAnimalIds.includes(a.id))
              .map((animal) => (
                <option key={animal.id} value={animal.id}>
                  #{animal.animalNumber || 'Sin numero'}
                </option>
              ))}
          </select>
        </div>

        {/* Additional selected animals (non-pre-selected) chips */}
        {selectedAnimals.filter((a) => !preSelectedAnimalIds.includes(a.id)).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedAnimals
              .filter((a) => !preSelectedAnimalIds.includes(a.id))
              .map((animal) => (
                <span
                  key={animal.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-200"
                >
                  #{animal.animalNumber || 'Sin numero'}
                  <button
                    type="button"
                    onClick={() => handleRemoveAnimal(animal.id)}
                    className="ml-0.5 text-blue-500 hover:text-blue-800 font-bold leading-none"
                    title="Quitar animal"
                  >
                    ×
                  </button>
                </span>
              ))}
          </div>
        )}

        {/* Form */}
        <RecordForm value={formData} onChange={setFormData} mode={isBulk ? 'bulk' : 'single'} />

        {/* Total cost for bulk health records */}
        {isBulk && formData.type === 'health' && formData.cost && (
          <div>
            <label className="block text-sm font-medium mb-1">Costo Total</label>
            <div className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 font-medium">
              ${getTotalCost().toFixed(2)}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={isSubmitting || selectedAnimalIds.length === 0}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting
              ? 'Guardando...'
              : isBulk
                ? `Aplicar a ${selectedAnimalIds.length} animales`
                : 'Guardar registro'}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ModalCreateRecord
