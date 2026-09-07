'use client'

import React, { useState } from 'react'
import { useAppFeedback } from '@/components/AppFeedbackProvider'
import { Modal } from '@/components/Modal'
import { useModal } from '@/hooks/useModal'
import { calculateExpectedBirthDate } from '@/lib/animalBreedingConfig'
import { formatDate } from '@/lib/dates'
import { Animal } from '@/types/animals'
import { BreedingRecord } from '@/types/breedings'
import type { AbortPregnancyInput, BreedingActionHandlers } from '@/types/components/breeding'
import { BadgeAnimalStatus } from './Badges/BadgeAnimalStatus'
import type { FemaleBreedingStatus } from './Dashboard/Animals/helpers/breedingViewHelpers'
import { Icon, IconName } from './Icon/icon'

interface ModalBreedingAnimalDetailsProps extends BreedingActionHandlers {
  animal: Animal
  record: BreedingRecord
  animalType: 'male' | 'female'
  status?: FemaleBreedingStatus
  triggerComponent?: React.ReactNode
  animals: Animal[]
}

const ActionButton = ({
  onClick,
  variant,
  icon,
  label,
  loadingLabel,
  confirm: confirmMsg,
}: {
  onClick: () => void | Promise<void>
  variant: 'primary' | 'success' | 'warning' | 'danger'
  icon: IconName
  label: string
  loadingLabel?: string
  confirm?: string
}) => {
  const { confirmAction } = useAppFeedback()
  const [loading, setLoading] = useState(false)

  const colors = {
    primary: 'text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400',
    success: 'text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400',
    warning: 'text-white bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300',
    danger: 'text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400',
  }

  const handleClick = async () => {
    if (
      confirmMsg &&
      !(await confirmAction({
        title: 'Confirmar acción',
        message: confirmMsg,
        confirmLabel: 'Continuar',
        danger: variant === 'danger',
      }))
    )
      return
    setLoading(true)
    try {
      await onClick()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`w-full px-4 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer ${colors[variant]}`}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {loadingLabel || 'Procesando...'}
        </>
      ) : (
        <>
          <Icon icon={icon} className="w-4 h-4" />
          {label}
        </>
      )}
    </button>
  )
}

const getDateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseDateInput = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Modal especializado para mostrar detalles de un animal en el contexto de un empadre/breeding
 */
const ModalBreedingAnimalDetails: React.FC<ModalBreedingAnimalDetailsProps> = ({
  animal,
  record,
  animalType,
  status,
  triggerComponent,
  animals,
  onConfirmPregnancy,
  onUnconfirmPregnancy,
  onAbort,
  onRemoveFromBreeding,
  onDeleteBirth,
  onAddBirth,
}) => {
  const { isOpen, openModal, closeModal } = useModal()
  const [isAbortFormOpen, setIsAbortFormOpen] = useState(false)
  const [abortDate, setAbortDate] = useState(() => getDateInputValue(new Date()))
  const [abortNote, setAbortNote] = useState('')
  const [abortError, setAbortError] = useState<string | null>(null)
  const [isSubmittingAbort, setIsSubmittingAbort] = useState(false)

  const femaleInfo =
    animalType === 'female'
      ? record.femaleBreedingInfo.find((info) => info.femaleId === animal.id)
      : null
  const pregnancyDate = animal.pregnantAt ?? femaleInfo?.pregnancyConfirmedDate ?? null

  const expectedBirthDate = () => {
    if (animalType === 'male') return null

    const maleAnimal = animals.find((a) => a.id === record.maleId)
    const animalsType = maleAnimal?.type

    if (!animalsType) return null
    if (femaleInfo?.actualBirthDate) return null

    if (pregnancyDate) {
      return calculateExpectedBirthDate(pregnancyDate, animalsType)
    }

    if (record.breedingDate) {
      return calculateExpectedBirthDate(record.breedingDate, animalsType)
    }

    return null
  }

  const handleActionAndClose = async (action: () => void | Promise<void>) => {
    await action()
    closeModal()
  }

  const openAbortForm = () => {
    setAbortDate(getDateInputValue(new Date()))
    setAbortNote('')
    setAbortError(null)
    setIsAbortFormOpen(true)
  }

  const closeAbortForm = () => {
    if (!isSubmittingAbort) setIsAbortFormOpen(false)
  }

  const handleAbortSubmit = async () => {
    if (!abortDate || !onAbort) return

    const input: AbortPregnancyInput = {
      date: parseDateInput(abortDate),
      note: abortNote.trim() || undefined,
    }

    setIsSubmittingAbort(true)
    try {
      await onAbort(record, animal.id, input)
      setIsAbortFormOpen(false)
      closeModal()
    } catch (error) {
      console.error('No se pudo registrar el aborto', error)
      setAbortError('No se pudo registrar el aborto. Intenta nuevamente.')
    } finally {
      setIsSubmittingAbort(false)
    }
  }

  return (
    <>
      {triggerComponent ? (
        <div onClick={openModal} className="cursor-pointer">
          {triggerComponent}
        </div>
      ) : (
        <button
          onClick={openModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Ver detalles
        </button>
      )}

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={`${animalType === 'male' ? 'Macho' : 'Hembra'}: ${animal.animalNumber}`}
        size="md"
      >
        <div className="space-y-4">
          {/* Información básica del animal */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Información del Animal</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Especie:</span>
                <span className="font-medium">{animal.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Número:</span>
                <span className="font-medium">{animal.animalNumber}</span>
              </div>
            </div>
          </div>

          {/* Información específica del empadre */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Estado en el Empadre</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha de empadre:</span>
                <span className="font-medium">
                  {record.breedingDate ? formatDate(record.breedingDate) : 'No disponible'}
                </span>
              </div>

              {animalType === 'female' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado:</span>
                    <BadgeAnimalStatus status={status} />
                  </div>

                  {(status === 'embarazada' || status === 'embarazada_otra_monta') &&
                    pregnancyDate && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {status === 'embarazada_otra_monta'
                              ? 'Gestación activa:'
                              : 'Gestación confirmada:'}
                          </span>
                          <span className="font-medium">{formatDate(pregnancyDate)}</span>
                        </div>
                        {expectedBirthDate() && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Parto esperado:</span>
                            <span className="font-medium">{formatDate(expectedBirthDate()!)}</span>
                          </div>
                        )}
                      </>
                    )}

                  {status === 'parida' && femaleInfo?.actualBirthDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha de parto:</span>
                      <span className="font-medium">{formatDate(femaleInfo.actualBirthDate)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Crías registradas (solo para hembras que han parido) */}
          {animalType === 'female' &&
            status === 'parida' &&
            femaleInfo?.offspring &&
            femaleInfo.offspring.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">
                  Crías Registradas ({femaleInfo.offspring.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {femaleInfo.offspring.map((offspringId) => {
                    const offspring = animals.find((a) => a.id === offspringId)
                    return (
                      <span
                        key={offspringId}
                        className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                      >
                        {offspring?.animalNumber || `ID: ${offspringId}`}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

          {/* Acciones disponibles */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Acciones
            </h3>
            <div className="space-y-2">
              {/* Acciones para macho */}
              {animalType === 'male' && (
                <ActionButton
                  onClick={() =>
                    handleActionAndClose(() => onRemoveFromBreeding?.(record, animal.id))
                  }
                  variant="danger"
                  icon="delete"
                  label="Sacar del empadre"
                  loadingLabel="Sacando..."
                  confirm="¿Estás seguro de sacar al macho de este empadre? Se eliminará el registro completo."
                />
              )}

              {/* Acciones para hembras en empadre */}
              {animalType === 'female' &&
                (status === 'empadre' || status === 'embarazada_otra_monta') && (
                  <>
                    {status === 'empadre' && (
                      <ActionButton
                        onClick={() =>
                          handleActionAndClose(() => onConfirmPregnancy?.(record, animal.id))
                        }
                        variant="primary"
                        icon="pregnant"
                        label="Confirmar gestación"
                        loadingLabel="Abriendo..."
                      />
                    )}
                    <ActionButton
                      onClick={() =>
                        handleActionAndClose(() => onRemoveFromBreeding?.(record, animal.id))
                      }
                      variant="danger"
                      icon="delete"
                      label="Sacar del empadre"
                      loadingLabel="Sacando..."
                      confirm="¿Estás seguro de sacar a esta hembra del empadre?"
                    />
                  </>
                )}

              {/* Acciones para hembras gestantes */}
              {animalType === 'female' && status === 'embarazada' && (
                <>
                  <ActionButton
                    onClick={() => handleActionAndClose(() => onAddBirth?.(record, animal.id))}
                    variant="success"
                    icon="baby"
                    label="Registrar parto"
                    loadingLabel="Abriendo..."
                  />
                  <ActionButton
                    onClick={() =>
                      handleActionAndClose(() => onUnconfirmPregnancy?.(record, animal.id))
                    }
                    variant="warning"
                    icon="bed"
                    label="Desconfirmar gestación"
                    loadingLabel="Desconfirmando..."
                  />
                  <ActionButton
                    onClick={openAbortForm}
                    variant="warning"
                    icon="close"
                    label="Registrar aborto"
                    loadingLabel="Registrando..."
                  />
                  <ActionButton
                    onClick={() =>
                      handleActionAndClose(() => onRemoveFromBreeding?.(record, animal.id))
                    }
                    variant="danger"
                    icon="delete"
                    label="Sacar del empadre"
                    loadingLabel="Sacando..."
                    confirm="¿Estás seguro de sacar a esta hembra del empadre?"
                  />
                </>
              )}

              {/* Acciones para hembras que han parido */}
              {animalType === 'female' && status === 'parida' && (
                <ActionButton
                  onClick={() => handleActionAndClose(() => onDeleteBirth?.(record, animal.id))}
                  variant="danger"
                  icon="delete"
                  label="Revertir parto"
                  loadingLabel="Revirtiendo..."
                  confirm="¿Estás seguro? La madre volverá a estado gestante y las crías asociadas serán eliminadas. Esta acción no se puede deshacer."
                />
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAbortFormOpen}
        onClose={closeAbortForm}
        title="Registrar aborto"
        size="sm"
        closeOnOverlayClick={!isSubmittingAbort}
        closeOnEscape={!isSubmittingAbort}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleAbortSubmit()
          }}
          className="space-y-4"
        >
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
            Se liberará la gestación de <strong>{animal.animalNumber}</strong> y se conservará el
            historial reproductivo.
          </div>

          {abortError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {abortError}
            </div>
          )}

          <div>
            <label htmlFor="abort-date" className="mb-1 block text-sm font-medium text-gray-800">
              Fecha del aborto
            </label>
            <input
              id="abort-date"
              type="date"
              value={abortDate}
              onChange={(event) => setAbortDate(event.target.value)}
              required
              disabled={isSubmittingAbort}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label htmlFor="abort-note" className="mb-1 block text-sm font-medium text-gray-800">
              Nota <span className="font-normal text-gray-500">(opcional)</span>
            </label>
            <textarea
              id="abort-note"
              value={abortNote}
              onChange={(event) => setAbortNote(event.target.value)}
              disabled={isSubmittingAbort}
              rows={3}
              placeholder="Describe brevemente lo ocurrido..."
              className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeAbortForm}
              disabled={isSubmittingAbort}
              className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!abortDate || isSubmittingAbort}
              className="min-h-11 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-orange-300"
            >
              {isSubmittingAbort ? 'Registrando...' : 'Confirmar aborto'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export default ModalBreedingAnimalDetails
