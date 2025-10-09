'use client'

import React from 'react'

import { calculateExpectedBirthDate } from '@/lib/animalBreedingConfig'
import Button from './buttons/Button'
import { Icon } from './Icon/icon'
import { BreedingRecord } from '@/types/breedings'
import { formatDate, fromNow } from '@/lib/dates'
import { Animal, AnimalBreedingStatus } from '@/types/animals'
import ModalBreedingAnimalDetails from './ModalBreedingAnimalDetails'
import { BreedingActionHandlers } from '@/types/components/breeding'
import { BadgeAnimalStatus } from './Badges/BadgeAnimalStatus'

interface BreedingCardProps extends BreedingActionHandlers {
  record: BreedingRecord
  animals: Animal[]
  onEdit?: (record: BreedingRecord) => void
  onDelete?: (record: BreedingRecord) => void
}

/**
 * Tarjeta para mostrar un registro de reproducción
 */
const BreedingCard: React.FC<BreedingCardProps> = ({
  record,
  animals,
  onEdit,
  onAddBirth,
  onDelete,
  onConfirmPregnancy,
  onUnconfirmPregnancy,
  onRemoveFromBreeding,
  onDeleteBirth
}) => {
  // Manejar múltiples hembras
  const male = animals.find((a) => a.id === record.maleId)

  const animalsType = male?.type
  const handleDelete = () => {
    if (
      window.confirm(
        '¿Estás seguro de que quieres eliminar este registro de monta? Esta acción no se puede deshacer.'
      )
    ) {
      onDelete?.(record)
    }
  }

  const getFemaleStatuses = () => {
    //TODO: los estados son , Monta en proceso, no. de partos, no. de embarazos confirmados,
    // algo asi Monta en proceso. Partos:2 Embarazos:3 Pendientes: 1
    const births = record.femaleBreedingInfo.filter(
      (info) => info.actualBirthDate
    ).length
    const pregnancies = record.femaleBreedingInfo.filter(
      (info) => !!info.pregnancyConfirmedDate && !info.actualBirthDate
    ).length
    const pending = record.femaleBreedingInfo.filter(
      (info) => !info.pregnancyConfirmedDate && !info.actualBirthDate
    ).length

    return {
      births,
      pregnancies,
      pending
    }
  }

  const getStatusColor = (statuses: ReturnType<typeof getFemaleStatuses>) => {
    if (statuses.pending > 0) return 'bg-yellow-100 text-yellow-800' // Montas pendientes
    if (statuses.pregnancies > 0) return 'bg-blue-100 text-blue-800' // Embarazos
    if (statuses.births > 0) return 'bg-green-100 text-green-800' // Partos
  }

  const femaleStatuses = getFemaleStatuses()
  const femalesBreedingInfo =
    record?.femaleBreedingInfo.map((info) => {
      const animalInfo = animals.find((a) => info.femaleId === a.id)

      // Determinar el estado real de la hembra
      let status: AnimalBreedingStatus = 'monta'
      if (info.actualBirthDate) {
        status = 'parida'
      } else if (info.pregnancyConfirmedDate) {
        status = 'embarazada'
      } else {
        status = 'monta'
      }

      const expectedBirthDate = () => {
        // Priorizar el tipo de la hembra; si no, usar el del macho
        const typeForCalc = animalInfo?.type || animalsType
        if (!typeForCalc) return null

        // si ya parió, no hay fecha probable
        if (info.actualBirthDate) return null

        // si hay embarazo confirmado, calcular desde esa fecha
        if (info.pregnancyConfirmedDate) {
          const res = calculateExpectedBirthDate(
            info.pregnancyConfirmedDate,
            typeForCalc
          )
          return res
        }

        // si no hay confirmación, opcionalmente usar la fecha de monta
        if (record.breedingDate)
          return calculateExpectedBirthDate(record.breedingDate, typeForCalc)

        return null
      }
      const expected = expectedBirthDate()
      return {
        animalId: animalInfo?.id || info.femaleId, // Número del animal para mostrar al usuario
        animalNumber: animalInfo?.animalNumber,
        type: animalInfo?.type,
        pregnancyConfirmedDate: info.pregnancyConfirmedDate || null,
        expectedBirthDate: expected,
        actualBirthDate: info.actualBirthDate || null,
        status
      }
    }) || []

  const offspring = record.femaleBreedingInfo
    .map((info) => info.offspring || [])
    .flat()

  // Orden de hembras:
  // 1) En monta (pendiente de confirmación)
  // 2) Embarazadas con fecha probable de parto vencida
  // 3) Embarazadas con fecha probable futura (más próximas primero)
  // 4) Al final, las que ya han parido (más reciente primero)
  const sortedFemales = React.useMemo(() => {
    const now = Date.now()

    const getGroup = (f: (typeof femalesBreedingInfo)[number]) => {
      if (f.status === 'monta') return 0
      if (f.status === 'embarazada') {
        if (f.expectedBirthDate && f.expectedBirthDate.getTime() < now) {
          return 1 // vencida
        }
        return 2 // próxima
      }
      return 3 // parida
    }

    const getAnimalNumber = (f: (typeof femalesBreedingInfo)[number]) =>
      String(f.animalNumber ?? '')

    return [...femalesBreedingInfo].sort((a, b) => {
      const ga = getGroup(a)
      const gb = getGroup(b)
      if (ga !== gb) return ga - gb

      // Dentro del mismo grupo, ordenar por criterio específico
      switch (ga) {
        case 0: // monta: por número de animal asc para estabilidad
          return getAnimalNumber(a).localeCompare(getAnimalNumber(b), 'es', {
            numeric: true
          })
        case 1: // embarazada vencida: más vencida primero (fecha más antigua)
          if (a.expectedBirthDate && b.expectedBirthDate) {
            return a.expectedBirthDate.getTime() - b.expectedBirthDate.getTime()
          }
          if (a.expectedBirthDate) return -1
          if (b.expectedBirthDate) return 1
          return 0
        case 2: // embarazada próxima: más cercana primero (fecha ascendente)
          if (a.expectedBirthDate && b.expectedBirthDate) {
            return a.expectedBirthDate.getTime() - b.expectedBirthDate.getTime()
          }
          if (a.expectedBirthDate) return -1
          if (b.expectedBirthDate) return 1
          return 0
        case 3: // parida: más reciente primero (fecha desc)
          if (a.actualBirthDate && b.actualBirthDate) {
            return b.actualBirthDate.getTime() - a.actualBirthDate.getTime()
          }
          if (a.actualBirthDate) return -1
          if (b.actualBirthDate) return 1
          return 0
        default:
          return 0
      }
    })
  }, [femalesBreedingInfo])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Header con estado */}
      {/* Fechas */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-end">
          <span className="text-gray-600 mr-2">Fecha: </span>
          <span className="font-medium">
            {record.breedingDate
              ? formatDate(record.breedingDate, 'EEE dd/MMM/yy')
              : 'No disponible'}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
            femaleStatuses
          )}`}
        >
          {femaleStatuses.births > 0 && (
            <span className="text-green-600">
              <Icon icon="baby" className="inline mr-1" />
              {femaleStatuses.births} parto
              {femaleStatuses.births !== 1 ? 's' : ''}
            </span>
          )}
          {femaleStatuses.pregnancies > 0 && (
            <span className="text-blue-600 ml-2">
              <Icon icon="pregnant" className="inline mr-1" />
              {femaleStatuses.pregnancies} embarazo
              {femaleStatuses.pregnancies !== 1 ? 's' : ''}
            </span>
          )}
          {femaleStatuses.pending > 0 && (
            <span className="text-yellow-600 ml-2">
              <Icon icon="bed" className="inline mr-1" />
              {femaleStatuses.pending} monta pendiente
              {femaleStatuses.pending !== 1 ? 's' : ''}
            </span>
          )}
        </span>
      </div>

      {/* Información de animales */}

      <div className="mb-3">
        {/* Macho */}
        <div className="mb-1 flex items-center gap-2">
          <span className="text-blue-500">
            <Icon icon="male" />
          </span>
          <span className="font-medium">Macho:</span>
        </div>
        <div className="ml-6">
          {male ? (
            <ModalBreedingAnimalDetails
              animal={male}
              record={record}
              animalType="male"
              animals={animals}
              onRemoveFromBreeding={onRemoveFromBreeding}
              triggerComponent={
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">
                      {male.animalNumber}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-200 rounded-full text-gray-600">
                      {male.type}
                    </span>
                  </div>
                  <Icon icon="view" className="w-4 h-4 text-gray-400" />
                </div>
              }
            />
          ) : (
            <div className="p-2 bg-gray-50 rounded-md">
              <span className="text-gray-500">Animal no encontrado</span>
            </div>
          )}
        </div>

        {/* Hembras involucradas */}
        <div className="mb-1 flex items-center gap-2">
          <span className="text-pink-500">
            <Icon icon="female" />
          </span>
          <span className="font-medium">Hembra(s):</span>
        </div>
        {femalesBreedingInfo.length === 0 && (
          <p className="text-sm text-gray-500 mb-2">
            No hay hembras involucradas
          </p>
        )}
        <div className="ml-6 mb-2 space-y-2">
          {sortedFemales.map((femaleAnimal) => {
            const animal = animals.find((a) => a.id === femaleAnimal.animalId)
            return animal ? (
              <ModalBreedingAnimalDetails
                key={femaleAnimal.animalNumber}
                animal={animal}
                record={record}
                animalType="female"
                status={femaleAnimal.status}
                animals={animals}
                onConfirmPregnancy={onConfirmPregnancy}
                onUnconfirmPregnancy={onUnconfirmPregnancy}
                onRemoveFromBreeding={onRemoveFromBreeding}
                onDeleteBirth={onDeleteBirth}
                onAddBirth={onAddBirth}
                triggerComponent={
                  <div className="p-2 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">
                          {femaleAnimal.animalNumber}
                        </span>
                        <span className="text-xs px-2 py-1 bg-gray-200 rounded-full text-gray-600">
                          {femaleAnimal.type}
                        </span>

                        <BadgeAnimalStatus status={femaleAnimal.status} />
                        {femaleAnimal.status === 'embarazada' && (
                          <div className="flex items-center gap-2">
                            <div className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                              <span className="text-xs font-medium text-blue-800">
                                Parto{' '}
                              </span>
                              {fromNow(femaleAnimal.expectedBirthDate)}
                            </div>
                          </div>
                        )}
                        {femaleAnimal.status === 'parida' &&
                          femaleAnimal.actualBirthDate && (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                              Parto: {formatDate(femaleAnimal.actualBirthDate)}
                            </span>
                          )}
                        {/* {femaleAnimal.status === 'monta' && (
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                            Pendiente de confirmación
                          </span>
                        )} */}
                      </div>
                      <Icon icon="view" className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                }
              />
            ) : (
              <AnimalNotFound
                animalId={femaleAnimal.animalId || ''}
                onDelete={async () => {
                  return onRemoveFromBreeding?.(
                    record,
                    femaleAnimal.animalId || ''
                  )
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Crías */}
      {offspring.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Crías registradas:</span>
            <span className="text-sm font-medium text-green-600">
              {offspring.length} animal
              {offspring.length !== 1 ? 'es' : ''}
            </span>
          </div>

          {/* Mostrar resumen por hembra que ya parió */}
          {record.femaleBreedingInfo
            .filter(
              (info) =>
                info.actualBirthDate &&
                info.offspring &&
                info.offspring.length > 0
            )
            .map((info) => {
              const femaleAnimal = animals.find((a) => a.id === info.femaleId)
              return (
                <div key={info.femaleId} className="text-xs text-gray-600 mb-1">
                  <span className=" font-bold">
                    {femaleAnimal?.animalNumber || 'Desconocido'}
                  </span>{' '}
                  parió {info.offspring?.length || 0} cría
                  {(info.offspring?.length || 0) !== 1 ? 's' : ''}
                  {info.actualBirthDate && (
                    <span className="ml-2 text-gray-500">
                      el {formatDate(info.actualBirthDate)}
                    </span>
                  )}
                </div>
              )
            })}
        </div>
      )}

      {/* Notas */}
      {record.notes && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-600">{record.notes}</p>
        </div>
      )}

      <div className="grid gap-2">
        {onEdit && (
          <Button onClick={() => onEdit(record)} icon="edit" color="primary">
            Editar
          </Button>
        )}

        {onDelete && (
          <Button
            onClick={handleDelete}
            color="error"
            variant="ghost"
            icon="delete"
          >
            Eliminar
          </Button>
        )}
      </div>
    </div>
  )
}

export const AnimalNotFound = ({
  animalId,
  onDelete
}: {
  animalId?: string
  onDelete?: () => void | Promise<void>
}) => {
  return (
    <>
      <div
        key={animalId}
        className="p-2 bg-gray-50 rounded-md flex justify-between items-center"
      >
        <span className="text-gray-500">Animal no encontrado</span>
        {onDelete && (
          <button
            onClick={() =>
              (
                document.getElementById(
                  `confirm-delete-${animalId}`
                ) as HTMLDialogElement | null
              )?.showModal()
            }
            aria-label="Eliminar"
            title="Eliminar"
            className="w-5 h-5 flex items-center justify-center font-bold text-white rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            -
          </button>
        )}
      </div>

      {onDelete && (
        <dialog
          id={`confirm-delete-${animalId}`}
          className="rounded-lg p-0 backdrop:bg-black/40 max-w-sm w-[90%]"
        >
          <form
            method="dialog"
            className="p-4 space-y-4"
            onSubmit={(e) => e.preventDefault()}
          >
            <h2 className="text-sm font-semibold text-gray-800">
              Confirmar eliminación
            </h2>
            <p className="text-xs text-gray-600">
              ¿Seguro que deseas eliminar esta referencia a la hembra (ID:{' '}
              {animalId}) del registro de monta? Esta acción no se puede
              deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  (
                    document.getElementById(
                      `confirm-delete-${animalId}`
                    ) as HTMLDialogElement | null
                  )?.close()
                }
                className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDelete?.()
                  ;(
                    document.getElementById(
                      `confirm-delete-${animalId}`
                    ) as HTMLDialogElement | null
                  )?.close()
                }}
                className="px-3 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-300"
              >
                Eliminar
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  )
}

export default BreedingCard
