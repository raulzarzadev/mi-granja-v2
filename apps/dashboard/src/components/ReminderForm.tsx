'use client'

import React, { useState } from 'react'
import DateTimeInput from './inputs/DateTimeInput'

interface Reminder {
  id: string
  animalNumber?: string
  title: string
  description: string
  dueDate: Date
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  type: 'medical' | 'breeding' | 'feeding' | 'weight' | 'other'
  createdAt: Date
}

interface ReminderFormProps {
  animals?: Array<{ id: string; animalNumber: string; type: string }>
  onSubmit: (data: Omit<Reminder, 'id' | 'createdAt'>) => Promise<void>
  onCancel: () => void
  onSuccess?: () => void
  isLoading?: boolean
  initialData?: Partial<Reminder>
}

/**
 * Formulario para crear/editar recordatorios
 */
const ReminderForm: React.FC<ReminderFormProps> = ({
  animals = [],
  onSubmit,
  onCancel,
  onSuccess,
  isLoading = false,
  initialData,
}) => {
  const isEditing = !!initialData

  // En edicion: resolver animal ID desde animalNumber
  const resolveInitialAnimalIds = (): string[] => {
    if (!initialData?.animalNumber) return []
    const found = animals.find((a) => a.animalNumber === initialData.animalNumber)
    return found ? [found.id] : []
  }

  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>(resolveInitialAnimalIds)
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    dueDate: initialData?.dueDate
      ? new Date(initialData.dueDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    priority: initialData?.priority || ('medium' as const),
    type: initialData?.type || ('other' as const),
    completed: initialData?.completed || false,
  })

  const handleAddAnimal = (animalId: string) => {
    if (animalId && !selectedAnimalIds.includes(animalId)) {
      if (isEditing) {
        // En edicion solo un animal
        setSelectedAnimalIds([animalId])
      } else {
        setSelectedAnimalIds((prev) => [...prev, animalId])
      }
    }
  }

  const handleRemoveAnimal = (animalId: string) => {
    setSelectedAnimalIds((prev) => prev.filter((id) => id !== animalId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.dueDate) return

    try {
      const base = {
        title: formData.title,
        description: formData.description,
        dueDate: new Date(formData.dueDate),
        priority: formData.priority,
        type: formData.type,
        completed: formData.completed,
      }

      if (selectedAnimalIds.length === 0) {
        // Sin animal asociado
        await onSubmit({ ...base, animalNumber: undefined })
      } else if (isEditing) {
        // Edicion: un solo animal
        const animal = animals.find((a) => a.id === selectedAnimalIds[0])
        await onSubmit({ ...base, animalNumber: animal?.animalNumber })
      } else {
        // Crear: un recordatorio por animal
        for (const animalId of selectedAnimalIds) {
          const animal = animals.find((a) => a.id === animalId)
          await onSubmit({ ...base, animalNumber: animal?.animalNumber })
        }
      }

      onSuccess?.()
    } catch (error) {
      console.error('Error guardando recordatorio:', error)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement
      setFormData((prev) => ({ ...prev, [name]: checkbox.checked }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const selectedAnimals = animals.filter((a) => selectedAnimalIds.includes(a.id))
  const availableAnimals = animals.filter((a) => !selectedAnimalIds.includes(a.id))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Titulo */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Titulo *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder="Ej: Vacunacion, Revision medica..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Selector de animales */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isEditing ? 'Animal (opcional)' : 'Animales (opcional)'}
        </label>
        <select
          value=""
          onChange={(e) => handleAddAnimal(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">
            {selectedAnimalIds.length === 0
              ? 'General (todos los animales)'
              : 'Agregar animal...'}
          </option>
          {availableAnimals.map((animal) => (
            <option key={animal.id} value={animal.id}>
              #{animal.animalNumber} - {animal.type}
            </option>
          ))}
        </select>

        {/* Chips de animales seleccionados */}
        {selectedAnimals.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {selectedAnimals.map((animal) => (
              <span
                key={animal.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800 border border-green-200"
              >
                #{animal.animalNumber}
                <button
                  type="button"
                  onClick={() => handleRemoveAnimal(animal.id)}
                  className="ml-0.5 text-green-500 hover:text-green-800 font-bold leading-none"
                  title="Quitar animal"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Tipo */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="medical">🏥 Medico</option>
            <option value="breeding">🐣 Reproduccion</option>
            <option value="feeding">🌾 Alimentacion</option>
            <option value="weight">⚖️ Peso</option>
            <option value="other">📝 Otro</option>
          </select>
        </div>

        {/* Prioridad */}
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
            Prioridad
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
        </div>
      </div>

      {/* Fecha */}
      <div>
        <DateTimeInput
          value={formData.dueDate ? new Date(formData.dueDate) : null}
          onChange={(date) => {
            setFormData((prev) => ({
              ...prev,
              dueDate: date ? date.toISOString().split('T')[0] : '',
            }))
          }}
          label="Fecha limite"
          type="date"
          required
        />
      </div>

      {/* Descripcion */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Descripcion
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          placeholder="Detalles adicionales del recordatorio..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Completado (solo si es edicion) */}
      {isEditing && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="completed"
            name="completed"
            checked={formData.completed}
            onChange={handleChange}
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="completed" className="ml-2 block text-sm text-gray-700">
            Completado
          </label>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading || !formData.title || !formData.dueDate}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {isLoading
            ? isEditing
              ? 'Actualizando...'
              : 'Creando...'
            : isEditing
              ? 'Actualizar'
              : selectedAnimalIds.length > 1
                ? `Crear ${selectedAnimalIds.length} Recordatorios`
                : 'Crear Recordatorio'}
        </button>
      </div>
    </form>
  )
}

export default ReminderForm
