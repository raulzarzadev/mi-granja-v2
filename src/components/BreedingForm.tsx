'use client'

import React, { useState } from 'react'
import { Animal, BreedingRecord } from '@/types'

interface BreedingFormProps {
  animals: Animal[]
  onSubmit: (
    data: Omit<
      BreedingRecord,
      'id' | 'farmerId' | 'createdAt' | 'updatedAt'
    > & { femaleIds: string[] }
  ) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

/**
 * Formulario para registrar montas/reproducciones
 * Solo el formulario sin modal wrapper
 */
const BreedingForm: React.FC<BreedingFormProps> = ({
  animals,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    femaleIds: [] as string[],
    maleId: '',
    breedingDate: new Date().toISOString().split('T')[0],
    expectedBirthDate: '',
    pregnancyConfirmed: false,
    notes: ''
  })

  const [femaleSearch, setFemaleSearch] = useState('')
  const [showFemaleDropdown, setShowFemaleDropdown] = useState(false)

  // Filtrar animales por género y capacidad reproductiva
  const females = animals.filter(
    (animal) =>
      animal.gender === 'hembra' &&
      (animal.stage === 'reproductor' || animal.stage === 'lechera')
  )

  const males = animals.filter(
    (animal) => animal.gender === 'macho' && animal.stage === 'reproductor'
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.femaleIds.length === 0 || !formData.maleId) {
      return
    }

    // Calcular fecha esperada de parto (aproximadamente 5 meses para ovejas, 9 para vacas)
    const female = animals.find((a) => a.id === formData.femaleIds[0])
    let gestationDays = 150 // Por defecto ovejas/cabras

    if (female?.type.includes('vaca')) {
      gestationDays = 280 // Vacas
    } else if (female?.type === 'cerdo') {
      gestationDays = 115 // Cerdos
    }

    const breedingDate = new Date(formData.breedingDate)
    const expectedBirth = new Date(breedingDate)
    expectedBirth.setDate(expectedBirth.getDate() + gestationDays)

    try {
      await onSubmit({
        // Enviar arreglo de IDs de hembras en lugar de una sola ID
        femaleIds: formData.femaleIds,
        maleId: formData.maleId,
        breedingDate: new Date(formData.breedingDate),
        expectedBirthDate: expectedBirth,
        pregnancyConfirmed: formData.pregnancyConfirmed,
        notes: formData.notes
      })
    } catch (error) {
      console.error('Error registrando monta:', error)
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

  // Permitir selección de múltiples hembras con autocompletado
  const handleFemaleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFemaleSearch(e.target.value)
    setShowFemaleDropdown(true)
  }

  const handleSelectFemale = (animalId: string) => {
    if (!formData.femaleIds.includes(animalId)) {
      setFormData((prev) => ({
        ...prev,
        femaleIds: [...prev.femaleIds, animalId]
      }))
    }
    setFemaleSearch('')
    setShowFemaleDropdown(false)
  }

  const handleRemoveFemale = (animalId: string) => {
    setFormData((prev) => ({
      ...prev,
      femaleIds: prev.femaleIds.filter((id) => id !== animalId)
    }))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const filteredFemales = getFilteredFemales()
      if (filteredFemales.length === 1) {
        handleSelectFemale(filteredFemales[0].id)
      }
    }
  }

  const getFilteredFemales = () => {
    if (!femaleSearch) return females
    return females
      .filter(
        (animal) =>
          animal.animalId.toLowerCase().includes(femaleSearch.toLowerCase()) ||
          animal.type.toLowerCase().includes(femaleSearch.toLowerCase())
      )
      .filter((animal) => !formData.femaleIds.includes(animal.id))
  }

  const getSelectedFemales = () => {
    return formData.femaleIds
      .map((id) => animals.find((animal) => animal.id === id))
      .filter(Boolean)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Hembra */}
        <div>
          <label
            htmlFor="femaleSearch"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Hembra(s) *
          </label>

          {/* Badges de hembras seleccionadas */}
          {formData.femaleIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {getSelectedFemales().map((animal) => (
                <div
                  key={animal?.id}
                  className="flex items-center bg-green-100 text-green-900 px-3 py-1 rounded-full text-sm font-medium"
                >
                  <span>
                    {animal?.animalId} - {animal?.type}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFemale(animal?.id || '')}
                    className="ml-2 text-green-700 hover:text-green-900 focus:outline-none font-bold text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input de búsqueda */}
          <div className="relative">
            <input
              type="text"
              id="femaleSearch"
              value={femaleSearch}
              onChange={handleFemaleSearch}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowFemaleDropdown(true)}
              onBlur={() => setTimeout(() => setShowFemaleDropdown(false), 200)}
              placeholder="Buscar hembra por número o tipo..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            {/* Dropdown de sugerencias */}
            {showFemaleDropdown && (
              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                {getFilteredFemales().length === 0 ? (
                  <div className="px-3 py-2 text-gray-600 text-sm font-medium">
                    {females.length === 0
                      ? 'No hay hembras reproductoras'
                      : 'No se encontraron hembras'}
                  </div>
                ) : (
                  getFilteredFemales().map((animal) => (
                    <button
                      key={animal.id}
                      type="button"
                      onClick={() => handleSelectFemale(animal.id)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-semibold text-gray-900">
                        {animal.animalId} - {animal.type}
                      </div>
                      <div className="text-sm text-gray-600 font-medium">
                        ({animal.stage})
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {formData.femaleIds.length === 0 && (
            <p className="text-sm text-gray-600 mt-1 font-medium">
              Debes seleccionar al menos una hembra reproductora
            </p>
          )}
        </div>

        {/* Macho */}
        <div>
          <label
            htmlFor="maleId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Macho *
          </label>
          <select
            id="maleId"
            name="maleId"
            value={formData.maleId}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Seleccionar macho</option>
            {males.map((animal) => (
              <option key={animal.id} value={animal.id}>
                {animal.animalId} - {animal.type}
              </option>
            ))}
          </select>
          {males.length === 0 && (
            <p className="text-sm text-gray-600 mt-1 font-medium">
              No hay machos reproductores disponibles
            </p>
          )}
        </div>

        {/* Fecha de monta */}
        <div>
          <label
            htmlFor="breedingDate"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Fecha de Monta *
          </label>
          <input
            type="date"
            id="breedingDate"
            name="breedingDate"
            value={formData.breedingDate}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Embarazo confirmado */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="pregnancyConfirmed"
            name="pregnancyConfirmed"
            checked={formData.pregnancyConfirmed}
            onChange={handleChange}
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label
            htmlFor="pregnancyConfirmed"
            className="ml-2 block text-sm text-gray-700"
          >
            Embarazo confirmado
          </label>
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
            placeholder="Observaciones sobre la monta..."
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
              isLoading || formData.femaleIds.length === 0 || !formData.maleId
            }
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Registrando...' : 'Registrar Monta'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default BreedingForm
