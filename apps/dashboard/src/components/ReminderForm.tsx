'use client'

import React, { useState } from 'react'
import InputRadioChip, { type InputRadioChipOption } from '@/components/inputs/InputRadioChip'
import InputSelectAnimals from '@/components/inputs/InputSelectAnimals'
import InputSelectAssignees from '@/components/inputs/InputSelectAssignees'
import { Animal } from '@/types/animals'
import DateTimeInput from './inputs/DateTimeInput'

interface Reminder {
  id: string
  animalNumber?: string
  animalNumbers?: string[]
  title: string
  description: string
  dueDate: Date
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  type: 'medical' | 'breeding' | 'feeding' | 'weight' | 'other'
  assigneeIds?: string[]
  createdAt: Date
}

interface ReminderFormProps {
  animals?: Animal[]
  onSubmit: (data: Omit<Reminder, 'id' | 'createdAt'>) => Promise<void>
  onCancel: () => void
  onSuccess?: () => void
  isLoading?: boolean
  initialData?: Partial<Reminder>
}

const TYPE_OPTIONS: InputRadioChipOption<Reminder['type']>[] = [
  { value: 'medical', label: '🏥 Médico' },
  { value: 'breeding', label: '🐣 Reproducción' },
  { value: 'feeding', label: '🌾 Alimentación' },
  { value: 'weight', label: '⚖️ Peso' },
  { value: 'other', label: '📝 Otro' },
]

const PRIORITY_OPTIONS: InputRadioChipOption<Reminder['priority']>[] = [
  { value: 'low', label: '🟢 Baja', activeBg: 'bg-green-600' },
  { value: 'medium', label: '🟡 Media', activeBg: 'bg-yellow-500' },
  { value: 'high', label: '🔴 Alta', activeBg: 'bg-red-600' },
]

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

  // En edicion: resolver animal IDs desde animalNumbers o legacy animalNumber
  const resolveInitialAnimalIds = (): string[] => {
    const numbers =
      initialData?.animalNumbers || (initialData?.animalNumber ? [initialData.animalNumber] : [])
    return numbers
      .map((num) => animals.find((a) => a.animalNumber === num)?.id)
      .filter(Boolean) as string[]
  }

  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>(resolveInitialAnimalIds)
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initialData?.assigneeIds || [])
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
      setSelectedAnimalIds((prev) => [...prev, animalId])
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

      const animalNumbers = selectedAnimalIds
        .map((id) => animals.find((a) => a.id === id)?.animalNumber)
        .filter(Boolean) as string[]

      await onSubmit({
        ...base,
        animalNumber: animalNumbers[0] || undefined,
        animalNumbers: animalNumbers.length > 0 ? animalNumbers : undefined,
        assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
      })

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
      <InputSelectAnimals
        animals={animals}
        selectedIds={selectedAnimalIds}
        onAdd={handleAddAnimal}
        onRemove={handleRemoveAnimal}
        label={isEditing ? 'Animal (opcional)' : 'Animales (opcional)'}
        placeholder="Buscar animal..."
      />
      {/* Asignar a colaboradores */}
      <InputSelectAssignees
        value={assigneeIds}
        onChange={setAssigneeIds}
        label="Asignar a (opcional)"
        helpText="Si dejas en blanco, sólo se notifica al dueño de la granja."
      />
      <div className="grid grid-cols-1 gap-3">
        <InputRadioChip
          name="type"
          label="Tipo"
          value={formData.type}
          onChange={(v) => setFormData((prev) => ({ ...prev, type: v }))}
          options={TYPE_OPTIONS}
        />
        <InputRadioChip
          name="priority"
          label="Prioridad"
          value={formData.priority}
          onChange={(v) => setFormData((prev) => ({ ...prev, priority: v }))}
          options={PRIORITY_OPTIONS}
        />
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
                ? `Crear Recordatorio (${selectedAnimalIds.length} animales)`
                : 'Crear Recordatorio'}
        </button>
      </div>
    </form>
  )
}

export default ReminderForm
