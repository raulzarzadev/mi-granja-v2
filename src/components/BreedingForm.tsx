'use client'

import React, { useState } from 'react'
import { Animal } from '@/types'
import {
  calculateExpectedBirthDate,
  getNextBirthInfo
} from '@/lib/animalBreedingConfig'
import { BreedingRecord, FemaleBreedingInfo } from '@/types/breedings'
import { InputDate } from './inputs/input-date'
import { formatDate } from '@/lib/dates'

interface BreedingFormProps {
  animals: Animal[]
  onSubmit: (
    data: Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  initialData?: BreedingRecord
}

/**
 * Formulario para registrar montas/reproducciones
 * Solo el formulario sin modal wrapper
 */
const BreedingForm: React.FC<BreedingFormProps> = ({
  animals,
  onSubmit,
  onCancel,
  isLoading = false,
  initialData
}) => {
  const [formData, setFormData] = useState<Partial<BreedingRecord>>({
    maleId: initialData?.maleId || '',
    breedingDate: initialData?.breedingDate || new Date(),
    femaleBreedingInfo: initialData?.femaleBreedingInfo || [],
    ...initialData
  })

  // Derivar femaleIds de femaleBreedingInfo
  const femaleIds =
    formData?.femaleBreedingInfo?.map((info) => info.femaleId) || []

  const [femaleSearch, setFemaleSearch] = useState('')
  const [showFemaleDropdown, setShowFemaleDropdown] = useState(false)

  // Filtrar animales por género y capacidad reproductiva
  const males = animals.filter(
    (animal) => animal.gender === 'macho' && animal.stage === 'reproductor'
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await onSubmit({
        maleId: formData?.maleId || '',
        breedingDate: new Date(formData?.breedingDate || new Date()),
        femaleBreedingInfo: formData?.femaleBreedingInfo || []
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
      setFormData((prev) => {
        const newFormData = {
          ...prev,
          [name]: value
        }

        // Si se cambia el macho, limpiar hembras que no sean del mismo tipo
        if (name === 'maleId' && value) {
          const newMale = animals.find((animal) => animal.id === value)
          if (newMale) {
            // Filtrar hembras seleccionadas para mantener solo las del mismo tipo
            const compatibleFemaleIds = femaleIds?.filter((femaleId) => {
              const female = animals.find((animal) => animal.id === femaleId)
              return female && female.type === newMale.type
            })

            // Actualizar también la info de breeding para mantener solo hembras compatibles
            const compatibleBreedingInfo = prev.femaleBreedingInfo?.filter(
              (info) => compatibleFemaleIds.includes(info.femaleId)
            )

            newFormData.femaleBreedingInfo = compatibleBreedingInfo
          }
        }

        return newFormData
      })
    }
  }

  // Permitir selección de múltiples hembras con autocompletado
  const handleFemaleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFemaleSearch(e.target.value)
    setShowFemaleDropdown(true)
  }

  const handleSelectFemale = (animalId: string) => {
    if (!femaleIds?.includes(animalId)) {
      // Agregar nueva hembra a femaleBreedingInfo
      const newFemaleInfo: FemaleBreedingInfo = {
        femaleId: animalId,
        pregnancyConfirmedDate: new Date(),
        offspring: []
      }

      setFormData((prev) => ({
        ...prev,
        femaleBreedingInfo: [...(prev.femaleBreedingInfo || []), newFemaleInfo]
      }))
    }
    setFemaleSearch('')
    setShowFemaleDropdown(false)
  }

  const handleRemoveFemale = (animalId: string) => {
    setFormData((prev) => ({
      ...prev,
      femaleBreedingInfo: prev.femaleBreedingInfo?.filter(
        (info) => info.femaleId !== animalId
      )
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
    if (!selectedMale) {
      return [] // No mostrar hembras hasta que se seleccione un macho
    }

    const availableFemales = filteredFemales

    if (!femaleSearch) return availableFemales
    return availableFemales
      .filter(
        (animal) =>
          animal.animalId.toLowerCase().includes(femaleSearch.toLowerCase()) ||
          animal.type.toLowerCase().includes(femaleSearch.toLowerCase())
      )
      .filter((animal) => !femaleIds.includes(animal.id))
  }

  const getSelectedFemales = () => {
    return femaleIds
      .map((id) => animals.find((animal) => animal.id === id))
      .filter(Boolean) as Animal[]
  }

  // Obtener información del próximo parto esperado
  const getFormNextBirthInfo = () => {
    if (femaleIds.length === 0) return null

    const selectedFemales = getSelectedFemales()
    const hasConfirmedPregnancies = formData.femaleBreedingInfo?.some(
      (info) => !!info.pregnancyConfirmedDate && !info.actualBirthDate
    )

    if (!hasConfirmedPregnancies) return null

    // Simular estructura de BreedingRecord para la función
    const mockRecord = {
      breedingDate: new Date(formData.breedingDate || new Date()),
      femaleBreedingInfo: formData.femaleBreedingInfo
    }

    // Obtener el tipo de animal más común (o el primero)
    const animalType = selectedFemales[0]?.type
    if (!animalType) return null

    const birthInfo = getNextBirthInfo(mockRecord, animalType, animals)

    return {
      date: birthInfo.expectedDate,
      daysUntil: birthInfo.daysUntil,
      animalType,
      femaleAnimalId: birthInfo.femaleAnimalId,
      hasMultiplePregnancies: birthInfo.hasMultiplePregnancies,
      totalConfirmedPregnancies: birthInfo.totalConfirmedPregnancies
    }
  }

  // Manejar cambios en la información de breeding de cada hembra
  const handleFemaleBreedingChange = (
    femaleId: string,
    field: string,
    value: string | boolean
  ) => {
    setFormData((prev) => {
      const updatedInfo = [...(prev.femaleBreedingInfo || [])]
      const existingIndex = updatedInfo.findIndex(
        (info) => info.femaleId === femaleId
      )

      if (existingIndex >= 0) {
        // Actualizar info existente
        const currentInfo = updatedInfo[existingIndex]

        if (field === 'pregnancyConfirmed' && value === true) {
          // Cuando se confirma embarazo, calcular fecha esperada automáticamente

          updatedInfo[existingIndex] = {
            ...currentInfo
          }
        } else if (field === 'pregnancyConfirmedDate') {
          updatedInfo[existingIndex] = {
            ...currentInfo
          }
        } else if (field === 'expectedBirthDate') {
          updatedInfo[existingIndex] = {
            ...currentInfo,
            expectedBirthDate: value ? new Date(value as string) : undefined
          }
        } else {
          updatedInfo[existingIndex] = {
            ...currentInfo,
            [field]: value
          }
        }
      } else {
        // Crear nueva info para esta hembra
        const newInfo: FemaleBreedingInfo = {
          femaleId
        }

        if (field === 'pregnancyConfirmedDate' && value) {
          newInfo.pregnancyConfirmedDate = new Date(value as string)
          // Si se establece fecha de confirmación, calcular parto esperado desde esa fecha
          const animal = animals.find((a) => a.id === femaleId)
          newInfo.expectedBirthDate = animal
            ? calculateExpectedBirthDate(new Date(value as string), animal.type)
            : null
        }
        if (field === 'expectedBirthDate' && value) {
          newInfo.expectedBirthDate = new Date(value as string)
        }
        updatedInfo.push(newInfo)
      }

      return {
        ...prev,
        femaleBreedingInfo: updatedInfo
      }
    })
  }

  // Obtener el macho seleccionado para filtrar hembras
  const selectedMale = animals.find((animal) => animal.id === formData.maleId)

  // Filtrar hembras según el tipo del macho seleccionado
  const getFilteredFemalesByMaleType = () => {
    if (!selectedMale) return []

    return animals.filter(
      (animal) =>
        animal.gender === 'hembra' &&
        animal.type === selectedMale.type && // Mismo tipo que el macho
        (animal.stage === 'reproductor' || animal.stage === 'lechera')
    )
  }

  const filteredFemales = getFilteredFemalesByMaleType()

  return (
    <div className="space-y-4">
      {/* Badge de tipo de animal */}
      {selectedMale && (
        <div className="flex justify-end">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <span className="mr-1">
              {selectedMale.type === 'oveja' && '🐑'}
              {selectedMale.type === 'cabra' && '🐐'}
              {(selectedMale.type === 'vaca_leche' ||
                selectedMale.type === 'vaca_engorda') &&
                '🐄'}
              {selectedMale.type === 'cerdo' && '🐷'}
            </span>
            {selectedMale.type.charAt(0).toUpperCase() +
              selectedMale.type.slice(1).replace('_', ' ')}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Macho */}
        <div>
          {/* Fecha de monta */}
          <div>
            <InputDate
              value={formData.breedingDate || new Date()}
              onChange={(date) =>
                setFormData({ ...formData, breedingDate: date })
              }
              label="Fecha de Monta"
              required
            />
          </div>
          {!selectedMale ? (
            <p className="text-sm text-gray-600 mt-1 font-medium">
              Primero selecciona un macho para ver las hembras compatibles
            </p>
          ) : femaleIds.length === 0 ? (
            <p className="text-sm text-gray-600 mt-1 font-medium">
              Debes seleccionar al menos una hembra {selectedMale.type}
            </p>
          ) : null}
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
        {/* Hembra */}
        <div>
          <label
            htmlFor="femaleSearch"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Hembra(s) *
          </label>

          {/* Badges de hembras seleccionadas */}
          {femaleIds.length > 0 && (
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
              placeholder={
                selectedMale
                  ? `Buscar hembra ${selectedMale.type} por número...`
                  : 'Primero selecciona un macho'
              }
              disabled={!selectedMale}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />

            {/* Dropdown de sugerencias */}
            {showFemaleDropdown && selectedMale && (
              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                {getFilteredFemales().length === 0 ? (
                  <div className="px-3 py-2 text-gray-600 text-sm font-medium">
                    {filteredFemales.length === 0
                      ? `No hay hembras ${selectedMale.type} disponibles`
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
        </div>

        {/* Información del parto más próximo */}
        {(() => {
          const nextBirthInfo = getFormNextBirthInfo()
          return nextBirthInfo ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-green-900 mb-2">
                🗓️ Parto Más Próximo
              </h4>
              <div className="space-y-2">
                <div className="text-sm text-green-800">
                  <div className="font-medium">
                    {nextBirthInfo.date && (
                      <span>
                        Fecha esperada:{' '}
                        {formatDate(nextBirthInfo.date, 'dd/MM/yyyy')}
                      </span>
                    )}
                  </div>
                  {nextBirthInfo.daysUntil && (
                    <div className="text-green-600 mt-1">
                      {nextBirthInfo?.daysUntil > 0
                        ? `Faltan ${nextBirthInfo.daysUntil} días`
                        : nextBirthInfo.daysUntil === 0
                        ? 'Es hoy!'
                        : `Venció hace ${Math.abs(
                            nextBirthInfo?.daysUntil
                          )} días`}
                    </div>
                  )}

                  <div className="text-xs text-green-600 mt-1">
                    {nextBirthInfo.femaleAnimalId &&
                    nextBirthInfo.femaleAnimalId !== 'Estimado'
                      ? `Hembra: ${nextBirthInfo.femaleAnimalId} (${nextBirthInfo.animalType})`
                      : `Basado en embarazos confirmados de ${nextBirthInfo.animalType}`}
                  </div>
                  {nextBirthInfo.hasMultiplePregnancies && (
                    <div className="text-xs text-blue-600 mt-1">
                      {nextBirthInfo.totalConfirmedPregnancies} embarazos
                      confirmados
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null
        })()}

        {/* Estado de embarazo por hembra */}
        {femaleIds.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Estado de Embarazo por Hembra
            </label>
            <div className="space-y-3 bg-gray-50 p-4 rounded-md">
              {getSelectedFemales().map((animal) => {
                const femaleInfo = formData.femaleBreedingInfo?.find(
                  (info) => info.femaleId === animal?.id
                ) || {
                  femaleId: animal?.id || '',
                  pregnancyConfirmed: false,
                  pregnancyConfirmedDate: '',
                  expectedBirthDate: ''
                }

                // Convertir fechas a strings para los inputs
                const pregnancyConfirmedDateStr =
                  femaleInfo.pregnancyConfirmedDate
                    ? typeof femaleInfo.pregnancyConfirmedDate === 'string'
                      ? femaleInfo.pregnancyConfirmedDate
                      : new Date(femaleInfo.pregnancyConfirmedDate)
                          .toISOString()
                          .split('T')[0]
                    : ''

                const expectedBirthDateStr = femaleInfo.expectedBirthDate
                  ? typeof femaleInfo.expectedBirthDate === 'string'
                    ? femaleInfo.expectedBirthDate
                    : new Date(femaleInfo.expectedBirthDate)
                        .toISOString()
                        .split('T')[0]
                  : ''

                return (
                  <div key={animal?.id} className="bg-white p-3 rounded border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {animal?.animalId} - {animal?.type}
                      </span>
                      {!femaleInfo.pregnancyConfirmedDate && (
                        <button
                          type="button"
                          onClick={() =>
                            handleFemaleBreedingChange(
                              animal?.id || '',
                              'pregnancyConfirmed',
                              true
                            )
                          }
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Confirmar Embarazo
                        </button>
                      )}
                      {femaleInfo.pregnancyConfirmedDate && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                          ✓ Embarazo Confirmado
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {/* Estado del embarazo */}
                      {!femaleInfo.pregnancyConfirmedDate ? (
                        <div className="text-sm text-gray-600">
                          Embarazo pendiente de confirmación
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Controles para embarazo confirmado */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-green-700 font-medium">
                              Embarazo confirmado
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleFemaleBreedingChange(
                                  animal?.id || '',
                                  'pregnancyConfirmed',
                                  false
                                )
                              }
                              className="text-xs text-red-600 hover:text-red-800 underline"
                            >
                              Desconfirmar
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Fecha de confirmación */}
                            <div>
                              <label
                                htmlFor={`confirmed-date-${animal?.id}`}
                                className="block text-xs font-medium text-gray-600 mb-1"
                              >
                                Fecha confirmación
                              </label>
                              <input
                                type="date"
                                id={`confirmed-date-${animal?.id}`}
                                value={pregnancyConfirmedDateStr}
                                onChange={(e) =>
                                  handleFemaleBreedingChange(
                                    animal?.id || '',
                                    'pregnancyConfirmedDate',
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              />
                            </div>

                            {/* Parto esperado específico */}
                            <div>
                              <label
                                htmlFor={`expected-birth-${animal?.id}`}
                                className="block text-xs font-medium text-gray-600 mb-1"
                              >
                                Parto esperado
                              </label>
                              <input
                                type="date"
                                id={`expected-birth-${animal?.id}`}
                                value={expectedBirthDateStr}
                                onChange={(e) =>
                                  handleFemaleBreedingChange(
                                    animal?.id || '',
                                    'expectedBirthDate',
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                placeholder="Se calcula automáticamente"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
            disabled={isLoading || !formData.maleId || femaleIds.length === 0}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isLoading
              ? initialData
                ? 'Actualizando...'
                : 'Registrando...'
              : !formData.maleId
              ? 'Selecciona un macho'
              : femaleIds.length === 0
              ? 'Selecciona hembras'
              : initialData
              ? 'Actualizar Monta'
              : 'Registrar Monta'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default BreedingForm
