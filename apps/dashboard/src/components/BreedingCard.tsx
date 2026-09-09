'use client'

import React, { useEffect } from 'react'
import { useAppFeedback } from '@/components/AppFeedbackProvider'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import { calculateExpectedBirthDate } from '@/lib/animalBreedingConfig'
import catchError from '@/lib/catchError'
import { formatDate, fromNow } from '@/lib/dates'
import { estimateOffspringInbreeding } from '@/lib/inbreeding'
import { Animal } from '@/types/animals'
import { BreedingRecord } from '@/types/breedings'
import { NewCommentInput } from '@/types/comment'
import { BreedingActionHandlers } from '@/types/components/breeding'
import AnimalBadges from './AnimalBadges'
import { BadgeAnimalStatus } from './Badges/BadgeAnimalStatus'
import { Comments } from './comments/modal-comments'
import {
  type FemaleBreedingStatus,
  getFemaleBreedingStatus,
} from './Dashboard/Animals/helpers/breedingViewHelpers'
import { Icon } from './Icon/icon'
import { InbreedingIndex } from './InbreedingIndex'
import ModalAnimalDetails from './ModalAnimalDetails'
import ModalBreedingAnimalDetails from './ModalBreedingAnimalDetails'
import { PersistentVerticalScrollArea } from './PersistentVerticalScrollArea'

interface BreedingCardProps extends BreedingActionHandlers {
  record: BreedingRecord
  animals: Animal[]
  onEdit?: (record: BreedingRecord) => void
  onFinish?: (record: BreedingRecord) => void | Promise<void>
  onDelete?: (record: BreedingRecord) => void
}

/**
 * Tarjeta para mostrar un registro de reproducción
 */
const BreedingCard: React.FC<BreedingCardProps> = ({
  record,
  animals,
  onEdit,
  onFinish,
  onAddBirth,
  onDelete,
  onConfirmPregnancy,
  onUnconfirmPregnancy,
  onAbort,
  onRemoveFromBreeding,
  onDeleteBirth,
}) => {
  const { confirmAction } = useAppFeedback()
  const { onAddComment, handleUpdateCommentUrgency } = useBreedingCRUD()
  // Manejar múltiples hembras
  const male = animals.find((a) => a.id === record.maleId)

  const animalsType = male?.type
  const handleDelete = async () => {
    const confirmed = await confirmAction({
      title: 'Eliminar empadre',
      message:
        '¿Estás seguro de que quieres eliminar este registro de empadre? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true,
    })
    if (confirmed) onDelete?.(record)
  }

  const handleFinish = async () => {
    const confirmed = await confirmAction({
      title: 'Terminar empadre',
      message:
        'Las hembras sin gestación confirmada y el macho regresarán al estado de reproducción. Las gestaciones confirmadas se conservarán.',
      confirmLabel: 'Terminar empadre',
    })
    if (confirmed) await onFinish?.(record)
  }
  const [recordComments, setRecordComments] = React.useState(record.comments || [])

  useEffect(() => {
    setRecordComments(record.comments || [])
  }, [record.comments])

  const handleAddComment = async (comment: NewCommentInput) => {
    const [error, data] = await catchError(onAddComment(record.id, comment))
    if (error) console.error(error)
    if (data) {
      console.log('message_added')
    }
    return data ?? undefined
  }

  const getFemaleStatuses = () => {
    //TODO: los estados son , Empadre en proceso, no. de partos, no. de gestaciones confirmadas,
    // algo asi Empadre en proceso. Partos:2 Gestaciones:3 Pendientes: 1
    const births = record.femaleBreedingInfo.filter((info) => info.actualBirthDate).length
    const pregnancies = record.femaleBreedingInfo.filter(
      (info) => getFemaleBreedingStatus(info, animals, record) === 'embarazada',
    ).length
    const pregnantInOtherBreeding = record.femaleBreedingInfo.filter(
      (info) => getFemaleBreedingStatus(info, animals, record) === 'embarazada_otra_monta',
    ).length
    const pending = record.femaleBreedingInfo.filter(
      (info) => getFemaleBreedingStatus(info, animals, record) === 'empadre',
    ).length
    const open = record.femaleBreedingInfo.filter((info) => info.outcome === 'open').length
    const aborted = record.femaleBreedingInfo.filter((info) => info.outcome === 'aborted').length

    return {
      births,
      pregnancies,
      pregnantInOtherBreeding,
      pending,
      open,
      aborted,
    }
  }

  const getStatusColor = (statuses: ReturnType<typeof getFemaleStatuses>) => {
    if (statuses.pending > 0) return 'bg-yellow-100 text-yellow-800' // Empadres pendientes
    if (statuses.pregnancies > 0) return 'bg-blue-100 text-blue-800' // Gestaciones
    if (statuses.pregnantInOtherBreeding > 0) return 'bg-orange-100 text-orange-800'
    if (statuses.births > 0) return 'bg-green-100 text-green-800' // Partos
    if (statuses.open > 0) return 'bg-red-100 text-red-800' // Sin gestación confirmada
    if (statuses.aborted > 0) return 'bg-red-100 text-red-800'
  }

  const femaleStatuses = getFemaleStatuses()
  const femalesBreedingInfo =
    record?.femaleBreedingInfo.map((info) => {
      const animalInfo = animals.find((a) => info.femaleId === a.id)

      // Determinar el estado real usando la gestación guardada en el animal.
      const status: FemaleBreedingStatus = getFemaleBreedingStatus(info, animals, record)
      const pregnancyDate =
        status === 'embarazada' || status === 'embarazada_otra_monta'
          ? animalInfo?.pregnantAt || info.pregnancyConfirmedDate
          : null

      const expectedBirthDate = () => {
        // Priorizar el tipo de la hembra; si no, usar el del macho
        const typeForCalc = animalInfo?.type || animalsType
        if (!typeForCalc) return null

        // si ya parió, no hay fecha probable
        if (info.actualBirthDate) return null

        // si hay gestación confirmada, calcular desde esa fecha
        if (pregnancyDate) {
          const res = calculateExpectedBirthDate(pregnancyDate, typeForCalc)
          return res
        }

        // si no hay confirmación, opcionalmente usar la fecha de empadre
        if (record.breedingDate) return calculateExpectedBirthDate(record.breedingDate, typeForCalc)

        return null
      }
      const expected = expectedBirthDate()
      return {
        animalId: animalInfo?.id || info.femaleId, // Número del animal para mostrar al usuario
        animalNumber: animalInfo?.animalNumber,
        type: animalInfo?.type,
        pregnancyConfirmedDate: pregnancyDate || null,
        expectedBirthDate: expected,
        actualBirthDate: info.actualBirthDate || null,
        offspring: info.offspring ?? [],
        status,
        inbreedingEstimate:
          animalInfo && male ? estimateOffspringInbreeding(animalInfo, male, animals) : undefined,
      }
    }) || []

  const offspring = record.femaleBreedingInfo.flatMap((info) => info.offspring || [])

  // Orden de hembras:
  // 1) En empadre (pendiente de confirmación)
  // 2) Gestantes con fecha probable de parto vencida
  // 3) Gestantes con fecha probable futura (más próximas primero)
  // 4) Gestantes en otra monta
  // 5) Al final, las que ya han parido (más reciente primero)
  const sortedFemales = React.useMemo(() => {
    const now = Date.now()

    const getGroup = (f: (typeof femalesBreedingInfo)[number]) => {
      if (f.status === 'empadre') return 0
      if (f.status === 'embarazada') {
        if (f.expectedBirthDate && f.expectedBirthDate.getTime() < now) {
          return 1 // vencida
        }
        return 2 // próxima
      }
      if (f.status === 'embarazada_otra_monta') return 3
      if (f.status === 'abortada') return 4
      return 5 // parida
    }

    const getAnimalNumber = (f: (typeof femalesBreedingInfo)[number]) =>
      String(f.animalNumber ?? '')

    return [...femalesBreedingInfo].sort((a, b) => {
      const ga = getGroup(a)
      const gb = getGroup(b)
      if (ga !== gb) return ga - gb

      // Dentro del mismo grupo, ordenar por criterio específico
      switch (ga) {
        case 0: // empadre: por número de animal asc para estabilidad
          return getAnimalNumber(a).localeCompare(getAnimalNumber(b), 'es', {
            numeric: true,
          })
        case 1: // gestante vencida: más vencida primero (fecha más antigua)
          if (a.expectedBirthDate && b.expectedBirthDate) {
            return a.expectedBirthDate.getTime() - b.expectedBirthDate.getTime()
          }
          if (a.expectedBirthDate) return -1
          if (b.expectedBirthDate) return 1
          return 0
        case 2: // gestante próxima: más cercana primero (fecha ascendente)
          if (a.expectedBirthDate && b.expectedBirthDate) {
            return a.expectedBirthDate.getTime() - b.expectedBirthDate.getTime()
          }
          if (a.expectedBirthDate) return -1
          if (b.expectedBirthDate) return 1
          return 0
        case 3: // gestante en otra monta: más próxima primero
          if (a.expectedBirthDate && b.expectedBirthDate) {
            return a.expectedBirthDate.getTime() - b.expectedBirthDate.getTime()
          }
          if (a.expectedBirthDate) return -1
          if (b.expectedBirthDate) return 1
          return 0
        case 4: // parida: más reciente primero (fecha desc)
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

  const renderActionMenu = () => {
    const canFinish = Boolean(onFinish && record.status !== 'finished')
    if (!onEdit && !canFinish && !onDelete) {
      return null
    }

    return (
      <details className="relative">
        <summary className="list-none cursor-pointer p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200">
          <span className="sr-only">Abrir acciones</span>
          <Icon icon="more" className="w-5 h-5 text-gray-500" />
        </summary>
        <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <ul className="py-1 text-sm text-gray-700">
            {onEdit ? (
              <li>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
                  onClick={(event) => {
                    onEdit?.(record)
                    event.currentTarget.closest('details')?.removeAttribute('open')
                  }}
                >
                  <Icon icon="edit" className="w-4 h-4 text-gray-500" />
                  Editar
                </button>
              </li>
            ) : null}
            {canFinish ? (
              <li>
                <button
                  type="button"
                  aria-label="Terminar empadre"
                  className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-amber-700 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-600"
                  onClick={(event) => {
                    event.currentTarget.closest('details')?.removeAttribute('open')
                    void handleFinish()
                  }}
                >
                  <Icon icon="check_circle" className="h-4 w-4" />
                  Terminar
                </button>
              </li>
            ) : null}
            {onDelete ? (
              <li>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600"
                  onClick={(event) => {
                    handleDelete()
                    event.currentTarget.closest('details')?.removeAttribute('open')
                  }}
                >
                  <Icon icon="delete" className="w-4 h-4" />
                  Eliminar
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      </details>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
      {/* Header con estado */}
      {/* Fechas e ID */}

      <div className="space-y-1 text-sm">
        <div className="grid grid-cols-3 items-center">
          <div>
            <span className="text-gray-600 "></span>
            <span className="font-medium">
              {record.breedingDate
                ? formatDate(record.breedingDate, 'EEE dd MMM yy')
                : 'No disponible'}
            </span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="text-gray-600">
              <span className="font-medium"></span>{' '}
              <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                {record.breedingId || 'Sin ID'}
              </span>
            </div>
          </div>
          <div className="flex justify-end">{renderActionMenu()}</div>
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(femaleStatuses)}`}
        >
          {femaleStatuses.births > 0 && (
            <span className="text-green-600">
              <Icon icon="baby" className="inline mr-1" />
              {femaleStatuses.births} parto
              {femaleStatuses.births !== 1 ? 's' : ''} ({offspring.length})
            </span>
          )}
          {femaleStatuses.pregnancies > 0 && (
            <span className="text-blue-600 ml-2">
              <Icon icon="pregnant" className="inline mr-1" />
              {femaleStatuses.pregnancies}{' '}
              {femaleStatuses.pregnancies === 1 ? 'gestación' : 'gestaciones'}
            </span>
          )}
          {femaleStatuses.pregnantInOtherBreeding > 0 && (
            <span className="text-orange-600 ml-2">
              <Icon icon="pregnant" className="inline mr-1" />
              {femaleStatuses.pregnantInOtherBreeding} gestante
              {femaleStatuses.pregnantInOtherBreeding !== 1 ? 's' : ''} en otra monta
            </span>
          )}
          {femaleStatuses.pending > 0 && (
            <span className="text-yellow-600 ml-2">
              <Icon icon="bed" className="inline mr-1" />
              {femaleStatuses.pending} empadre pendiente
              {femaleStatuses.pending !== 1 ? 's' : ''}
            </span>
          )}
          {femaleStatuses.open > 0 && (
            <span className="text-red-600 ml-2">
              ⚠️ {femaleStatuses.open} sin gestación confirmada
            </span>
          )}
          {femaleStatuses.aborted > 0 && (
            <span className="text-red-600 ml-2">
              ⚠️ {femaleStatuses.aborted} aborto
              {femaleStatuses.aborted !== 1 ? 's' : ''}
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
                    <span className="font-medium text-gray-800">{male.animalNumber}</span>
                    <span className="text-xs px-2 py-1 bg-gray-200 rounded-full text-gray-600">
                      {male.type}
                    </span>
                  </div>
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
          <span className="font-medium">
            Hembras
            <span className="text-sm ">({femalesBreedingInfo.length || 0})</span>:
          </span>
        </div>
        {femalesBreedingInfo.length === 0 && (
          <p className="text-sm text-gray-500 mb-2">No hay hembras involucradas</p>
        )}
        <PersistentVerticalScrollArea ariaLabel="Hembras del empadre" className="mb-2 ml-6 h-60">
          <div className="space-y-2">
            {sortedFemales.map((femaleAnimal) => {
              const animal = animals.find((a) => a.id === femaleAnimal.animalId)
              return animal ? (
                <ModalBreedingAnimalDetails
                  key={femaleAnimal.animalId}
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
                  onAbort={onAbort}
                  triggerComponent={
                    <div className="cursor-pointer overflow-hidden rounded-md bg-gray-50 px-2 py-1.5 transition-colors hover:bg-gray-100">
                      <div className="flex min-w-0 items-start justify-between gap-1.5">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                          <span className="font-medium text-gray-800">
                            {femaleAnimal.animalNumber}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            {femaleAnimal.status === 'parida' ? (
                              <span className="rounded bg-pink-100 px-2 py-1 text-xs font-medium text-pink-800">
                                Parida
                                {femaleAnimal.actualBirthDate
                                  ? ` ${formatDate(femaleAnimal.actualBirthDate, 'dd/MM/yy')}`
                                  : ''}
                              </span>
                            ) : (
                              <BadgeAnimalStatus status={femaleAnimal.status} />
                            )}
                            {femaleAnimal.status === 'parida' ? (
                              <span className="text-xs font-semibold text-pink-700">
                                ({femaleAnimal.offspring.length})
                              </span>
                            ) : null}
                          </span>
                          {femaleAnimal.status === 'embarazada' && (
                            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                              <span className="font-medium">Parto </span>
                              {fromNow(femaleAnimal.expectedBirthDate)}
                            </span>
                          )}
                          {femaleAnimal.status === 'parida' &&
                            femaleAnimal.offspring.map((offspringId) => {
                              const offspringAnimal = animals.find(
                                (item) => item.id === offspringId,
                              )
                              return offspringAnimal ? (
                                <div key={offspringId} onClick={(event) => event.stopPropagation()}>
                                  <ModalAnimalDetails
                                    animal={offspringAnimal}
                                    triggerComponent={
                                      <AnimalBadges
                                        animal={offspringAnimal}
                                        ageFormat="rounded"
                                        variant="tag"
                                        compact
                                        showSpecies={false}
                                        showStateLabel={false}
                                      />
                                    }
                                  />
                                </div>
                              ) : (
                                <span
                                  key={offspringId}
                                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600"
                                >
                                  <strong>{offspringId}</strong>
                                </span>
                              )
                            })}
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          {femaleAnimal.inbreedingEstimate ? (
                            <InbreedingIndex estimate={femaleAnimal.inbreedingEstimate} compact />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  }
                />
              ) : (
                <AnimalNotFound
                  key={femaleAnimal.animalId || 'unknown'}
                  animalId={femaleAnimal.animalId || ''}
                  onDelete={async () => {
                    return onRemoveFromBreeding?.(record, femaleAnimal.animalId || '')
                  }}
                />
              )
            })}
          </div>
        </PersistentVerticalScrollArea>
      </div>

      <div className="space-y-3">
        <Comments
          comments={recordComments ?? []}
          handleUrgencyChange={(commentId, newLevel) => {
            handleUpdateCommentUrgency(record.id, commentId, newLevel)
          }}
          onAddComment={handleAddComment}
          title="Comentarios del empadre"
          emptyStateText="Este empadre aún no tiene comentarios registrados."
        />
      </div>
    </div>
  )
}

export const AnimalNotFound = ({
  animalId,
  onDelete,
}: {
  animalId?: string
  onDelete?: () => void | Promise<void>
}) => {
  return (
    <>
      <div key={animalId} className="p-2 bg-gray-50 rounded-md flex justify-between items-center">
        <span className="text-gray-500">Animal no encontrado</span>
        {onDelete && (
          <button
            onClick={() =>
              (
                document.getElementById(`confirm-delete-${animalId}`) as HTMLDialogElement | null
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
          <form method="dialog" className="p-4 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <h2 className="text-sm font-semibold text-gray-800">Confirmar eliminación</h2>
            <p className="text-xs text-gray-600">
              ¿Seguro que deseas eliminar esta referencia a la hembra (ID: {animalId}) del registro
              de empadre? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  (
                    document.getElementById(
                      `confirm-delete-${animalId}`,
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
                      `confirm-delete-${animalId}`,
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
