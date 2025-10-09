'use client'

import React, { useEffect, useState } from 'react'
import { calculateExpectedBirthDate } from '@/lib/animalBreedingConfig'
import { BreedingRecord, FemaleBreedingInfo } from '@/types/breedings'
import DateTimeInput from './inputs/DateTimeInput'
import { Animal } from '@/types/animals'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { Icon } from './Icon/icon'

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
  const { remove } = useAnimalCRUD()
  const [formData, setFormData] = useState<Partial<BreedingRecord>>({
    maleId: initialData?.maleId || '',
    breedingDate: initialData?.breedingDate || new Date(),
    femaleBreedingInfo: initialData?.femaleBreedingInfo || [],
    ...initialData
  })

  // Derivar animalsIds de femaleBreedingInfo
  const breedingAnimalIds =
    formData?.femaleBreedingInfo?.map((info) => info.femaleId) || []

  const [femaleSearch, setFemaleSearch] = useState('')
  const [showFemaleDropdown, setShowFemaleDropdown] = useState(false)
  const [animalType, setAnimalType] = useState<Animal['type'] | null>(null)
  useEffect(() => {
    // Actualizar tipo de animal cuando se seleccione un macho
    const selectedMale = animals.find((animal) => animal.id === formData.maleId)
    if (selectedMale) {
      setAnimalType(selectedMale.type)
    } else {
      setAnimalType(null)
    }
  }, [animals, formData.maleId])

  // Filtrar animales por género y capacidad reproductiva
  const males = animals.filter(
    (animal) =>
      (animal.status ?? 'activo') === 'activo' &&
      animal.gender === 'macho' &&
      animal.stage === 'reproductor'
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const breedingData = {
      maleId: formData?.maleId || '',
      breedingDate: new Date(formData?.breedingDate || new Date()),
      femaleBreedingInfo: formData?.femaleBreedingInfo || []
    }
    try {
      await onSubmit(breedingData)
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
            const compatibleAnimalNumbers = breedingAnimalIds?.filter(
              (animalNumber) => {
                const female = animals.find(
                  (animal) => animal.id === animalNumber
                )
                return female && female.type === newMale.type
              }
            )

            // Actualizar también la info de breeding para mantener solo hembras compatibles
            const compatibleBreedingInfo = prev.femaleBreedingInfo?.filter(
              (info) => compatibleAnimalNumbers.includes(info.femaleId)
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
    if (!breedingAnimalIds?.includes(animalId)) {
      // Agregar nueva hembra a femaleBreedingInfo
      const newFemaleInfo: FemaleBreedingInfo = {
        femaleId: animalId,
        pregnancyConfirmedDate: null,
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
          animal.animalNumber
            .toLowerCase()
            .includes(femaleSearch.toLowerCase()) ||
          animal.type.toLowerCase().includes(femaleSearch.toLowerCase())
      )
      .filter((animal) => !breedingAnimalIds.includes(animal.id))
  }

  const getSelectedFemales = () => {
    return breedingAnimalIds
      .map((id) => animals.find((animal) => animal.id === id))
      .filter(Boolean) as Animal[]
  }

  // Manejar cambios en la información de breeding de cada hembra

  //#region handleChange
  const handleFemaleBreedingChange = async (
    animalId: string,
    field: string,
    value: string | boolean | Date
  ) => {
    const updatedInfo = [...(formData.femaleBreedingInfo || [])]
    const existingIndex = updatedInfo.findIndex(
      (info) => info.femaleId === animalId
    )

    // animalType must be defined to calculate dates
    if (existingIndex >= 0 && animalType) {
      // Update existing info
      const currentInfo = updatedInfo[existingIndex]

      if (field === 'pregnancyConfirmed') {
        if (value) {
          updatedInfo[existingIndex] = {
            ...currentInfo,
            pregnancyConfirmedDate: new Date()
          }
        } else {
          updatedInfo[existingIndex] = {
            ...currentInfo,
            pregnancyConfirmedDate: null,
            expectedBirthDate: null,
            actualBirthDate: null
          }
        }
        // When pregnancy is confirmed, calculate expected date automatically
      } else if (field === 'pregnancyConfirmedDate') {
        updatedInfo[existingIndex] = {
          ...currentInfo,
          pregnancyConfirmedDate: value as Date,
          expectedBirthDate: calculateExpectedBirthDate(
            value as Date,
            animalType
          )
        }
      } else if (field === 'actualBirthDate') {
        if (value) {
          updatedInfo[existingIndex] = {
            ...currentInfo,
            actualBirthDate: value as Date
          }
        } else {
          const offspring = currentInfo.offspring || []

          // Remove associated offspring if birth is cancelled
          if (offspring && offspring.length > 0) {
            try {
              await Promise.all(
                offspring.map((offspringId) => remove(offspringId))
              )
              updatedInfo[existingIndex] = {
                ...currentInfo,
                actualBirthDate: null,
                offspring: []
              }
            } catch (error) {
              console.error('Error removing offspring:', error)
              // Optional: show error notification to user
            }
          }
        }
      } else {
        updatedInfo[existingIndex] = {
          ...currentInfo,
          [field]: value
        }
      }
    } else {
      // Create new info for this female
      const newInfo: FemaleBreedingInfo = {
        femaleId: animalId,
        pregnancyConfirmedDate: null,
        expectedBirthDate: null,
        actualBirthDate: null
      }

      updatedInfo.push(newInfo)
    }

    setFormData({
      ...formData,
      femaleBreedingInfo: updatedInfo
    })
  }

  // Obtener el macho seleccionado para filtrar hembras
  const selectedMale = animals.find((animal) => animal.id === formData.maleId)

  // Filtrar hembras según el tipo del macho seleccionado
  const getFilteredFemalesByMaleType = () => {
    if (!selectedMale) return []

    return animals.filter(
      (animal) =>
        (animal.status ?? 'activo') === 'activo' &&
        animal.gender === 'hembra' &&
        animal.type === selectedMale.type && // Mismo tipo que el macho
        (animal.stage === 'reproductor' || animal.stage === 'lechera')
    )
  }

  const filteredFemales = getFilteredFemalesByMaleType()

  return (
    <div>
      {/* Badge de tipo de animal */}
      {selectedMale && (
        <div className="flex justify-end">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <span className="mr-1">
              {selectedMale.type === 'oveja' && '🐑'}
              {selectedMale.type === 'cabra' && '🐐'}
              {selectedMale.type === 'vaca' && '🐄'}
              {selectedMale.type === 'cerdo' && '🐷'}
            </span>
            {selectedMale.type.charAt(0).toUpperCase() +
              selectedMale.type.slice(1).replace('_', ' ')}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-1">
        {/* Macho */}
        <div>
          {/* Fecha de monta */}
          <div>
            <DateTimeInput
              value={formData.breedingDate || new Date()}
              onChange={(date) => {
                console.log({ date })
                return setFormData({ ...formData, breedingDate: date })
              }}
              label="Fecha de Monta"
              type="date"
              required
            />
          </div>
          {!selectedMale ? (
            <p className="text-sm text-gray-600 mt-1 font-medium">
              Primero selecciona un macho para ver las hembras compatibles
            </p>
          ) : breedingAnimalIds.length === 0 ? (
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
                {animal.animalNumber} - {animal.type}
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
          {/* {breedingAnimalIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {getSelectedFemales().map((animal) => (
                <div
                  key={animal?.id}
                  className={
                    'flex items-center bg-green-100 text-green-900 px-3 py-1 rounded-full text-sm font-medium'
                  }
                >
                  <span>
                    {animal?.animalNumber} - {animal?.type}
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
          )} */}

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
                    <div key={animal.id} className="flex items-center ">
                      <button
                        type="button"
                        onClick={() => handleSelectFemale(animal.id)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0 flex items-center gap-1"
                      >
                        <div className="font-semibold text-gray-900">
                          {animal.animalNumber} - {animal.type}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">
                          ({animal.stage})
                        </div>
                      </button>
                      {breedingAnimalIds.includes(animal.id) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFemale(animal?.id || '')}
                          className="ml-2 text-green-700 hover:text-green-900 focus:outline-none font-bold text-lg leading-none"
                        >
                          <Icon icon="close" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Estado de embarazo por hembra */}
        {breedingAnimalIds.length > 0 && (
          <div>
            <label className="block text-sm  font-medium text-gray-700 ">
              Estado de Embarazo por Hembra
            </label>
            <div className="space-y-3 bg-gray-50  rounded-md">
              {getSelectedFemales().map((animal) => {
                const femaleInfo = formData.femaleBreedingInfo?.find(
                  (info) => info.femaleId === animal?.id
                )

                if (femaleInfo)
                  //#region Confirm
                  return (
                    <div
                      key={animal?.id}
                      className="bg-white p-2 rounded border"
                    >
                      <div className="flex items-center justify-between ">
                        <span className="font-medium text-gray-900">
                          {animal?.animalNumber} - {animal?.type}
                        </span>
                        {}
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
                        {femaleInfo.actualBirthDate && (
                          <div className="grid">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                                🍼 Parto Registrado
                              </span>
                              {/* <button
                                type="button"
                                onClick={() => {
                                  if (
                                    confirm(
                                      '¿Estás seguro? Se borrarán todos los datos de las crías asociadas.'
                                    )
                                  ) {
                                    handleFemaleBreedingChange(
                                      animal?.id || '',
                                      'actualBirthDate',
                                      ''
                                    )
                                  }
                                }}
                                className="text-xs text-red-600 hover:text-red-800 underline"
                              >
                                Cancelar Parto
                              </button> */}
                            </div>

                            {femaleInfo.offspring &&
                              femaleInfo.offspring.length > 0 && (
                                <div className="mt-2 flex items-center">
                                  <div className="text-xs text-gray-600 mr-2">
                                    Descendencia:
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {femaleInfo.offspring.map((offspringId) => {
                                      const offspring = animals.find(
                                        (animal) => animal.id === offspringId
                                      )
                                      return offspring ? (
                                        <span
                                          key={offspringId}
                                          className="inline-flex items-center px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded "
                                        >
                                          {offspring.animalNumber}
                                        </span>
                                      ) : (
                                        <span
                                          key={offspringId}
                                          className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                                        >
                                          ID: {offspringId}
                                        </span>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                          </div>
                        )}
                        {femaleInfo.pregnancyConfirmedDate &&
                          !femaleInfo.actualBirthDate && (
                            <div className="grid grid-cols-1 gap-1  ">
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium flex max-w-max ml-auto ">
                                ✓ Embarazo Confirmado
                              </span>
                              <div>
                                {/* Estado del embarazo */}
                                <div className="space-y-3">
                                  {/* Controles para embarazo confirmado */}
                                  <div className="flex items-center justify-end">
                                    <div className="flex items-center gap-2">
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
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* Fecha de confirmación */}

                                    <DateTimeInput
                                      label="Fecha de confirmación"
                                      value={femaleInfo.pregnancyConfirmedDate}
                                      onChange={(date) =>
                                        handleFemaleBreedingChange(
                                          animal?.id || '',
                                          'pregnancyConfirmedDate',
                                          date as Date
                                        )
                                      }
                                      type="date"
                                      required
                                    />
                                    {/* Parto esperado específico */}
                                    {femaleInfo.expectedBirthDate && (
                                      <DateTimeInput
                                        disabled
                                        label="Fecha de parto esperado"
                                        value={femaleInfo.expectedBirthDate}
                                        onChange={() => {}} // No-op para campo disabled
                                        type="date"
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        <button
                          type="button"
                          onClick={() => handleRemoveFemale(animal?.id || '')}
                          className="ml-2 text-green-700 hover:text-green-900 focus:outline-none font-bold text-lg leading-none"
                        >
                          <Icon icon="close" />
                        </button>
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
            disabled={
              isLoading || !formData.maleId || breedingAnimalIds.length === 0
            }
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isLoading
              ? initialData
                ? 'Actualizando...'
                : 'Registrando...'
              : !formData.maleId
              ? 'Selecciona un macho'
              : breedingAnimalIds.length === 0
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
