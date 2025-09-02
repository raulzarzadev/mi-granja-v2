'use client'

import React, { useState } from 'react'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import {
  HealthEvent,
  health_event_types,
  health_event_types_labels,
  health_event_types_icons,
  Animal
} from '@/types/animals'
import { Modal } from '@/components/Modal'

interface ModalBulkHealthActionProps {
  isOpen: boolean
  onClose: () => void
  selectedAnimals: Animal[]
  onSuccess?: () => void
}

const ModalBulkHealthAction: React.FC<ModalBulkHealthActionProps> = ({
  isOpen,
  onClose,
  selectedAnimals,
  onSuccess
}) => {
  const { addBulkHealthEvent } = useAnimalCRUD()

  const [formData, setFormData] = useState({
    type: 'vaccine' as HealthEvent['type'],
    name: '',
    applicationDate: new Date().toISOString().split('T')[0],
    nextDueDate: '',
    batch: '',
    veterinarian: '',
    cost: '',
    notes: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setFormData({
      type: 'vaccine',
      name: '',
      applicationDate: new Date().toISOString().split('T')[0],
      nextDueDate: '',
      batch: '',
      veterinarian: '',
      cost: '',
      notes: ''
    })
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('El nombre del evento es requerido')
      return
    }

    if (selectedAnimals.length === 0) {
      alert('No hay animales seleccionados')
      return
    }

    setIsSubmitting(true)

    try {
      // Preparar los datos limpiando campos vacíos
      const eventData = {
        type: formData.type,
        name: formData.name.trim(),
        applicationDate: new Date(formData.applicationDate),
        ...(formData.nextDueDate
          ? { nextDueDate: new Date(formData.nextDueDate) }
          : {}),
        ...(formData.batch ? { batch: formData.batch.trim() } : {}),
        ...(formData.veterinarian
          ? { veterinarian: formData.veterinarian.trim() }
          : {}),
        ...(formData.cost ? { cost: parseFloat(formData.cost) } : {}),
        ...(formData.notes ? { notes: formData.notes.trim() } : {})
      }

      const animalIds = selectedAnimals.map((animal) => animal.id)
      await addBulkHealthEvent(animalIds, eventData)

      onSuccess?.()
      handleClose()
    } catch (error) {
      console.error('Error al aplicar evento masivo de salud:', error)
      alert('Error al aplicar el evento. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getEventTypeIcon = (type: HealthEvent['type']) => {
    return health_event_types_icons[type] || '💉'
  }

  const getTotalCost = () => {
    const unitCost = parseFloat(formData.cost) || 0
    return unitCost * selectedAnimals.length
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Aplicación Masiva de Evento de Salud"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Información de animales seleccionados */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-medium text-blue-900 mb-2">
            📊 Animales Seleccionados: {selectedAnimals.length}
          </h4>
          <div className="text-sm text-blue-700 max-h-20 overflow-y-auto">
            {selectedAnimals.map((animal, index) => (
              <span key={animal.id}>
                {animal.animalNumber || `Sin número`}
                {index < selectedAnimals.length - 1 && ', '}
              </span>
            ))}
          </div>
        </div>

        {/* Formulario del evento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tipo de Evento
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as HealthEvent['type']
                })
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            >
              {health_event_types.map((type) => (
                <option key={type} value={type}>
                  {getEventTypeIcon(type)} {health_event_types_labels[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Nombre/Producto *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Ej: Vacuna Triple, Vitamina B12..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Fecha de Aplicación
            </label>
            <input
              type="date"
              value={formData.applicationDate}
              onChange={(e) =>
                setFormData({ ...formData, applicationDate: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Próximo Vencimiento
            </label>
            <input
              type="date"
              value={formData.nextDueDate}
              onChange={(e) =>
                setFormData({ ...formData, nextDueDate: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Opcional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Lote/Batch</label>
            <input
              type="text"
              value={formData.batch}
              onChange={(e) =>
                setFormData({ ...formData, batch: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Número de lote"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Veterinario
            </label>
            <input
              type="text"
              value={formData.veterinarian}
              onChange={(e) =>
                setFormData({ ...formData, veterinarian: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Nombre del veterinario"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Costo por Animal
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.cost}
              onChange={(e) =>
                setFormData({ ...formData, cost: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>

          {formData.cost && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Costo Total
              </label>
              <div className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 font-medium">
                ${getTotalCost().toFixed(2)}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notas</label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            className="w-full border rounded-lg px-3 py-2 text-sm"
            rows={3}
            placeholder="Observaciones sobre la aplicación masiva..."
          />
        </div>

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
              <>💉 Aplicar a {selectedAnimals.length} Animales</>
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
