'use client'

import React, { useState } from 'react'
import { Animal, BirthRecord, OffspringInfo } from '@/types'
import { Modal } from './Modal'
import { BreedingRecord } from '@/types/breedings'

interface ModalBirthFormProps {
  isOpen: boolean
  onClose: () => void
  breedingRecord: BreedingRecord
  animals: Animal[]
  onSubmit: (birthRecord: BirthRecord) => Promise<void>
  isLoading?: boolean
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
  isLoading = false
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
    animalId: Math.random().toString(36).substring(2, 5),
    weight: '',
    color: '',
    status: 'vivo',
    healthIssues: '',
    gender: 'hembra'
  })

  const [formData, setFormData] = useState<BirthRecord>({
    femaleId: '',
    birthDate: new Date().toISOString().split('T')[0],
    birthTime: new Date().toTimeString().slice(0, 5),
    totalOffspring: 1,
    offspring: [defaultOffspring()],
    notes: ''
  })
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.femaleId || formData.offspring.length === 0) {
      return
    }

    // Validar que todas las crías tengan ID único
    const hasEmptyIds = formData.offspring.some((o) => !o.animalId.trim())
    if (hasEmptyIds) {
      alert('Todas las crías deben tener un ID único')
      return
    }

    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Error registrando parto:', error, formData)
    }
  }

  const handleFemaleChange = (femaleId: string) => {
    setFormData((prev) => ({
      ...prev,
      femaleId
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
      offspring: currentOffspring
    }))
  }

  const handleOffspringChange = (
    index: number,
    field: keyof OffspringInfo,
    value: string | number | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      offspring: prev.offspring.map((offspring, i) =>
        i === index ? { ...offspring, [field]: value } : offspring
      )
    }))
  }

  const getAnimalTypeIcon = (type: string) => {
    switch (type) {
      case 'oveja':
        return '🐑'
      case 'cabra':
        return '🐐'
      case 'vaca_leche':
      case 'vaca_engorda':
        return '🐄'
      case 'cerdo':
        return '🐷'
      default:
        return '🐾'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Parto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selección de hembra */}
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
                    formData.femaleId === female?.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="femaleId"
                    value={female?.id}
                    checked={formData.femaleId === female?.id}
                    onChange={(e) => handleFemaleChange(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-lg">
                      {getAnimalTypeIcon(female?.type || '')}
                    </span>
                    <div>
                      <div className="font-medium">{female?.animalId}</div>
                      <div className="text-sm text-gray-600">
                        {female?.type} • Parto esperado:{' '}
                        {female?.breedingInfo?.expectedBirthDate
                          ? new Date(
                              female.breedingInfo.expectedBirthDate
                            ).toLocaleDateString('es-ES')
                          : 'No definido'}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {formData.femaleId && (
          <>
            {/* Fecha y hora del parto */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="birthDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Fecha del parto *
                </label>
                <input
                  type="date"
                  id="birthDate"
                  value={formData.birthDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      birthDate: e.target.value
                    }))
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label
                  htmlFor="birthTime"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Hora del parto *
                </label>
                <input
                  type="time"
                  id="birthTime"
                  value={formData.birthTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      birthTime: e.target.value
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
                onChange={(e) =>
                  handleOffspringCountChange(parseInt(e.target.value))
                }
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
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Información de las crías
              </h4>
              <div className="space-y-4">
                {formData.offspring.map((offspring, index) => (
                  <div
                    key={offspring.id}
                    className="p-4 border border-gray-200 rounded-md bg-gray-50"
                  >
                    <h5 className="font-medium text-gray-800 mb-3">
                      Cría #{index + 1}
                    </h5>

                    <div className="grid grid-cols-2 gap-3">
                      {/* ID de la cría */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          ID único *
                        </label>
                        <input
                          type="text"
                          value={offspring.animalId}
                          onChange={(e) =>
                            handleOffspringChange(
                              index,
                              'animalId',
                              e.target.value
                            )
                          }
                          placeholder="Ej: OV-001"
                          required
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>

                      {/* Género */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Género *
                        </label>
                        <select
                          value={offspring.gender}
                          onChange={(e) =>
                            handleOffspringChange(
                              index,
                              'gender',
                              e.target.value
                            )
                          }
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
                          value={offspring.weight || ''}
                          onChange={(e) =>
                            handleOffspringChange(
                              index,
                              'weight',
                              e.target.value ? parseFloat(e.target.value) : ''
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
                          onChange={(e) =>
                            handleOffspringChange(
                              index,
                              'color',
                              e.target.value
                            )
                          }
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
                          onChange={(e) =>
                            handleOffspringChange(
                              index,
                              'status',
                              e.target.value
                            )
                          }
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
                              handleOffspringChange(
                                index,
                                'healthIssues',
                                e.target.value
                              )
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
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Notas del parto
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
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
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={
              isLoading ||
              !formData.femaleId ||
              formData.offspring.some((o) => !o.animalId.trim())
            }
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Registrando...' : 'Registrar Parto'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ModalBirthForm
