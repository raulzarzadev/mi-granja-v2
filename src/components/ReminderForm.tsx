'use client'

import React, { useState } from 'react'

interface Reminder {
  id: string
  animalId?: string
  title: string
  description: string
  dueDate: Date
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  type: 'medical' | 'breeding' | 'feeding' | 'weight' | 'other'
  createdAt: Date
}

interface ReminderFormProps {
  animals?: Array<{ id: string; animalId: string; type: string }>
  onSubmit: (data: Omit<Reminder, 'id' | 'createdAt'>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<Reminder>
}

/**
 * Formulario para crear recordatorios
 */
const ReminderForm: React.FC<ReminderFormProps> = ({
  animals = [],
  onSubmit,
  onCancel,
  isLoading = false,
  initialData
}) => {
  const [formData, setFormData] = useState({
    animalId: initialData?.animalId || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    dueDate: initialData?.dueDate
      ? new Date(initialData.dueDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    priority: initialData?.priority || ('medium' as const),
    type: initialData?.type || ('other' as const),
    completed: initialData?.completed || false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.dueDate) {
      return
    }

    try {
      await onSubmit({
        animalId: formData.animalId || undefined,
        title: formData.title,
        description: formData.description,
        dueDate: new Date(formData.dueDate),
        priority: formData.priority,
        type: formData.type,
        completed: formData.completed
      })
    } catch (error) {
      console.error('Error creando recordatorio:', error)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement
      setFormData((prev) => ({
        ...prev,
        [name]: checkbox.checked
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value
      }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Título */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Título *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder="Ej: Vacunación, Revisión médica..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Animal (opcional) */}
      <div>
        <label
          htmlFor="animalId"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Animal (opcional)
        </label>
        <select
          id="animalId"
          name="animalId"
          value={formData.animalId}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">General (todos los animales)</option>
          {animals.map((animal) => (
            <option key={animal.id} value={animal.id}>
              {animal.animalId} - {animal.type}
            </option>
          ))}
        </select>
      </div>

      {/* Tipo */}
      <div>
        <label
          htmlFor="type"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Tipo
        </label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="medical">🏥 Médico</option>
          <option value="breeding">🐣 Reproducción</option>
          <option value="feeding">🌾 Alimentación</option>
          <option value="weight">⚖️ Peso</option>
          <option value="other">📝 Otro</option>
        </select>
      </div>

      {/* Prioridad */}
      <div>
        <label
          htmlFor="priority"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Prioridad
        </label>
        <select
          id="priority"
          name="priority"
          value={formData.priority}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="low">🟢 Baja</option>
          <option value="medium">🟡 Media</option>
          <option value="high">🔴 Alta</option>
        </select>
      </div>

      {/* Fecha */}
      <div>
        <label
          htmlFor="dueDate"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Fecha límite *
        </label>
        <input
          type="date"
          id="dueDate"
          name="dueDate"
          value={formData.dueDate}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Descripción */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Descripción
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

      {/* Completado (solo si es edición) */}
      {initialData && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="completed"
            name="completed"
            checked={formData.completed}
            onChange={handleChange}
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label
            htmlFor="completed"
            className="ml-2 block text-sm text-gray-700"
          >
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
            ? initialData
              ? 'Actualizando...'
              : 'Creando...'
            : initialData
            ? 'Actualizar'
            : 'Crear Recordatorio'}
        </button>
      </div>
    </form>
  )
}

export default ReminderForm
