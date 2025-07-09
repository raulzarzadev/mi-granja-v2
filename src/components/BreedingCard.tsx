'use client'

import React from 'react'
import { BreedingRecord, Animal } from '@/types'
import { getNextBirthInfo } from '@/lib/animalBreedingConfig'

interface BreedingCardProps {
  record: BreedingRecord
  animals: Animal[]
  onEdit?: (record: BreedingRecord) => void
  onAddBirth?: (record: BreedingRecord) => void
}

/**
 * Tarjeta para mostrar un registro de reproducción
 */
const BreedingCard: React.FC<BreedingCardProps> = ({
  record,
  animals,
  onEdit,
  onAddBirth
}) => {
  // Manejar múltiples hembras
  const femaleAnimals = animals.filter((a) => record.femaleIds.includes(a.id))
  const male = animals.find((a) => a.id === record.maleId)

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(date))
  }

  const getDaysUntilBirth = () => {
    if (record.actualBirthDate) return null

    // Usar la nueva función para obtener la información del parto más próximo
    const femaleAnimals = animals.filter((a) => record.femaleIds.includes(a.id))
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Header con estado */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}
        >
          {getStatusText()}
        </span>
        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(record)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Editar
            </button>
          )}
          {onAddBirth &&
            !record.actualBirthDate &&
            record.pregnancyConfirmed && (
              <button
                onClick={() => onAddBirth(record)}
                className="text-green-600 hover:text-green-800 text-sm font-medium"
              >
                Registrar Parto
              </button>
            )}
        </div>
      </div>

      {/* Información de animales */}
      <div className="mb-3">
        {/* Hembras involucradas */}
        <div className="mb-1 flex items-center gap-2">
          <span className="text-pink-500">♀</span>
          <span className="font-medium">Hembra(s):</span>
        </div>
        {femaleAnimals.length > 0 ? (
          <ul className="list-disc list-inside ml-6 mb-2">
            {femaleAnimals.map((f) => (
              <li key={f.id} className="text-sm">
                {f.animalId} <span className="text-gray-500">({f.type})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 mb-2">
            No hay hembras involucradas
          </p>
        )}
        {/* Macho */}
        <div className="flex items-center gap-2">
          <span className="text-blue-500">♂</span>
          <span className="font-medium">
            {male?.animalId || 'Animal no encontrado'}
          </span>
          <span className="text-sm text-gray-500">({male?.type})</span>
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
              {birthInfo.totalConfirmedPregnancies} de {record.femaleIds.length}
            </span>
          </div>
        )}

        {record.expectedBirthDate && (
          <div className="flex justify-between">
            <span className="text-gray-600">Parto esperado (legacy):</span>
            <span className="font-medium text-gray-500">
              {formatDate(record.expectedBirthDate)}
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

      {/* Detalles de embarazo por hembra */}
      {record.femaleBreedingInfo && record.femaleBreedingInfo.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <h5 className="text-sm font-medium text-gray-700 mb-2">
            Estado por Hembra:
          </h5>
          <div className="space-y-2">
            {record.femaleBreedingInfo.map((info) => {
              const femaleAnimal = animals.find((a) => a.id === info.femaleId)
              return (
                <div
                  key={info.femaleId}
                  className="text-xs bg-gray-50 p-2 rounded"
                >
                  <div className="font-medium text-gray-800">
                    {femaleAnimal?.animalId || 'Animal no encontrado'}
                  </div>
                  <div className="mt-1 space-y-1">
                    <div className="flex justify-between">
                      <span>Embarazada:</span>
                      <span
                        className={
                          info.pregnancyConfirmed
                            ? 'text-green-600 font-medium'
                            : 'text-gray-500'
                        }
                      >
                        {info.pregnancyConfirmed ? 'Sí' : 'No confirmado'}
                      </span>
                    </div>
                    {info.pregnancyConfirmed && info.pregnancyConfirmedDate && (
                      <div className="flex justify-between">
                        <span>Confirmado:</span>
                        <span className="text-blue-600">
                          {formatDate(info.pregnancyConfirmedDate)}
                        </span>
                      </div>
                    )}
                    {info.expectedBirthDate && (
                      <div className="flex justify-between">
                        <span>Parto esperado:</span>
                        <span className="text-purple-600">
                          {formatDate(info.expectedBirthDate)}
                        </span>
                      </div>
                    )}
                    {info.actualBirthDate && (
                      <div className="flex justify-between">
                        <span>Parto real:</span>
                        <span className="text-green-600 font-medium">
                          {formatDate(info.actualBirthDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Crías */}
      {record.offspring && record.offspring.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className="text-sm text-gray-600">Crías: </span>
          <span className="text-sm font-medium">
            {record.offspring.length} animal
            {record.offspring.length !== 1 ? 'es' : ''}
          </span>
        </div>
      )}

      {/* Notas */}
      {record.notes && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-600">{record.notes}</p>
        </div>
      )}
    </div>
  )
}

export default BreedingCard
