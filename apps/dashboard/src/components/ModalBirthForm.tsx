'use client'

import React, { useState } from 'react'
import Button from '@/components/buttons/Button'
import { Icon } from '@/components/Icon/icon'
import { toDate } from '@/lib/dates'
import { BirthRecord, OffspringInfo } from '@/types'
import { Animal, animal_icon } from '@/types/animals'
import { BreedingRecord } from '@/types/breedings'
import { DatePickerButtons } from './buttons/date-picker-buttons'
import { Modal } from './Modal'

interface ModalBirthFormProps {
  isOpen: boolean
  onClose: () => void
  breedingRecord: BreedingRecord
  animals: Animal[]
  onSubmit: (birthRecord: BirthRecord) => Promise<void>
  isLoading?: boolean
  selectedFemaleId?: string
}

const statusLabels: Record<string, string> = {
  vivo: 'Vivo',
  enfermo: 'Enfermo',
  muerto: 'Muerto',
}

const genderLabels: Record<string, string> = {
  hembra: 'Hembra',
  macho: 'Macho',
}

/**
 * Sub-modal para agregar/editar una cría
 */
const OffspringFormModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onSave: (data: OffspringInfo) => void
  initial?: OffspringInfo | null
  animals: Animal[]
  existingNumbers: string[]
}> = ({ isOpen, onClose, onSave, initial, animals, existingNumbers }) => {
  const [data, setData] = useState<OffspringInfo>(
    initial || {
      id: Math.random().toString(36).substring(2, 15),
      animalNumber: '',
      weight: null,
      color: '',
      status: 'vivo',
      healthIssues: '',
      gender: 'hembra',
    },
  )

  // Reset when modal opens with new initial
  React.useEffect(() => {
    if (isOpen) {
      setData(
        initial || {
          id: Math.random().toString(36).substring(2, 15),
          animalNumber: '',
          weight: null,
          color: '',
          status: 'vivo',
          healthIssues: '',
          gender: 'hembra',
        },
      )
    }
  }, [isOpen, initial])

  const trimmed = data.animalNumber.trim()
  const isDuplicateInFarm = trimmed !== '' && animals.some((a) => a.animalNumber === trimmed)
  const isDuplicateInList =
    trimmed !== '' && existingNumbers.filter((n) => n === trimmed).length > (initial ? 1 : 0)
  const hasError = isDuplicateInFarm || isDuplicateInList
  const canSave = trimmed !== '' && !hasError

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initial ? 'Editar cría' : 'Agregar cría'}
      size="sm"
    >
      <div className="space-y-4">
        {/* ID único */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ID único *</label>
          <input
            type="text"
            value={data.animalNumber}
            onChange={(e) => setData((p) => ({ ...p, animalNumber: e.target.value }))}
            placeholder="Ej: OV-001"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
              hasError
                ? 'border-red-400 focus:ring-red-500'
                : 'border-gray-300 focus:ring-green-500'
            }`}
          />
          {isDuplicateInFarm && (
            <p className="text-xs text-red-600 mt-0.5">Ya existe en la granja</p>
          )}
          {isDuplicateInList && !isDuplicateInFarm && (
            <p className="text-xs text-red-600 mt-0.5">Número duplicado</p>
          )}
        </div>

        {/* Género — radio buttons */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Género *</label>
          <div className="flex gap-3">
            {(['hembra', 'macho'] as const).map((g) => (
              <label
                key={g}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
                  data.gender === g
                    ? g === 'hembra'
                      ? 'border-pink-400 bg-pink-50 text-pink-700'
                      : 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="offspring-gender"
                  value={g}
                  checked={data.gender === g}
                  onChange={() => setData((p) => ({ ...p, gender: g }))}
                  className="sr-only"
                />
                <Icon icon={g === 'hembra' ? 'female' : 'male'} className="w-4 h-4 inline" />{' '}
                {g === 'hembra' ? 'Hembra' : 'Macho'}
              </label>
            ))}
          </div>
        </div>

        {/* Peso + Color */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Peso</label>
            <div className="flex items-stretch border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500">
              <input
                type="text"
                inputMode="decimal"
                value={data.weight ?? ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '')
                  setData((p) => ({ ...p, weight: val === '' ? null : val }))
                }}
                onBlur={() => {
                  if (data.weight != null && data.weight !== '') {
                    const num = Number.parseFloat(String(data.weight))
                    if (!Number.isNaN(num)) setData((p) => ({ ...p, weight: num }))
                  }
                }}
                placeholder="0.0"
                className="w-full px-3 py-2 text-sm text-right outline-none"
              />
              <span className="flex items-center px-2 bg-gray-50 border-l border-gray-300 text-gray-400 text-xs select-none">
                kg
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
            <input
              type="text"
              value={data.color || ''}
              onChange={(e) => setData((p) => ({ ...p, color: e.target.value }))}
              placeholder="Ej: Blanco, Negro"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Estado — radio buttons */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Estado *</label>
          <div className="flex gap-2">
            {(
              [
                {
                  value: 'vivo',
                  label: 'Vivo',
                  activeClass: 'border-green-400 bg-green-50 text-green-700',
                },
                {
                  value: 'enfermo',
                  label: 'Enfermo',
                  activeClass: 'border-yellow-400 bg-yellow-50 text-yellow-700',
                },
                {
                  value: 'muerto',
                  label: 'Muerto',
                  activeClass: 'border-red-400 bg-red-50 text-red-700',
                },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
                  data.status === opt.value
                    ? opt.activeClass
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="offspring-status"
                  value={opt.value}
                  checked={data.status === opt.value}
                  onChange={() => setData((p) => ({ ...p, status: opt.value }))}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {data.status === 'enfermo' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Problemas de salud
            </label>
            <textarea
              value={data.healthIssues || ''}
              onChange={(e) => setData((p) => ({ ...p, healthIssues: e.target.value }))}
              placeholder="Describe los problemas..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" color="neutral" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            color="success"
            disabled={!canSave}
            onClick={() => {
              onSave(data)
              onClose()
            }}
            className="flex-1"
          >
            {initial ? 'Guardar' : 'Agregar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
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
  const pregnantFemales =
    breedingRecord?.femaleBreedingInfo
      ?.filter((info) => !!info.pregnancyConfirmedDate && !info.actualBirthDate)
      .map((info) => {
        const animal = animals.find((a) => a.id === info.femaleId)
        return animal ? { ...animal, breedingInfo: info } : null
      })
      .filter(Boolean) || []

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successData, setSuccessData] = useState<{
    motherNumber: string
    offspringNumbers: string[]
  } | null>(null)

  const [formData, setFormData] = useState<BirthRecord>({
    animalId: selectedFemaleId || '',
    birthDate: new Date().toISOString().split('T')[0],
    birthTime: new Date().toTimeString().slice(0, 5),
    totalOffspring: 0,
    offspring: [],
    notes: '',
  })

  // Sub-modal state
  const [offspringModalOpen, setOffspringModalOpen] = useState(false)
  const [editingOffspring, setEditingOffspring] = useState<OffspringInfo | null>(null)

  React.useEffect(() => {
    if (selectedFemaleId && formData.animalId !== selectedFemaleId) {
      setFormData((prev) => ({ ...prev, animalId: selectedFemaleId }))
    }
  }, [selectedFemaleId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.animalId || formData.offspring.length === 0) return

    const hasEmptyIds = formData.offspring.some((o) => !o.animalNumber.trim())
    if (hasEmptyIds) {
      alert('Todas las crías deben tener un número de identificación')
      return
    }

    const offspringNumbers = formData.offspring.map((o) => o.animalNumber.trim())
    const duplicatesInForm = offspringNumbers.filter((n, i) => offspringNumbers.indexOf(n) !== i)
    if (duplicatesInForm.length > 0) {
      alert(`Hay números duplicados entre las crías: ${duplicatesInForm.join(', ')}`)
      return
    }

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
      await onSubmit({ ...formData, totalOffspring: formData.offspring.length })
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

  const addOffspring = (data: OffspringInfo) => {
    setFormData((prev) => ({
      ...prev,
      offspring: [...prev.offspring, data],
      totalOffspring: prev.offspring.length + 1,
    }))
  }

  const updateOffspring = (data: OffspringInfo) => {
    setFormData((prev) => ({
      ...prev,
      offspring: prev.offspring.map((o) => (o.id === data.id ? data : o)),
    }))
  }

  const removeOffspring = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      offspring: prev.offspring.filter((o) => o.id !== id),
      totalOffspring: prev.offspring.length - 1,
    }))
  }

  // Vista de éxito
  if (successData) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Parto Registrado">
        <div className="flex flex-col items-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-9 h-9 text-green-600"
            >
              <path
                fillRule="evenodd"
                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Parto registrado exitosamente</h3>
          <div className="bg-gray-50 rounded-lg p-4 w-full space-y-2">
            <p className="text-sm text-gray-600">
              Se registraron{' '}
              <span className="font-semibold text-gray-900">
                {successData.offspringNumbers.length} cría
                {successData.offspringNumbers.length > 1 ? 's' : ''}
              </span>{' '}
              de la madre{' '}
              <span className="font-semibold text-gray-900">#{successData.motherNumber}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {successData.offspringNumbers.map((num) => (
                <span
                  key={num}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  #{num}
                </span>
              ))}
            </div>
          </div>
          <Button color="success" onClick={handleClose} className="w-full">
            Aceptar
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Registrar Parto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selección o muestra fija de hembra + padre */}
        {selectedFemaleId ? (
          <div className="flex gap-2 w-full flex-1">
            <div className="flex-1 p-3 border border-green-300 rounded-md bg-green-50 flex items-center gap-3">
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
                        <p>Madre: </p>
                        <p>#{female.animalNumber}</p>
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
                <div className="p-3 border border-blue-300 rounded-md bg-blue-50 flex items-center gap-3 flex-1">
                  <span className="text-2xl">{animal_icon[male.type]}</span>
                  <div>
                    <div className="text-sm font-semibold leading-tight">
                      <p>Padre: </p>
                      <p>#{male.animalNumber}</p>
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
                No hay hembras con embarazos confirmados en este empadre
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
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, animalId: e.target.value }))
                      }
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
              <DatePickerButtons
                value={formData.birthDate}
                onChange={(val) => setFormData((prev) => ({ ...prev, birthDate: val }))}
                label="Fecha del parto"
                showToday
              />
              <div>
                <label htmlFor="birthTime" className="block text-xs font-medium text-gray-500 mb-1">
                  Hora del parto *
                </label>
                <input
                  type="time"
                  id="birthTime"
                  value={formData.birthTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, birthTime: e.target.value }))}
                  required
                  className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Lista de crías + botón agregar */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">
                  Crías ({formData.offspring.length})
                </h4>
                <Button
                  size="sm"
                  color="success"
                  variant="outline"
                  onClick={() => {
                    setEditingOffspring(null)
                    setOffspringModalOpen(true)
                  }}
                  type="button"
                >
                  + Agregar cría
                </Button>
              </div>

              {formData.offspring.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-400">No hay crías agregadas</p>
                  <p className="text-xs text-gray-300 mt-1">
                    Usa el botón "Agregar cría" para registrar cada cría
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.offspring.map((o, idx) => (
                    <div
                      key={o.id}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <span className="text-xs font-bold text-gray-400 w-5">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">
                            #{o.animalNumber}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                            {genderLabels[o.gender] || o.gender}
                          </span>
                          {o.weight && <span className="text-xs text-gray-500">{o.weight} kg</span>}
                          {o.color && <span className="text-xs text-gray-500">{o.color}</span>}
                          {o.status !== 'vivo' && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                o.status === 'muerto'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {statusLabels[o.status || ''] || o.status}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOffspring(o)
                          setOffspringModalOpen(true)
                        }}
                        className="text-xs text-gray-400 hover:text-blue-600 transition-colors cursor-pointer p-1"
                        title="Editar"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeOffspring(o.id)}
                        className="text-xs text-gray-400 hover:text-red-600 transition-colors cursor-pointer p-1"
                        title="Eliminar"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
        <div className="flex gap-2">
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
            disabled={isSubmitting || !formData.animalId || formData.offspring.length === 0}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Registrando...
              </>
            ) : (
              `Registrar Parto (${formData.offspring.length} cría${formData.offspring.length !== 1 ? 's' : ''})`
            )}
          </button>
        </div>
      </form>

      {/* Sub-modal para agregar/editar cría */}
      <OffspringFormModal
        isOpen={offspringModalOpen}
        onClose={() => {
          setOffspringModalOpen(false)
          setEditingOffspring(null)
        }}
        onSave={(data) => {
          if (editingOffspring) {
            updateOffspring(data)
          } else {
            addOffspring(data)
          }
        }}
        initial={editingOffspring}
        animals={animals}
        existingNumbers={formData.offspring.map((o) => o.animalNumber.trim())}
      />
    </Modal>
  )
}

export default ModalBirthForm
