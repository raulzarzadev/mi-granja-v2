'use client'

import React, { useState } from 'react'
import { Modal } from '@/components/Modal'
import { useModal } from '@/hooks/useModal'
import { calculateExpectedBirthDate } from '@/lib/animalBreedingConfig'
import { formatDate } from '@/lib/dates'
import { Animal, AnimalBreedingStatus } from '@/types/animals'
import { BreedingRecord } from '@/types/breedings'
import { BreedingActionHandlers } from '@/types/components/breeding'
import { BadgeAnimalStatus } from './Badges/BadgeAnimalStatus'
import { Icon, IconName } from './Icon/icon'

interface ModalBreedingAnimalDetailsProps extends BreedingActionHandlers {
  animal: Animal
  record: BreedingRecord
  animalType: 'male' | 'female'
  status?: AnimalBreedingStatus
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
  const [loading, setLoading] = useState(false)

  const colors = {
    primary: 'text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400',
    success: 'text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400',
    warning: 'text-white bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300',
    danger: 'text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400',
  }

  const handleClick = async () => {
    if (confirmMsg && !window.confirm(confirmMsg)) return
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

/**
 * Modal especializado para mostrar detalles de un animal en el contexto de una monta/breeding
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
  onRemoveFromBreeding,
  onDeleteBirth,
  onAddBirth,
}) => {
  const { isOpen, openModal, closeModal } = useModal()

  const femaleInfo =
    animalType === 'female'
      ? record.femaleBreedingInfo.find((info) => info.femaleId === animal.id)
      : null

  const expectedBirthDate = () => {
    if (animalType === 'male') return null

    const maleAnimal = animals.find((a) => a.id === record.maleId)
    const animalsType = maleAnimal?.type

    if (!animalsType) return null
    if (femaleInfo?.actualBirthDate) return null

    if (femaleInfo?.pregnancyConfirmedDate) {
      return calculateExpectedBirthDate(femaleInfo.pregnancyConfirmedDate, animalsType)
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

          {/* Información específica de la monta */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Estado en la Monta</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha de monta:</span>
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

                  {status === 'embarazada' && femaleInfo?.pregnancyConfirmedDate && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Embarazo confirmado:</span>
                        <span className="font-medium">
                          {formatDate(femaleInfo.pregnancyConfirmedDate)}
                        </span>
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
                  label="Sacar de la monta"
                  loadingLabel="Sacando..."
                  confirm="¿Estás seguro de sacar al macho de esta monta? Se eliminará el registro completo."
                />
              )}

              {/* Acciones para hembras en monta */}
              {animalType === 'female' && status === 'monta' && (
                <>
                  <ActionButton
                    onClick={() =>
                      handleActionAndClose(() => onConfirmPregnancy?.(record, animal.id))
                    }
                    variant="primary"
                    icon="pregnant"
                    label="Confirmar embarazo"
                    loadingLabel="Abriendo..."
                  />
                  <ActionButton
                    onClick={() =>
                      handleActionAndClose(() => onRemoveFromBreeding?.(record, animal.id))
                    }
                    variant="danger"
                    icon="delete"
                    label="Sacar de la monta"
                    loadingLabel="Sacando..."
                    confirm="¿Estás seguro de sacar a esta hembra de la monta?"
                  />
                </>
              )}

              {/* Acciones para hembras embarazadas */}
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
                    label="Desconfirmar embarazo"
                    loadingLabel="Desconfirmando..."
                  />
                  <ActionButton
                    onClick={() =>
                      handleActionAndClose(() => onRemoveFromBreeding?.(record, animal.id))
                    }
                    variant="danger"
                    icon="delete"
                    label="Sacar de la monta"
                    loadingLabel="Sacando..."
                    confirm="¿Estás seguro de sacar a esta hembra de la monta?"
                  />
                </>
              )}

              {/* Acciones para hembras que han parido */}
              {animalType === 'female' && status === 'parida' && (
                <ActionButton
                  onClick={() => handleActionAndClose(() => onDeleteBirth?.(record, animal.id))}
                  variant="danger"
                  icon="delete"
                  label="Eliminar parto"
                  loadingLabel="Eliminando..."
                  confirm="¿Estás seguro? Se borrarán todos los datos de las crías asociadas."
                />
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default ModalBreedingAnimalDetails
