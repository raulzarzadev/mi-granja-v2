'use client'

import React, { useState } from 'react'
import { BreedingRecord, Animal } from '@/types'
import { Modal } from './Modal'
import { calculateExpectedBirthDate } from '@/lib/animalBreedingConfig'

interface ModalConfirmPregnancyProps {
  isOpen: boolean
  onClose: () => void
  breedingRecord: BreedingRecord
  animals: Animal[]
  onSubmit: (updatedRecord: BreedingRecord) => Promise<void>
  isLoading?: boolean
}

/**
 * Modal para confirmar embarazos de hembras en una monta
 */
const ModalConfirmPregnancy: React.FC<ModalConfirmPregnancyProps> = ({
  isOpen,
  onClose,
  breedingRecord,
  animals,
  onSubmit,
  isLoading = false
}) => {
  // Obtener hembras que aún no tienen embarazo confirmado
  const unconfirmedFemales =
    breedingRecord?.femaleBreedingInfo
      ?.filter((info) => !info.pregnancyConfirmed)
      .map((info) => {
        const animal = animals.find((a) => a.id === info.femaleId)
        return animal ? { ...animal, breedingInfo: info } : null
      })
      .filter(Boolean) || []

  const [selectedFemales, setSelectedFemales] = useState<string[]>([])
  const [confirmationDate, setConfirmationDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const handleFemaleToggle = (femaleId: string) => {
    setSelectedFemales((prev) =>
      prev.includes(femaleId)
        ? prev.filter((id) => id !== femaleId)
        : [...prev, femaleId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedFemales.length === 0) {
      alert('Debes seleccionar al menos una hembra')
      return
    }

    const confirmDate = new Date(confirmationDate)

    // Actualizar femaleBreedingInfo con las confirmaciones
    const updatedFemaleBreedingInfo = breedingRecord.femaleBreedingInfo.map(
      (info) => {
        if (selectedFemales.includes(info.femaleId)) {
          const animal = animals.find((a) => a.id === info.femaleId)
          const expectedBirthDate = animal
            ? calculateExpectedBirthDate(confirmDate, animal.type)
            : undefined

          return {
            ...info,
            pregnancyConfirmed: true,
            pregnancyConfirmedDate: confirmDate,
            expectedBirthDate
          }
        }
        return info
      }
    )

    const updatedRecord: BreedingRecord = {
      ...breedingRecord,
      femaleBreedingInfo: updatedFemaleBreedingInfo,
      pregnancyConfirmed: updatedFemaleBreedingInfo.some(
        (info) => info.pregnancyConfirmed
      )
    }

    try {
      await onSubmit(updatedRecord)
      setSelectedFemales([])
      onClose()
    } catch (error) {
      console.error('Error confirmando embarazos:', error)
    }
  }

  const handleCancel = () => {
    setSelectedFemales([])
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Confirmar Embarazos">
      <form onSubmit={handleSubmit} className="space-y-4">
        {unconfirmedFemales.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">
              ✓ Todas las hembras ya tienen embarazo confirmado
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            {/* Fecha de confirmación */}
            <div>
              <label
                htmlFor="confirmationDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Fecha de confirmación *
              </label>
              <input
                type="date"
                id="confirmationDate"
                value={confirmationDate}
                onChange={(e) => setConfirmationDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-600 mt-1">
                Esta fecha se usará para calcular el parto esperado
              </p>
            </div>

            {/* Lista de hembras para confirmar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Seleccionar hembras con embarazo confirmado *
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {unconfirmedFemales.map((animal) => {
                  const isSelected = selectedFemales.includes(animal?.id || '')
                  const expectedBirth = animal
                    ? calculateExpectedBirthDate(
                        new Date(confirmationDate),
                        animal.type
                      )
                    : null

                  return (
                    <div
                      key={animal?.id}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => handleFemaleToggle(animal?.id || '')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              handleFemaleToggle(animal?.id || '')
                            }
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <div>
                            <div className="font-medium text-gray-900">
                              {animal?.animalId}
                            </div>
                            <div className="text-sm text-gray-600">
                              {animal?.type} - {animal?.stage}
                            </div>
                          </div>
                        </div>
                        {isSelected && expectedBirth && (
                          <div className="text-right">
                            <div className="text-sm font-medium text-purple-700">
                              Parto esperado:
                            </div>
                            <div className="text-sm text-purple-600">
                              {expectedBirth.toLocaleDateString('es-ES')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Información adicional */}
            {selectedFemales.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                <div className="text-sm text-purple-800">
                  <div className="font-medium">
                    {selectedFemales.length} hembra
                    {selectedFemales.length !== 1 ? 's' : ''} seleccionada
                    {selectedFemales.length !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs mt-1">
                    Se calculará automáticamente la fecha de parto esperada para
                    cada hembra
                  </div>
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || selectedFemales.length === 0}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {isLoading
                  ? 'Confirmando...'
                  : selectedFemales.length === 0
                  ? 'Selecciona hembras'
                  : `Confirmar ${selectedFemales.length} embarazo${
                      selectedFemales.length !== 1 ? 's' : ''
                    }`}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}

export default ModalConfirmPregnancy
