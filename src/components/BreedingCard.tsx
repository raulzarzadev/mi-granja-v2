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

  const femaleAnimalInfo =
    record?.femaleBreedingInfo.map((info) => {
      const animalInfo = animals.find((a) => a.id === info.femaleId)
      return {
        femaleId: info.femaleId,
        animalId: animalInfo?.animalId || 'Desconocido',
        type: animalInfo?.type,
        pregnancyConfirmed: info.pregnancyConfirmed,
        expectedBirthDate: info.expectedBirthDate
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
                  {femaleAnimal.pregnancyConfirmed ? '✅' : '⏳'}
                </span>
                <span className="font-medium text-gray-800">
                  {femaleAnimal.animalId}
                </span>
                <span className="text-xs px-2 py-1 bg-gray-200 rounded-full text-gray-600">
                  {femaleAnimal.type}
                </span>
              </div>
              {femaleAnimal.pregnancyConfirmed &&
                femaleAnimal.expectedBirthDate && (
                  <span className="text-sm font-medium text-purple-600">
                    {formatDate(femaleAnimal.expectedBirthDate)}
                  </span>
                )}
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
              {birthInfo.totalConfirmedPregnancies} de {record.femaleIds.length}
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
