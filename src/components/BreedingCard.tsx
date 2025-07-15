'use client'

import React from 'react'
import { Animal } from '@/types'
import { getNextBirthInfo } from '@/lib/animalBreedingConfig'
import Button from './buttons/Button'
import { Icon } from './Icon/icon'
import { BreedingRecord } from '@/types/breedings'
import { formatDate } from '@/lib/dates'

interface BreedingCardProps {
  record: BreedingRecord
  animals: Animal[]
  onEdit?: (record: BreedingRecord) => void
  onAddBirth?: (record: BreedingRecord) => void
  onDelete?: (record: BreedingRecord) => void
  onConfirmPregnancy?: (record: BreedingRecord) => void
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
  onConfirmPregnancy
}) => {
  // Manejar múltiples hembras
  const male = animals.find((a) => a.id === record.maleId)
  const femaleIds = record.femaleBreedingInfo.map((info) => info.femaleId)

  const handleDelete = () => {
    if (
      window.confirm(
        '¿Estás seguro de que quieres eliminar este registro de monta? Esta acción no se puede deshacer.'
      )
    ) {
      onDelete?.(record)
    }
  }

  const getDaysUntilBirth = () => {
    // Usar la nueva función para obtener la información del parto más próximo
    const femaleAnimals = animals.filter((a) => femaleIds.includes(a.id))

    if (femaleAnimals.length === 0) return null

    const animalType = femaleAnimals[0].type
    const birthInfo = getNextBirthInfo(record, animalType, animals)

    return {
      days: birthInfo.daysUntil,
      date: birthInfo.expectedDate,
      femaleAnimalId: birthInfo.femaleAnimalId,
      hasMultiplePregnancies: birthInfo.hasMultiplePregnancies,
      totalConfirmedPregnancies: birthInfo.totalConfirmedPregnancies
    }
  }

  const birthInfo = getDaysUntilBirth()
  const daysUntilBirth = birthInfo?.days
  const nextBirthDate = birthInfo?.date
  const isOverdue =
    daysUntilBirth !== null &&
    daysUntilBirth !== undefined &&
    daysUntilBirth < 0

  const isNearBirth =
    daysUntilBirth !== null &&
    daysUntilBirth !== undefined &&
    daysUntilBirth <= 7 &&
    daysUntilBirth >= 0

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

  const femaleAnimalInfo =
    record?.femaleBreedingInfo.map((info) => {
      const animalInfo = animals.find((a) => a.id === info.femaleId)

      // Determinar el estado real de la hembra
      let status: 'parida' | 'embarazada' | 'monta' = 'monta'
      if (info.actualBirthDate) {
        status = 'parida'
      } else if (info.pregnancyConfirmedDate) {
        status = 'embarazada'
      }

      return {
        femaleId: info.femaleId,
        animalId: animalInfo?.animalId || 'Desconocido',
        type: animalInfo?.type,
        pregnancyConfirmed: info.pregnancyConfirmedDate,
        expectedBirthDate: info.expectedBirthDate,
        actualBirthDate: info.actualBirthDate,
        status
      }
    }) || []

  const offspring = record.femaleBreedingInfo
    .map((info) => info.offspring || [])
    .flat()

  console.log({ femaleAnimalInfo })
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Header con estado */}
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
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800">
                {male?.animalId || 'Animal no encontrado'}
              </span>
              <span className="text-xs px-2 py-1 bg-gray-200 rounded-full text-gray-600">
                {male?.type}
              </span>
            </div>
          </div>
        </div>

        {/* Hembras involucradas */}
        <div className="mb-1 flex items-center gap-2">
          <span className="text-pink-500">
            <Icon icon="female" />
          </span>
          <span className="font-medium">Hembra(s):</span>
        </div>
        {femaleAnimalInfo.length === 0 && (
          <p className="text-sm text-gray-500 mb-2">
            No hay hembras involucradas
          </p>
        )}
        <div className="ml-6 mb-2 space-y-2">
          {femaleAnimalInfo.map((femaleAnimal) => (
            <div
              key={femaleAnimal.femaleId}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800">
                  {femaleAnimal.animalId}
                </span>
                <span className="text-xs px-2 py-1 bg-gray-200 rounded-full text-gray-600">
                  {femaleAnimal.type}
                </span>
              </div>
              <div className="text-right">
                {femaleAnimal.status === 'parida' &&
                  femaleAnimal.actualBirthDate && (
                    <span className="text-sm font-medium text-green-600 ">
                      <div className="flex items-center gap-1">
                        <Icon icon="baby" />{' '}
                        <span className="text-xs">Pario</span>
                      </div>
                      {formatDate(femaleAnimal.actualBirthDate)}
                    </span>
                  )}
                {femaleAnimal.status === 'embarazada' &&
                  femaleAnimal.expectedBirthDate && (
                    <span className="text-sm font-medium text-purple-600 ">
                      <div className="flex items-center gap-1">
                        <Icon icon="pregnant" />{' '}
                        <span className="text-xs">Confirmado</span>
                      </div>
                      {formatDate(femaleAnimal.expectedBirthDate)}
                    </span>
                  )}
                {femaleAnimal.status === 'monta' && (
                  <span className="text-sm  ">
                    <div className="flex items-center">
                      <Icon icon="bed" />{' '}
                      <span className="text-xs">Pendiente</span>
                    </div>
                    {record.breedingDate
                      ? formatDate(record.breedingDate)
                      : 'En monta'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fechas */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Fecha de monta:</span>
          <span className="font-medium">
            {record.breedingDate
              ? formatDate(record.breedingDate)
              : 'No disponible'}
          </span>
        </div>

        {nextBirthDate && (
          <div className="flex justify-between">
            <span className="text-gray-600">
              Próximo parto esperado
              {birthInfo?.femaleAnimalId &&
              birthInfo.femaleAnimalId !== 'Estimado'
                ? ` (${birthInfo.femaleAnimalId})`
                : ''}
              :
            </span>
            <span
              className={`font-medium ${
                isOverdue
                  ? 'text-red-600'
                  : isNearBirth
                  ? 'text-yellow-600'
                  : 'text-blue-600'
              }`}
            >
              {formatDate(nextBirthDate)}
            </span>
          </div>
        )}

        {birthInfo?.hasMultiplePregnancies && (
          <div className="flex justify-between">
            <span className="text-gray-600">Embarazos confirmados:</span>
            <span className="font-medium text-green-600">
              {birthInfo.totalConfirmedPregnancies} de{' '}
              {record.femaleBreedingInfo?.length || 0}
            </span>
          </div>
        )}
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
                    {femaleAnimal?.animalId || 'Desconocido'}
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
        {onConfirmPregnancy &&
          femaleAnimalInfo.some((female) => female.status === 'monta') && (
            <Button
              onClick={() => onConfirmPregnancy(record)}
              color="warning"
              icon="pregnant"
            >
              Confirmar Embarazo
            </Button>
          )}
        {onAddBirth &&
          femaleAnimalInfo.some((female) => female.status === 'embarazada') && (
            <Button
              color="success"
              onClick={() => onAddBirth(record)}
              icon="baby"
            >
              Registrar Parto
            </Button>
          )}
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

export default BreedingCard
