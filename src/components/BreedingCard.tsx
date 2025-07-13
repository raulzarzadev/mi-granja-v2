'use client'

import React from 'react'
import { BreedingRecord, Animal } from '@/types'
import { getNextBirthInfo } from '@/lib/animalBreedingConfig'
import Button from './buttons/Button'

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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(date))
  }

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
    if (record.actualBirthDate) return null

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
        {/* Hembras involucradas */}
        <div className="mb-1 flex items-center gap-2">
          <span className="text-pink-500">♀</span>
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
                <span className="text-lg">
                  {femaleAnimal.status === 'parida' && '👶'}
                  {femaleAnimal.status === 'embarazada' && '🤰'}
                  {femaleAnimal.status === 'monta' && '♀️'}
                </span>
                <span className="font-medium text-gray-800">
                  {femaleAnimal.animalId}
                </span>
                <span className="text-xs px-2 py-1 bg-gray-200 rounded-full text-gray-600">
                  {femaleAnimal.type}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    femaleAnimal.status === 'parida'
                      ? 'bg-green-100 text-green-700'
                      : femaleAnimal.status === 'embarazada'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {femaleAnimal.status === 'parida' && 'Parida'}
                  {femaleAnimal.status === 'embarazada' && 'Embarazada'}
                  {femaleAnimal.status === 'monta' && 'En monta'}
                </span>
              </div>
              <div className="text-right">
                {femaleAnimal.status === 'parida' &&
                  femaleAnimal.actualBirthDate && (
                    <span className="text-sm font-medium text-green-600">
                      Parió: {formatDate(femaleAnimal.actualBirthDate)}
                    </span>
                  )}
                {femaleAnimal.status === 'embarazada' &&
                  femaleAnimal.expectedBirthDate && (
                    <span className="text-sm font-medium text-purple-600">
                      Esperado: {formatDate(femaleAnimal.expectedBirthDate)}
                    </span>
                  )}
                {femaleAnimal.status === 'monta' && (
                  <span className="text-xs text-gray-500">
                    Esperando confirmación
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Macho */}
        <div className="mb-1 flex items-center gap-2">
          <span className="text-blue-500">♂</span>
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
      </div>

      {/* Fechas */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Fecha de monta:</span>
          <span className="font-medium">{formatDate(record.breedingDate)}</span>
        </div>

        {nextBirthDate && !record.actualBirthDate && (
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

        {record.actualBirthDate && (
          <div className="flex justify-between">
            <span className="text-gray-600">Parto real:</span>
            <span className="font-medium text-green-600">
              {formatDate(record.actualBirthDate)}
            </span>
          </div>
        )}
      </div>

      {/* Crías */}
      {record.offspring && record.offspring.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Crías registradas:</span>
            <span className="text-sm font-medium text-green-600">
              {record.offspring.length} animal
              {record.offspring.length !== 1 ? 'es' : ''}
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
                  <span className="font-medium">
                    {femaleAnimal?.animalId || 'Desconocido'}
                  </span>
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
