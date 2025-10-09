'use client'

import {
  Animal,
  animal_icon,
  animal_statuses,
  animals_genders,
  animals_stages,
  animals_types,
  AnimalStage,
  AnimalType,
  breeding_animal_status
} from '@/types/animals'
import { toDate } from 'date-fns'
import React, { useState } from 'react'
import DateTimeInput from './inputs/DateTimeInput'

interface AnimalFormProps {
  onSubmit: (
    animalData: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => void
  onCancel: () => void
  initialData?: Partial<Animal>
  isLoading?: boolean
}

/**
 * Formulario para registrar o editar animales
 * Optimizado para uso móvil con validación integrada
 */
const AnimalForm: React.FC<AnimalFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    animalNumber: initialData?.animalNumber || '',
    type: initialData?.type || animals_types[0],
    stage: initialData?.stage || animals_stages[0],
    gender: initialData?.gender || animals_genders[0],
    weight: initialData?.weight || '',
    age: initialData?.age || '',
    breed: initialData?.breed || '',
    birthDate: initialData?.birthDate ? toDate(initialData?.birthDate) : null,
    customWeaningDays:
      typeof initialData?.customWeaningDays === 'number'
        ? String(initialData.customWeaningDays)
        : '',
    motherId: initialData?.motherId || '',
    fatherId: initialData?.fatherId || '',
    notes: initialData?.notes || '',
    status: initialData?.status || 'activo'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const animalTypeOptions: { value: AnimalType; label: string }[] =
    animals_types.map((type) => ({
      value: type,
      label: `${animal_icon[type]} ${
        type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
      }`
    }))

  const animalStagesOptions: { value: AnimalStage; label: string }[] =
    animals_stages.map((stage) => ({
      value: stage,
      label: stage.charAt(0).toUpperCase() + stage.slice(1).replace('_', ' ')
    }))

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target

    // Si se está modificando la edad, calcular la fecha de nacimiento automáticamente
    if (name === 'age' && value) {
      const ageInMonths = Number(value)
      if (!isNaN(ageInMonths) && ageInMonths >= 0) {
        const today = new Date()
        const birthDate = new Date(today)
        birthDate.setMonth(today.getMonth() - ageInMonths)

        setFormData((prev) => ({
          ...prev,
          [name]: value,
          birthDate: birthDate
        }))
      } else {
        setFormData((prev) => ({
          ...prev,
          [name]: value
        }))
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value
      }))
    }

    // Limpiar error del campo al escribir
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.animalNumber.trim()) {
      newErrors.animalNumber = 'El ID del animal es requerido'
    }

    if (
      formData.weight &&
      (isNaN(Number(formData.weight)) || Number(formData.weight) <= 0)
    ) {
      newErrors.weight = 'El peso debe ser un número válido mayor a 0'
    }

    if (
      formData.age &&
      (isNaN(Number(formData.age)) || Number(formData.age) < 0)
    ) {
      newErrors.age = 'La edad debe ser un número válido mayor o igual a 0'
    }

    if (
      formData.customWeaningDays &&
      (isNaN(Number(formData.customWeaningDays)) ||
        Number(formData.customWeaningDays) <= 0)
    ) {
      newErrors.customWeaningDays =
        'Debe ser un número válido mayor a 0 (o deja vacío para usar el defecto)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Solo agregar los campos que tienen valores válidos
    const animalData: Omit<
      Animal,
      'id' | 'farmerId' | 'createdAt' | 'updatedAt'
    > = {
      animalNumber: formData.animalNumber.trim(),
      type: formData.type,
      stage: formData.stage,
      gender: formData.gender,
      breed: formData.breed || '',
      status: formData.status,
      ...(formData.weight && { weight: Number(formData.weight) }),
      ...(formData.age && { age: Number(formData.age) }),
      ...(formData.birthDate && { birthDate: formData.birthDate }),
      ...(formData.customWeaningDays && {
        customWeaningDays: Number(formData.customWeaningDays)
      }),
      ...(formData.motherId.trim() && { motherId: formData.motherId.trim() }),
      ...(formData.fatherId.trim() && { fatherId: formData.fatherId.trim() }),
      ...(formData.notes.trim() && { notes: formData.notes.trim() })
    }

    onSubmit(animalData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ID del Animal */}
      <div>
        <label
          htmlFor="animalNumber"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          ID del Animal *
        </label>
        <input
          type="text"
          id="animalNumber"
          name="animalNumber"
          value={formData.animalNumber}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder:text-gray-600 placeholder:opacity-100 ${
            errors.animalNumber ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Ej: A001, OV123"
          disabled={isLoading}
        />
        {errors.animalNumber && (
          <p className="text-red-500 text-xs mt-1">{errors.animalNumber}</p>
        )}
      </div>

      {/* Tipo de Animal */}
      <div>
        <label
          htmlFor="type"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Tipo de Animal *
        </label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          disabled={isLoading}
        >
          {animalTypeOptions.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
      {/* Raza */}
      <div>
        <label
          htmlFor="breed"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Raza
        </label>
        <input
          type="text"
          id="breed"
          name="breed"
          value={formData.breed}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Ej: Holstein, Angus, Dorper"
          disabled={isLoading}
        />
      </div>

      {/* Etapa */}
      <div>
        <label
          htmlFor="stage"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Etapa *
        </label>
        <select
          id="stage"
          name="stage"
          value={formData.stage}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          disabled={isLoading}
        >
          {animalStagesOptions.map((stage) => (
            <option key={stage.value} value={stage.value}>
              {stage.label}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}

      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Estado *
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          disabled={isLoading}
        >
          {[...animal_statuses, ...breeding_animal_status].map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() +
                status.slice(1).replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Género */}

      <div>
        <label
          htmlFor="gender"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Género *
        </label>
        <select
          id="gender"
          name="gender"
          value={formData.gender}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          disabled={isLoading}
        >
          <option value="hembra">Hembra</option>
          <option value="macho">Macho</option>
        </select>
      </div>

      {/* Peso y Edad en una fila */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="weight"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Peso (kg)
          </label>
          <input
            type="number"
            id="weight"
            name="weight"
            value={formData.weight}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors.weight ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0"
            min="0"
            step="0.1"
            disabled={isLoading}
          />
          {errors.weight && (
            <p className="text-red-500 text-xs mt-1">{errors.weight}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="age"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Edad (meses)
          </label>
          <input
            type="number"
            id="age"
            name="age"
            value={formData.age}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors.age ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0"
            min="0"
            disabled={isLoading}
          />
          {errors.age && (
            <p className="text-red-500 text-xs mt-1">{errors.age}</p>
          )}
        </div>
      </div>

      {/* Fecha de Nacimiento */}
      <div>
        <DateTimeInput
          value={formData.birthDate}
          onChange={(date) => {
            // Calcular edad en meses automáticamente si hay fecha
            let calculatedAge = ''
            if (date) {
              const today = new Date()
              const monthsDiff =
                (today.getFullYear() - date.getFullYear()) * 12 +
                (today.getMonth() - date.getMonth())
              calculatedAge = Math.max(0, monthsDiff).toString()
            }

            setFormData((prev) => ({
              ...prev,
              birthDate: date,
              age: calculatedAge
            }))

            // Limpiar error del campo al cambiar
            if (errors.birthDate) {
              setErrors((prev) => ({
                ...prev,
                birthDate: ''
              }))
            }
          }}
          label="Fecha de Nacimiento"
          type="datetime"
          disabled={isLoading}
        />
      </div>

      {/* Días de destete (override) */}
      <div>
        <label
          htmlFor="customWeaningDays"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Días de destete (opcional)
        </label>
        <input
          type="number"
          id="customWeaningDays"
          name="customWeaningDays"
          value={formData.customWeaningDays}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
            errors.customWeaningDays ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Ej: 60"
          min="1"
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 mt-1">
          Si lo dejas vacío, se usará el valor por defecto según la especie.
        </p>
        {errors.customWeaningDays && (
          <p className="text-red-500 text-xs mt-1">
            {errors.customWeaningDays}
          </p>
        )}
      </div>

      {/* Padres en una fila */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="motherId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            ID Madre
          </label>
          <input
            type="text"
            id="motherId"
            name="motherId"
            value={formData.motherId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Opcional"
            disabled={isLoading}
          />
        </div>

        <div>
          <label
            htmlFor="fatherId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            ID Padre
          </label>
          <input
            type="text"
            id="fatherId"
            name="fatherId"
            value={formData.fatherId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Opcional"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Notas */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Notas
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Observaciones adicionales..."
          disabled={isLoading}
        />
      </div>

      {/* Botones */}
      <div className="flex space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
          disabled={isLoading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading
            ? 'Guardando...'
            : initialData
            ? 'Actualizar'
            : 'Registrar'}
        </button>
      </div>
    </form>
  )
}

export default AnimalForm
