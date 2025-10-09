'use client'

import React from 'react'
import { Animal, AnimalBreedingStatus } from '@/types/animals'
import { BreedingRecord } from '@/types/breedings'
import { BreedingActionHandlers } from '@/types/components/breeding'
import { Modal } from '@/components/Modal'
import { useModal } from '@/hooks/useModal'
import { Icon } from './Icon/icon'
import { formatDate } from '@/lib/dates'
import { calculateExpectedBirthDate } from '@/lib/animalBreedingConfig'
import { BadgeAnimalStatus } from './Badges/BadgeAnimalStatus'

interface ModalBreedingAnimalDetailsProps extends BreedingActionHandlers {
  animal: Animal
  record: BreedingRecord
  animalType: 'male' | 'female'
  status?: AnimalBreedingStatus
  triggerComponent?: React.ReactNode
  animals: Animal[]
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
  onAddBirth
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
      return calculateExpectedBirthDate(
        femaleInfo.pregnancyConfirmedDate,
        animalsType
      )
    }

    if (record.breedingDate) {
      return calculateExpectedBirthDate(record.breedingDate, animalsType)
    }

    return null
  }

  const handleAction = (action: () => void) => {
    action()
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
        title={`${animalType === 'male' ? 'Macho' : 'Hembra'}: ${
          animal.animalNumber
        }`}
        size="md"
      >
        <div className="space-y-4">
          {/* Información básica del animal */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">
              Información del Animal
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo:</span>
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
                  {record.breedingDate
                    ? formatDate(record.breedingDate)
                    : 'No disponible'}
                </span>
              </div>

              {animalType === 'female' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado:</span>
                    <BadgeAnimalStatus status={status} />
                  </div>

                  {status === 'embarazada' &&
                    femaleInfo?.pregnancyConfirmedDate && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Embarazo confirmado:
                          </span>
                          <span className="font-medium">
                            {formatDate(femaleInfo.pregnancyConfirmedDate)}
                          </span>
                        </div>
                        {expectedBirthDate() && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Parto esperado:
                            </span>
                            <span className="font-medium">
                              {formatDate(expectedBirthDate()!)}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                  {status === 'parida' && femaleInfo?.actualBirthDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha de parto:</span>
                      <span className="font-medium">
                        {formatDate(femaleInfo.actualBirthDate)}
                      </span>
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
                    const offspring = animals.find(
                      (animal) => animal.id === offspringId
                    )
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
            <h3 className="text-lg font-semibold mb-3">Acciones Disponibles</h3>
            <div className="space-y-2">
              {/* Acciones para macho */}
              {animalType === 'male' && (
                <button
                  onClick={() =>
                    handleAction(() =>
                      onRemoveFromBreeding?.(record, animal.id)
                    )
                  }
                  className="w-full px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md flex items-center justify-center gap-2 transition-colors"
                >
                  <Icon icon="delete" className="w-4 h-4" />
                  Sacar de la monta
                </button>
              )}

              {/* Acciones para hembras en monta */}
              {animalType === 'female' && status === 'monta' && (
                <>
                  <button
                    onClick={() =>
                      handleAction(() =>
                        onConfirmPregnancy?.(record, animal.id)
                      )
                    }
                    className="w-full px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md flex items-center justify-center gap-2 transition-colors"
                  >
                    <Icon icon="pregnant" className="w-4 h-4" />
                    Confirmar embarazo
                  </button>
                  <button
                    onClick={() =>
                      handleAction(() =>
                        onRemoveFromBreeding?.(record, animal.id)
                      )
                    }
                    className="w-full px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md flex items-center justify-center gap-2 transition-colors"
                  >
                    <Icon icon="delete" className="w-4 h-4" />
                    Sacar de la monta
                  </button>
                </>
              )}

              {/* Acciones para hembras embarazadas */}
              {animalType === 'female' && status === 'embarazada' && (
                <>
                  <button
                    onClick={() =>
                      handleAction(() => onAddBirth?.(record, animal.id))
                    }
                    className="w-full px-4 py-2 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded-md flex items-center justify-center gap-2 transition-colors"
                  >
                    <Icon icon="baby" className="w-4 h-4" />
                    Registrar parto
                  </button>
                  <button
                    onClick={() =>
                      handleAction(() =>
                        onUnconfirmPregnancy?.(record, animal.id)
                      )
                    }
                    className="w-full px-4 py-2 text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-md flex items-center justify-center gap-2 transition-colors"
                  >
                    <Icon icon="bed" className="w-4 h-4" />
                    Desconfirmar embarazo
                  </button>
                  <button
                    onClick={() =>
                      handleAction(() =>
                        onRemoveFromBreeding?.(record, animal.id)
                      )
                    }
                    className="w-full px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md flex items-center justify-center gap-2 transition-colors"
                  >
                    <Icon icon="delete" className="w-4 h-4" />
                    Sacar de la monta
                  </button>
                </>
              )}

              {/* Acciones para hembras que han parido */}
              {animalType === 'female' && status === 'parida' && (
                <button
                  onClick={() => {
                    if (
                      confirm(
                        '¿Estás seguro? Se borrarán todos los datos de las crías asociadas.'
                      )
                    ) {
                      handleAction(() => onDeleteBirth?.(record, animal.id))
                    }
                  }}
                  className="w-full px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md flex items-center justify-center gap-2 transition-colors"
                >
                  <Icon icon="delete" className="w-4 h-4" />
                  Eliminar parto
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default ModalBreedingAnimalDetails
