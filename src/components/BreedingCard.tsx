'use client'

import React from 'react'

import { calculateExpectedBirthDate } from '@/lib/animalBreedingConfig'
import Button from './buttons/Button'
import { Icon } from './Icon/icon'
import { BreedingRecord } from '@/types/breedings'
import { formatDate } from '@/lib/dates'
import { Animal } from '@/types/animals'
import ModalBreedingAnimalDetails from './ModalBreedingAnimalDetails'

interface BreedingCardProps {
  record: BreedingRecord
  animals: Animal[]
  onEdit?: (record: BreedingRecord) => void
  onAddBirth?: (record: BreedingRecord) => void
  onDelete?: (record: BreedingRecord) => void
  onConfirmPregnancy?: (record: BreedingRecord) => void
  onUnconfirmPregnancy?: (record: BreedingRecord, femaleId: string) => void
  onRemoveFromBreeding?: (record: BreedingRecord, animalId: string) => void
  onDeleteBirth?: (record: BreedingRecord, femaleId: string) => void
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

    const animalNumber =
      animals.find((a) => a.id === record.femaleBreedingInfo[0]?.femaleId)
        ?.animalNumber || 'Estimado'

    return {
      daysUntil,
      femaleAnimalNumber: animalNumber
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
      const animalInfo = animals.find((a) => info.femaleId === a.id)

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
        animalId: animalInfo?.id, // Número del animal para mostrar al usuario
        animalNumber: animalInfo?.animalNumber,
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

  // const nextBirthAnimal = femalesBreedingInfo.sort((a, b) => {
  //   if (a.expectedBirthDate && b.expectedBirthDate) {
  //     return a.expectedBirthDate.getTime() - b.expectedBirthDate.getTime()
  //   }
  //   return 0
  // })[0]

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
          {male ? (
            <ModalBreedingAnimalDetails
              animal={male}
              record={record}
              animalType="male"
              allAnimals={animals}
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
          {femalesBreedingInfo.map((femaleAnimal) => {
            const animal = animals.find((a) => a.id === femaleAnimal.animalId)
            return animal ? (
              <ModalBreedingAnimalDetails
                key={femaleAnimal.animalNumber}
                animal={animal}
                record={record}
                animalType="female"
                status={femaleAnimal.status}
                allAnimals={animals}
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
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            femaleAnimal.status === 'parida'
                              ? 'bg-green-100 text-green-800'
                              : femaleAnimal.status === 'embarazada'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {femaleAnimal.status === 'parida' && 'Parida'}
                          {femaleAnimal.status === 'embarazada' && 'Embarazada'}
                          {femaleAnimal.status === 'monta' && 'En monta'}
                        </span>
                      </div>
                      <Icon icon="view" className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                }
              />
            ) : (
              <div
                key={femaleAnimal.animalNumber}
                className="p-2 bg-gray-50 rounded-md"
              >
                <span className="text-gray-500">Animal no encontrado</span>
              </div>
            )
          })}
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
          <span className="text-gray-600">Próximo parto esperado:</span>
          <span className="font-medium">
            {record.femaleBreedingInfo.some(
              (info) => info.pregnancyConfirmedDate && !info.actualBirthDate
            )
              ? birthInfo
                ? `${Math.abs(birthInfo.daysUntil)} días ${
                    birthInfo.daysUntil >= 0 ? 'restantes' : 'de retraso'
                  }`
                : 'Calculando...'
              : record.femaleBreedingInfo.some((info) => info.actualBirthDate)
              ? 'Todos los partos completados'
              : 'No hay embarazos confirmados'}
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

export default BreedingCard
