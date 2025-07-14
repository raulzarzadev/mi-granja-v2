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

  const getStatusColor = () => {
    if (record.actualBirthDate) return 'bg-green-100 text-green-800'
    if (isOverdue) return 'bg-red-100 text-red-800'
    if (isNearBirth) return 'bg-yellow-100 text-yellow-800'
    if (record.pregnancyConfirmed) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusText = () => {
    if (record.actualBirthDate) return 'Parida'
    if (isOverdue) {
      const info = birthInfo?.femaleAnimalId
        ? ` (${birthInfo.femaleAnimalId})`
        : ''
      return `Atrasada ${Math.abs(daysUntilBirth!)} días${info}`
    }
    if (isNearBirth) {
      const info = birthInfo?.femaleAnimalId
        ? ` (${birthInfo.femaleAnimalId})`
        : ''
      return `${daysUntilBirth} días para parto${info}`
    }
    if (record.pregnancyConfirmed) {
      const confirmedCount = birthInfo?.totalConfirmedPregnancies || 0
      return confirmedCount > 0
        ? `${confirmedCount} embarazo${
            confirmedCount > 1 ? 's' : ''
          } confirmado${confirmedCount > 1 ? 's' : ''}`
        : 'Embarazada'
    }
    return 'Monta registrada'
  }

  const femaleAnimalInfo =
    record?.femaleBreedingInfo.map((info) => {
      const animalInfo = animals.find((a) => a.id === info.femaleId)

      // Determinar el estado real de la hembra
      let status: 'parida' | 'embarazada' | 'monta' = 'monta'
      if (info.actualBirthDate) {
        status = 'parida'
      } else if (info.pregnancyConfirmed) {
        status = 'embarazada'
      }

      return {
        femaleId: info.femaleId,
        animalId: animalInfo?.animalId || 'Desconocido',
        type: animalInfo?.type,
        pregnancyConfirmed: info.pregnancyConfirmed,
        expectedBirthDate: info.expectedBirthDate,
        actualBirthDate: info.actualBirthDate,
        status
      }
    }) || []

  const offspring = record.femaleBreedingInfo
    .map((info) => info.offspring || [])
    .flat()
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Header con estado */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}
        >
          {getStatusText()}
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
