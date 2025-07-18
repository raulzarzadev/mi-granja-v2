'use client'

import { Animal, AnimalStage, AnimalType } from '@/types/animals'
import React, { useState } from 'react'

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
    type: initialData?.type || ('oveja' as AnimalType),
    stage: initialData?.stage || ('cria' as AnimalStage),
    gender: initialData?.gender || ('hembra' as 'macho' | 'hembra'),
    weight: initialData?.weight || '',
    age: initialData?.age || '',
    birthDate: initialData?.birthDate
      ? initialData.birthDate.toISOString().split('T')[0]
      : '',
    motherId: initialData?.motherId || '',
    fatherId: initialData?.fatherId || '',
    notes: initialData?.notes || ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const animalTypes: { value: AnimalType; label: string }[] = [
    { value: 'oveja', label: 'Oveja' },
    { value: 'vaca_leche', label: 'Vaca Lechera' },
    { value: 'vaca_engorda', label: 'Vaca de Engorda' },
    { value: 'cabra', label: 'Cabra' },
    { value: 'cerdo', label: 'Cerdo' }
  ]

  const animalStages: { value: AnimalStage; label: string }[] = [
    { value: 'cria', label: 'Cría' },
    { value: 'engorda', label: 'Engorda' },
    { value: 'lechera', label: 'Lechera' },
    { value: 'reproductor', label: 'Reproductor' },
    { value: 'descarte', label: 'Descarte' }
  ]

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))

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
      ...(formData.weight && { weight: Number(formData.weight) }),
      ...(formData.age && { age: Number(formData.age) }),
      ...(formData.birthDate && { birthDate: new Date(formData.birthDate) }),
      ...(formData.motherId.trim() && { motherId: formData.motherId.trim() }),
      ...(formData.fatherId.trim() && { fatherId: formData.fatherId.trim() }),
      ...(formData.notes.trim() && { notes: formData.notes.trim() })
    }
    // const animalData: Omit<
    //   Animal,
    //   'id' | 'farmerId' | 'createdAt' | 'updatedAt'
    // > = {
    //   animalNumber: formData.animalNumber.trim(),
    //   type: formData.type,
    //   stage: formData.stage,
    //   gender: formData.gender,
    //   weight: formData.weight ? Number(formData.weight) : undefined,
    //   age: formData.age ? Number(formData.age) : undefined,
    //   birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
    //   motherId: formData.motherId.trim() || undefined,
    //   fatherId: formData.fatherId.trim() || undefined,
    //   notes: formData.notes.trim() || undefined
    // }

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
          {animalTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
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
          {animalStages.map((stage) => (
            <option key={stage.value} value={stage.value}>
              {stage.label}
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
        <label
          htmlFor="birthDate"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Fecha de Nacimiento
        </label>
        <input
          type="date"
          id="birthDate"
          name="birthDate"
          value={formData.birthDate}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          disabled={isLoading}
        />
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
