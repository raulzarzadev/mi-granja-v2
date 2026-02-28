'use client'

import React, { useState } from 'react'
import { Modal } from '@/components/Modal'
import RecordForm, { RecordFormState } from '@/components/RecordForm'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useReminders } from '@/hooks/useReminders'
import { buildRecordFromForm, getTodayLocalDateString } from '@/lib/records'
import { Animal } from '@/types/animals'

interface ModalBulkHealthActionProps {
  isOpen: boolean
  onClose: () => void
  selectedAnimals: Animal[]
  onSuccess?: () => void
  onRemoveAnimal?: (animalId: string) => void
}

const ModalBulkHealthAction: React.FC<ModalBulkHealthActionProps> = ({
  isOpen,
  onClose,
  selectedAnimals,
  onSuccess,
  onRemoveAnimal,
}) => {
  const { addBulkRecord } = useAnimalCRUD()
  const { createReminder } = useReminders()

  const [formData, setFormData] = useState<RecordFormState>({
    type: 'health',
    category: 'vaccine',
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

  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setFormData({
      type: 'health',
      category: 'vaccine',
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
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      alert('El título del registro es requerido')
      return
    }

    if (selectedAnimals.length === 0) {
      alert('No hay animales seleccionados')
      return
    }

    setIsSubmitting(true)

    try {
      // Preparar los datos limpiando campos vacíos
      const recordData = buildRecordFromForm(formData)

      const animalIds = selectedAnimals.map((animal) => animal.id)
      await addBulkRecord(animalIds, recordData)

      if (formData.createReminder && formData.reminderDate) {
        const [y, m, d] = formData.reminderDate.split('-').map(Number)
        await createReminder({
          title: `Recordatorio: ${formData.title}`,
          description: formData.description || '',
          dueDate: new Date(y, m - 1, d),
          completed: false,
          priority: 'medium',
          type: formData.type === 'health' ? 'medical' : 'other',
          animalNumber: selectedAnimals[0]?.animalNumber || '',
        })
      }

      onSuccess?.()
      handleClose()
    } catch (error) {
      console.error('Error al aplicar evento masivo de salud:', error)
      alert('Error al aplicar el evento. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // iconos y etiquetas ahora los maneja RecordForm

  const getTotalCost = () => {
    const unitCost = parseFloat(formData.cost) || 0
    return unitCost * selectedAnimals.length
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Aplicación de Registro Multiple">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Información de animales seleccionados */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-medium text-blue-900 mb-2">
            📊 Animales Seleccionados: {selectedAnimals.length}
          </h4>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {selectedAnimals.map((animal) => (
              <span
                key={animal.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-200"
              >
                #{animal.animalNumber || 'Sin número'}
                {onRemoveAnimal && (
                  <button
                    type="button"
                    onClick={() => onRemoveAnimal(animal.id)}
                    className="ml-0.5 text-blue-500 hover:text-blue-800 font-bold leading-none"
                    title="Quitar animal"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Formulario del registro */}
        <div className="">
          <RecordForm value={formData} onChange={setFormData} mode="bulk" />

          {formData.type === 'health' && formData.cost && (
            <div>
              <label className="block text-sm font-medium mb-1">Costo Total</label>
              <div className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 font-medium">
                ${getTotalCost().toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Campos de descripción y notas están incluidos en RecordForm */}

        {/* Botones de acción */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block animate-spin mr-2">⏳</span>
                Aplicando...
              </>
            ) : (
              <>� Aplicar a {selectedAnimals.length} Animales</>
            )}
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

export default ModalBulkHealthAction
