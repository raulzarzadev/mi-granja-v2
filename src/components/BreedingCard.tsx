'use client'

import React from 'react'

import { calculateExpectedBirthDate } from '@/lib/animalBreedingConfig'
import Button from './buttons/Button'
import { Icon } from './Icon/icon'
import { BreedingRecord } from '@/types/breedings'
import { formatDate } from '@/lib/dates'
import { Animal } from '@/types/animals'

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

  const getDaysUntilBirth = () => {
    if (!record.breedingDate || !animalsType) return null

    const expectedBirthDate = calculateExpectedBirthDate(
      record.breedingDate,
      animalsType
    )
    if (!expectedBirthDate) return null

    const now = new Date()
    const daysUntil = Math.ceil(
      (expectedBirthDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    return {
      daysUntil,
      femaleanimalNumber:
        record.femaleBreedingInfo[0]?.animalNumber || 'Estimado'
    }
  }

  const birthInfo = getDaysUntilBirth()

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
      const animalInfo = animals.find((a) => a.id === info.animalNumber)

      // Determinar el estado real de la hembra
      let status: 'parida' | 'embarazada' | 'monta' = 'monta'
      if (info.actualBirthDate) {
        status = 'parida'
      } else if (info.pregnancyConfirmedDate) {
        status = 'embarazada'
      } else {
        status = 'monta'
      }

      const expectedBirthDate = () => {
        // if animalType is not set
        if (!animalsType) return null

        // if actual birth date is set, return null
        if (info.actualBirthDate) return null

        //if confirmed pregnancy is set
        if (info.pregnancyConfirmedDate) {
          return calculateExpectedBirthDate(
            info.pregnancyConfirmedDate,
            animalsType
          )
        }

        // if NOT confirmed pregnancy is set
        if (record.breedingDate)
          return calculateExpectedBirthDate(record.breedingDate, animalsType)
        //
        return null
      }

      return {
        animalNumber: info.animalNumber,
        type: animalInfo?.type,
        pregnancyConfirmedDate: info.pregnancyConfirmedDate || null,
        expectedBirthDate: expectedBirthDate(),
        actualBirthDate: info.actualBirthDate || null,
        status
      }
    }) || []

  const offspring = record.femaleBreedingInfo
    .map((info) => info.offspring || [])
    .flat()

  const nextBirthAnimal = femalesBreedingInfo.sort((a, b) => {
    if (a.expectedBirthDate && b.expectedBirthDate) {
      return a.expectedBirthDate.getTime() - b.expectedBirthDate.getTime()
    }
    return 0
  })[0]

  console.log({ nextBirthAnimal })

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
                {male?.animalNumber || 'Animal no encontrado'}
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
        {femalesBreedingInfo.length === 0 && (
          <p className="text-sm text-gray-500 mb-2">
            No hay hembras involucradas
          </p>
        )}
        <div className="ml-6 mb-2 space-y-2">
          {femalesBreedingInfo.map((femaleAnimal) => (
            <div
              key={femaleAnimal.animalNumber}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800">
                  {femaleAnimal.animalNumber}
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

        <div className="flex justify-between">
          <span className="text-gray-600">
            Próximo parto esperado
            {birthInfo?.femaleanimalNumber &&
            birthInfo.femaleanimalNumber !== 'Estimado'
              ? ` (${birthInfo.femaleanimalNumber})`
              : ''}
            :
          </span>
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
              const femaleAnimal = animals.find(
                (a) => a.id === info.animalNumber
              )
              return (
                <div
                  key={info.animalNumber}
                  className="text-xs text-gray-600 mb-1"
                >
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
        {onConfirmPregnancy &&
          femalesBreedingInfo.some((female) => female.status === 'monta') && (
            <Button
              onClick={() => onConfirmPregnancy(record)}
              color="warning"
              icon="pregnant"
            >
              Confirmar Embarazo
            </Button>
          )}
        {onAddBirth &&
          femalesBreedingInfo.some(
            (female) => female.status === 'embarazada'
          ) && (
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
