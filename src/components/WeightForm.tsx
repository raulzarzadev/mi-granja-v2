'use client'

import React, { useState } from 'react'
import { WeightRecord } from '@/types'

interface WeightFormProps {
  animalNumber?: string
  animals?: Array<{ id: string; animalNumber: string; type: string }>
  onSubmit: (data: Omit<WeightRecord, 'id'>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

/**
 * Formulario para registrar peso de animales
 */
const WeightForm: React.FC<WeightFormProps> = ({
  animalNumber,
  animals = [],
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    animalNumber: animalNumber || '',
    weight: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.animalNumber || !formData.weight) {
      return
    }

    // Encontrar el animal seleccionado para obtener su animalNumber
    const selectedAnimal = animals?.find(
      (animal) => animal.id === formData.animalNumber
    )
    if (!selectedAnimal) {
      console.error('Animal no encontrado')
      return
    }

    try {
      await onSubmit({
        animalNumber: selectedAnimal.animalNumber, // Usar el animalNumber del usuario, no el ID de Firestore
        weight: parseFloat(formData.weight),
        date: new Date(formData.date),
        notes: formData.notes
      })
    } catch (error) {
      console.error('Error registrando peso:', error, formData)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Registrar Peso
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Animal (solo mostrar si no está preseleccionado) */}
            {!animalNumber && (
              <div>
                <label
                  htmlFor="animalNumber"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Animal *
                </label>
                <select
                  id="animalNumber"
                  name="animalNumber"
                  value={formData.animalNumber}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Seleccionar animal</option>
                  {animals.map((animal) => (
                    <option key={animal.id} value={animal.id}>
                      {animal.animalNumber} - {animal.type}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Peso */}
            <div>
              <label
                htmlFor="weight"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Peso (kg) *
              </label>
              <input
                type="number"
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                step="0.1"
                min="0"
                required
                placeholder="0.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Fecha */}
            <div>
              <label
                htmlFor="date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Fecha *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
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
                onChange={handleChange}
                rows={3}
                placeholder="Observaciones sobre el pesaje..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

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
                disabled={
                  isLoading || !formData.animalNumber || !formData.weight
                }
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Registrando...' : 'Registrar Peso'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default WeightForm
