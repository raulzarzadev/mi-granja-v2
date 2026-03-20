'use client'

import React, { useState } from 'react'
import { BirthRecord, OffspringInfo } from '@/types'
import { Animal, animal_icon } from '@/types/animals'
import { BreedingRecord } from '@/types/breedings'
import { toDate } from '@/lib/dates'
import DateTimeInput from './inputs/DateTimeInput'
import { Modal } from './Modal'

interface ModalBirthFormProps {
  isOpen: boolean
  onClose: () => void
  breedingRecord: BreedingRecord
  animals: Animal[]
  onSubmit: (birthRecord: BirthRecord) => Promise<void>
  isLoading?: boolean
  /** Si se pasa, se fija esta hembra y no se muestra el selector */
  selectedFemaleId?: string
}

/**
 * Modal para registrar el parto de una hembra específica
 */
const ModalBirthForm: React.FC<ModalBirthFormProps> = ({
  isOpen,
  onClose,
  breedingRecord,
  animals,
  onSubmit,
  isLoading = false,
  selectedFemaleId,
}) => {
  // Obtener solo hembras embarazadas que aún no han parido
  const pregnantFemales =
    breedingRecord?.femaleBreedingInfo
      ?.filter((info) => !!info.pregnancyConfirmedDate && !info.actualBirthDate)
      .map((info) => {
        const animal = animals.find((a) => a.id === info.femaleId)
        return animal ? { ...animal, breedingInfo: info } : null
      })
      .filter(Boolean) || []

  const defaultOffspring = (): OffspringInfo => ({
    id: Math.random().toString(36).substring(2, 15),
    animalNumber: Math.random().toString(36).substring(2, 5),
    weight: null,
    color: '',
    status: 'vivo',
    healthIssues: '',
    gender: 'hembra',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successData, setSuccessData] = useState<{ motherNumber: string; offspringNumbers: string[] } | null>(null)

  const [formData, setFormData] = useState<BirthRecord>({
    animalId: selectedFemaleId || '',
    birthDate: new Date().toISOString().split('T')[0],
    birthTime: new Date().toTimeString().slice(0, 5),
    totalOffspring: 1,
    offspring: [defaultOffspring()],
    notes: '',
  })

  // Si cambia la hembra seleccionada externamente y no se ha seteado aún
  React.useEffect(() => {
    if (selectedFemaleId && formData.animalId !== selectedFemaleId) {
      setFormData((prev) => ({ ...prev, animalId: selectedFemaleId }))
    }
  }, [selectedFemaleId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.animalId || formData.offspring.length === 0) {
      return
    }

    // Validar que todas las crías tengan ID
    const hasEmptyIds = formData.offspring.some((o) => !o.animalNumber.trim())
    if (hasEmptyIds) {
      alert('Todas las crías deben tener un número de identificación')
      return
    }

    // Validar que no haya duplicados entre las crías del formulario
    const offspringNumbers = formData.offspring.map((o) => o.animalNumber.trim())
    const duplicatesInForm = offspringNumbers.filter((n, i) => offspringNumbers.indexOf(n) !== i)
    if (duplicatesInForm.length > 0) {
      alert(`Hay números duplicados entre las crías: ${duplicatesInForm.join(', ')}`)
      return
    }

    // Validar que los números no existan ya en la granja
    const existingNumbers = animals.map((a) => a.animalNumber)
    const conflicting = offspringNumbers.filter((n) => existingNumbers.includes(n))
    if (conflicting.length > 0) {
      alert(`Los siguientes números ya existen en la granja: ${conflicting.join(', ')}`)
      return
    }

    setIsSubmitting(true)
    try {
      const mother = animals.find((a) => a.id === formData.animalId)
      const offNums = formData.offspring.map((o) => o.animalNumber.trim())
      await onSubmit(formData)
      setSuccessData({
        motherNumber: mother?.animalNumber || formData.animalId,
        offspringNumbers: offNums,
      })
    } catch (error) {
      console.error('Error registrando parto:', error, formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSuccessData(null)
    onClose()
  }

  const handleFemaleChange = (animalId: string) => {
    setFormData((prev) => ({
      ...prev,
      animalId,
    }))
  }

  const handleOffspringCountChange = (count: number) => {
    const currentOffspring = [...formData.offspring]

    if (count > currentOffspring.length) {
      // Agregar nuevas crías
      for (let i = currentOffspring.length; i < count; i++) {
        currentOffspring.push(defaultOffspring())
      }
    } else if (count < currentOffspring.length) {
      // Remover crías extras
      currentOffspring.splice(count)
    }

    setFormData((prev) => ({
      ...prev,
      totalOffspring: count,
      offspring: currentOffspring,
    }))
  }

  const handleOffspringChange = (
    index: number,
    field: keyof OffspringInfo,
    value: string | number | undefined | null,
  ) => {
    setFormData((prev) => ({
      ...prev,
      offspring: prev.offspring.map((offspring, i) =>
        i === index ? { ...offspring, [field]: value } : offspring,
      ),
    }))
  }

  // Vista de éxito
  if (successData) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Parto Registrado">
        <div className="flex flex-col items-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-green-600">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Parto registrado exitosamente</h3>
          <div className="bg-gray-50 rounded-lg p-4 w-full space-y-2">
            <p className="text-sm text-gray-600">
              Se registraron <span className="font-semibold text-gray-900">{successData.offspringNumbers.length} cría{successData.offspringNumbers.length > 1 ? 's' : ''}</span> de la madre <span className="font-semibold text-gray-900">#{successData.motherNumber}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {successData.offspringNumbers.map((num) => (
                <span key={num} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  #{num}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-full mt-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors cursor-pointer"
          >
            Aceptar
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Registrar Parto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selección o muestra fija de hembra + padre */}
        {selectedFemaleId ? (
          <div className="space-y-2">
            <div className="p-3 border border-green-300 rounded-md bg-green-50 flex items-center gap-3">
              {(() => {
                const female = animals.find((a) => a.id === selectedFemaleId)
                const breedingInfo = breedingRecord?.femaleBreedingInfo?.find(
                  (f) => f.femaleId === selectedFemaleId,
                )
                if (!female) {
                  return (
                    <span className="text-sm text-red-600">Hembra seleccionada no encontrada.</span>
                  )
                }
                return (
                  <>
                    <span className="text-2xl">{animal_icon[female.type]}</span>
                    <div>
                      <div className="text-sm font-semibold leading-tight">
                        Madre: {female.animalNumber}
                      </div>
                      <div className="text-xs text-gray-700">
                        {female.type} • Parto esperado:{' '}
                        {breedingInfo?.expectedBirthDate
                          ? toDate(breedingInfo.expectedBirthDate).toLocaleDateString('es-ES')
                          : 'No definido'}
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
            {(() => {
              const male = animals.find((a) => a.id === breedingRecord?.maleId)
              if (!male) return null
              return (
                <div className="p-3 border border-blue-300 rounded-md bg-blue-50 flex items-center gap-3">
                  <span className="text-2xl">{animal_icon[male.type]}</span>
                  <div>
                    <div className="text-sm font-semibold leading-tight">
                      Padre: {male.animalNumber}
                    </div>
                    <div className="text-xs text-gray-700">
                      {male.type} {male.breed ? `• ${male.breed}` : ''}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hembra que ha parido *
            </label>
            {pregnantFemales.length === 0 ? (
              <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-md">
                No hay hembras con embarazos confirmados en esta monta
              </p>
            ) : (
              <div className="grid gap-2">
                {pregnantFemales.map((female) => (
                  <label
                    key={female?.id}
                    className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.animalId === female?.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="animalNumber"
                      defaultValue={selectedFemaleId}
                      value={female?.id}
                      checked={formData.animalId === female?.id}
                      onChange={(e) => handleFemaleChange(e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-lg">{animal_icon[female?.type || 'otro']}</span>
                      <div>
                        <div className="font-medium">{female?.animalNumber}</div>
                        <div className="text-sm text-gray-600">
                          {female?.type} • Parto esperado:{' '}
                          {female?.breedingInfo?.expectedBirthDate
                            ? toDate(female.breedingInfo.expectedBirthDate).toLocaleDateString(
                                'es-ES',
                              )
                            : 'No definido'}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {formData.animalId && (
          <>
            {/* Fecha y hora del parto */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                {/* Fecha del parto */}
                <div>
                  <DateTimeInput
                    value={formData.birthDate ? new Date(formData.birthDate) : null}
                    onChange={(date) =>
                      setFormData((prev) => ({
                        ...prev,
                        birthDate: date ? date.toISOString().split('T')[0] : '',
                      }))
                    }
                    label="Fecha del parto"
                    type="date"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="birthTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Hora del parto *
                </label>
                <input
                  type="time"
                  id="birthTime"
                  value={formData.birthTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      birthTime: e.target.value,
                    }))
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Cantidad de crías */}
            <div>
              <label
                htmlFor="totalOffspring"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Cantidad de crías *
              </label>
              <select
                id="totalOffspring"
                value={formData.totalOffspring}
                onChange={(e) => handleOffspringCountChange(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <option key={num} value={num}>
                    {num} cría{num > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Información de cada cría */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Información de las crías</h4>
              <div className="space-y-4">
                {formData.offspring.map((offspring, index) => (
                  <div
                    key={offspring.id}
                    className="p-4 border border-gray-200 rounded-md bg-gray-50"
                  >
                    <h5 className="font-medium text-gray-800 mb-3">Cría #{index + 1}</h5>

                    <div className="grid grid-cols-2 gap-3">
                      {/* ID de la cría */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          ID único *
                        </label>
                        {(() => {
                          const trimmed = offspring.animalNumber.trim()
                          const isDuplicateInFarm =
                            trimmed && animals.some((a) => a.animalNumber === trimmed)
                          const isDuplicateInForm =
                            trimmed &&
                            formData.offspring.filter((o) => o.animalNumber.trim() === trimmed)
                              .length > 1
                          const hasError = isDuplicateInFarm || isDuplicateInForm
                          return (
                            <>
                              <input
                                type="text"
                                value={offspring.animalNumber}
                                onChange={(e) =>
                                  handleOffspringChange(index, 'animalNumber', e.target.value)
                                }
                                placeholder="Ej: OV-001"
                                required
                                className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 ${
                                  hasError
                                    ? 'border-red-400 focus:ring-red-500'
                                    : 'border-gray-300 focus:ring-green-500'
                                }`}
                              />
                              {isDuplicateInFarm && (
                                <p className="text-xs text-red-600 mt-0.5">
                                  Este número ya existe en la granja
                                </p>
                              )}
                              {isDuplicateInForm && !isDuplicateInFarm && (
                                <p className="text-xs text-red-600 mt-0.5">
                                  Número duplicado entre crías
                                </p>
                              )}
                            </>
                          )
                        })()}
                      </div>

                      {/* Género */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Género *
                        </label>
                        <select
                          value={offspring.gender}
                          onChange={(e) => handleOffspringChange(index, 'gender', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                        >
                          <option value="hembra">Hembra</option>
                          <option value="macho">Macho</option>
                        </select>
                      </div>

                      {/* Peso */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Peso (kg)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={offspring.weight ?? ''}
                          onChange={(e) =>
                            handleOffspringChange(
                              index,
                              'weight',
                              e.target.value === '' ? null : parseFloat(e.target.value),
                            )
                          }
                          placeholder="Ej: 2.5"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>

                      {/* Color */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Color
                        </label>
                        <input
                          type="text"
                          value={offspring.color || ''}
                          onChange={(e) => handleOffspringChange(index, 'color', e.target.value)}
                          placeholder="Ej: Blanco, Negro, Marrón"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>

                      {/* Estado */}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Estado *
                        </label>
                        <select
                          value={offspring.status}
                          onChange={(e) => handleOffspringChange(index, 'status', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                        >
                          <option value="vivo">Vivo y saludable</option>
                          <option value="enfermo">Vivo pero enfermo</option>
                          <option value="muerto">Muerto</option>
                        </select>
                      </div>

                      {/* Problemas de salud (si está enfermo) */}
                      {offspring.status === 'enfermo' && (
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Problemas de salud
                          </label>
                          <textarea
                            value={offspring.healthIssues || ''}
                            onChange={(e) =>
                              handleOffspringChange(index, 'healthIssues', e.target.value)
                            }
                            placeholder="Describe los problemas de salud..."
                            rows={2}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notas generales */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notas del parto
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="Observaciones sobre el parto, complicaciones, etc..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              !formData.animalId ||
              formData.offspring.some((o) => !o.animalNumber.trim())
            }
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Registrando...
              </>
            ) : (
              'Registrar Parto'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ModalBirthForm
