'use client'

import React, { useMemo, useState } from 'react'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import {
  Animal,
  AnimalRecord,
  record_category_labels,
  record_category_icons,
  record_type_labels,
  record_types,
  record_categories
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
  const { addBulkRecord } = useAnimalCRUD()

  const noteCategories = [
    'general',
    'observation',
    'other'
  ] as AnimalRecord['category'][]
  const clinicalCategories = record_categories

  const [formData, setFormData] = useState({
    type: 'health' as AnimalRecord['type'],
    category: 'vaccine' as AnimalRecord['category'],
    title: '',
    description: '',
    applicationDate: new Date().toISOString().split('T')[0],
    severity: '' as '' | NonNullable<AnimalRecord['severity']>,
    treatment: '',
    nextDueDate: '',
    batch: '',
    veterinarian: '',
    cost: ''
  })

  const availableCategories = useMemo<
    ReadonlyArray<AnimalRecord['category']>
  >(() => {
    if (formData.type === 'note') return noteCategories
    return record_categories
  }, [formData.type])

  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setFormData({
      type: 'health',
      category: 'vaccine',
      title: '',
      description: '',
      applicationDate: new Date().toISOString().split('T')[0],
      severity: '',
      treatment: '',
      nextDueDate: '',
      batch: '',
      veterinarian: '',
      cost: ''
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
      const recordData: Omit<
        AnimalRecord,
        | 'id'
        | 'createdAt'
        | 'createdBy'
        | 'appliedToAnimals'
        | 'isBulkApplication'
      > = {
        type: formData.type,
        category: formData.category,
        title: formData.title.trim(),
        date: new Date(formData.applicationDate),
        ...(formData.description
          ? { description: formData.description.trim() }
          : {}),
        // ...(formData.notes ? { notes: formData.notes.trim() } : {}),
        // Campos clínicos integrados cuando la categoría es clínica
        ...(['illness', 'injury', 'treatment', 'surgery'].includes(
          formData.category as any
        )
          ? {
              ...(formData.severity ? { severity: formData.severity } : {}),
              ...(formData.treatment
                ? { treatment: formData.treatment.trim() }
                : {})
            }
          : {}),
        ...(formData.type === 'health'
          ? {
              ...(formData.nextDueDate
                ? { nextDueDate: new Date(formData.nextDueDate) }
                : {}),
              ...(formData.batch ? { batch: formData.batch.trim() } : {}),
              ...(formData.veterinarian
                ? { veterinarian: formData.veterinarian.trim() }
                : {}),
              ...(formData.cost ? { cost: parseFloat(formData.cost) } : {})
            }
          : {})
      }

      const animalIds = selectedAnimals.map((animal) => animal.id)
      await addBulkRecord(animalIds, recordData)

      onSuccess?.()
      handleClose()
    } catch (error) {
      console.error('Error al aplicar evento masivo de salud:', error)
      alert('Error al aplicar el evento. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCategoryIcon = (category: AnimalRecord['category']) => {
    return record_category_icons[category] || '💉'
  }

  const getTotalCost = () => {
    const unitCost = parseFloat(formData.cost) || 0
    return unitCost * selectedAnimals.length
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Aplicación de Registro Multiple"
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

        {/* Formulario del registro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value as AnimalRecord['type']
                const firstCategory = (
                  newType === 'note' ? noteCategories[0] : clinicalCategories[0]
                ) as AnimalRecord['category']
                setFormData({
                  ...formData,
                  type: newType,
                  category: firstCategory
                })
              }}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            >
              {record_types.map((t) => (
                <option key={t} value={t}>
                  {record_type_labels[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as AnimalRecord['category']
                })
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            >
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {getCategoryIcon(c)} {record_category_labels[c]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Título / Producto *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
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

          {formData.type === 'health' && (
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
          )}

          {formData.type === 'health' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Lote/Batch
              </label>
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
          )}

          {formData.type === 'health' && (
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
          )}

          {formData.type === 'health' && (
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
          )}

          {formData.type === 'health' && formData.cost && (
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
          <label className="block text-sm font-medium mb-1">Descripción</label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full border rounded-lg px-3 py-2 text-sm"
            rows={2}
            placeholder="Detalles del registro..."
          />
        </div>

        {/* <div>
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
        </div> */}

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
