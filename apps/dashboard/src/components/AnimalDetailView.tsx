'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import AnimalFamilyTree from '@/components/AnimalFamilyTree'
import AnimalRecordsSection from '@/components/AnimalRecordsSection'
import Tabs from '@/components/Tabs'
import { RootState } from '@/features/store'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import {
  animal_stage_next_steps,
  animalAge,
  computeAnimalStage,
  findAnimalByRef,
  getLastWeight,
} from '@/lib/animal-utils'
import { formatDate, fromNow, toDate } from '@/lib/dates'
import {
  Animal,
  animal_gender_config,
  animal_stage_descriptions,
  animals_types_labels,
} from '@/types/animals'
import AnimalTag from './AnimalTag'
import Button from './buttons/Button'
import ButtonConfirm from './buttons/ButtonConfirm'
import { Icon } from './Icon/icon'
import ModalChangeStage from './ModalChangeStage'
import ModalEditAnimal from './ModalEditAnimal'

interface AnimalDetailViewProps {
  animal: Animal
  onDeleted?: () => void
}

/**
 * Vista detallada de un animal individual
 */
const AnimalDetailView: React.FC<AnimalDetailViewProps> = ({ animal: animalProp, onDeleted }) => {
  const { animals: allAnimals, remove, assignArea } = useAnimalCRUD()
  const animal = allAnimals.find((a) => a.id === animalProp.id) ?? animalProp
  const [changeStageOpen, setChangeStageOpen] = useState(false)
  const [isUpdatingArea, setIsUpdatingArea] = useState(false)
  const [areaError, setAreaError] = useState<string | null>(null)

  const getMother = () => findAnimalByRef(allAnimals, animal.motherId) || null
  const getFather = () => findAnimalByRef(allAnimals, animal.fatherId) || null

  const breedings = useSelector((state: RootState) => state.breeding.breedingRecords)
  const currentFarm = useSelector((state: RootState) => state.farm.currentFarm)
  const lastWeight = getLastWeight(animal)
  const mother = getMother()
  const father = getFather()
  const stageDesc = animal_stage_descriptions[animal.stage]
  const speciesInfo = stageDesc?.speciesInfo?.[animal.type]
  const effectiveStage = animal.computedStage ?? computeAnimalStage(animal)
  const nextSteps = animal_stage_next_steps[effectiveStage]?.({
    animal,
    breedings,
    animals: allAnimals,
  })
  const effectiveStatus = animal.status ?? 'activo'
  const activeAreas = (currentFarm?.areas || []).filter((area) => area.isActive)
  const currentArea = activeAreas.find((area) => area.id === animal.currentAreaId) || null

  const handleAreaChange = async (areaId: string) => {
    const nextAreaId = areaId || null
    if ((animal.currentAreaId ?? null) === nextAreaId) return

    setAreaError(null)
    setIsUpdatingArea(true)
    try {
      await assignArea(animal.id, nextAreaId)
    } catch (error) {
      console.error('Error updating animal area:', error)
      setAreaError('No se pudo actualizar el área. Intenta de nuevo.')
    } finally {
      setIsUpdatingArea(false)
    }
  }

  /** Computes age label with optional end-date context for dead/sold animals */
  const getAgeLabel = (): React.ReactNode => {
    if (animal.status === 'muerto' && animal.statusAt) {
      return (
        <>
          {animalAge(animal, { format: 'long', endDate: toDate(animal.statusAt as any) })}
          <span className="ml-1 text-xs text-gray-400">(al morir)</span>
        </>
      )
    }
    if (animal.status === 'vendido' && animal.statusAt) {
      return (
        <>
          {animalAge(animal, { format: 'long', endDate: toDate(animal.statusAt as any) })}
          <span className="ml-1 text-xs text-gray-400">(al vender)</span>
        </>
      )
    }
    return animalAge(animal, { format: 'long' })
  }

  const tabs = [
    {
      label: '📋 Información',
      content: (
        <div className="space-y-5 pb-5 pt-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            {/* Stage description */}
            {stageDesc && (
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
                  Etapa actual
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{stageDesc.description}</p>
                {speciesInfo && (
                  <p className="mt-1 text-xs leading-5 text-slate-500">{speciesInfo}</p>
                )}
              </section>
            )}

            {/* Siguientes pasos */}
            {nextSteps && nextSteps.length > 0 && (
              <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-blue-800">
                  Siguientes pasos
                </h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {nextSteps.map((step) => (
                    <li key={step.text} className="flex gap-2 text-sm leading-5 text-slate-700">
                      <span aria-hidden="true" className="mt-0.5 shrink-0 text-blue-700">
                        •
                      </span>
                      <div className="min-w-0 flex-1">
                        <span>{step.text}</span>
                        {step.detail && (
                          <span className="mt-0.5 block text-xs text-blue-800">{step.detail}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Datos section */}
          <section
            aria-labelledby="datos-heading"
            className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
          >
            <h3 id="datos-heading" className="text-sm font-bold text-slate-900">
              Datos del animal
            </h3>
            <dl className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 min-[420px]:grid-cols-2 sm:grid-cols-3">
              <InfoCell label="Especie" value={animals_types_labels[animal.type]} />
              <InfoCell
                label="Género"
                value={
                  <span
                    className={`inline-flex items-center gap-1 ${animal_gender_config[animal.gender].color}`}
                  >
                    <Icon icon={animal_gender_config[animal.gender].iconName as any} size={4} />
                    {animal_gender_config[animal.gender].label}
                  </span>
                }
              />
              <InfoCell label="Edad" value={getAgeLabel()} />
              <InfoCell
                label="Nacimiento"
                value={animal.birthDate ? formatDate(animal.birthDate) : '—'}
              />
              <InfoCell label="Raza" value={animal.breed || '—'} />
              <InfoCell
                label="Peso actual"
                value={
                  lastWeight ? (
                    <>
                      {lastWeight.kg.toFixed(1)} kg
                      <span className="ml-1 text-xs text-gray-400">
                        ({fromNow(lastWeight.date)})
                      </span>
                    </>
                  ) : (
                    '—'
                  )
                }
              />
              {animal.batch && <InfoCell label="Lote" value={animal.batch} />}
            </dl>

            {/* Ubicación física */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label
                  htmlFor={`animal-area-${animal.id}`}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                >
                  <span aria-hidden="true">📍</span>
                  Ubicación
                  {isUpdatingArea && (
                    <span aria-live="polite" className="font-normal text-slate-500">
                      Guardando…
                    </span>
                  )}
                </label>
                <div className="w-full sm:max-w-xs">
                  <select
                    id={`animal-area-${animal.id}`}
                    value={currentArea?.id || ''}
                    onChange={(event) => handleAreaChange(event.target.value)}
                    disabled={isUpdatingArea}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-200 disabled:cursor-wait disabled:bg-slate-100"
                  >
                    <option value="">Sin área asignada</option>
                    {activeAreas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                  {animal.currentAreaAssignedAt && currentArea ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Asignado desde {formatDate(animal.currentAreaAssignedAt)}
                    </p>
                  ) : null}
                </div>
              </div>
              {areaError ? (
                <p role="alert" className="mt-2 text-sm text-red-700">
                  {areaError}
                </p>
              ) : null}
            </div>
          </section>

          {/* Genealogía section */}
          <section
            aria-labelledby="genealogia-heading"
            className="rounded-2xl bg-slate-50 px-4 py-3"
          >
            <h3
              id="genealogia-heading"
              className="text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              Genealogía
            </h3>
            <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-3 min-[420px]:grid-cols-2">
              <InfoCell
                label="Madre"
                value={
                  mother ? (
                    <span className="font-medium text-gray-900">{mother.animalNumber}</span>
                  ) : (
                    '—'
                  )
                }
              />
              <InfoCell
                label="Padre"
                value={
                  father ? (
                    <span className="font-medium text-gray-900">{father.animalNumber}</span>
                  ) : (
                    '—'
                  )
                }
              />
            </dl>
          </section>

          {/* Estado adicional — vendido */}
          {effectiveStatus === 'vendido' && animal.soldInfo && (
            <section
              aria-labelledby="venta-heading"
              className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 space-y-2"
            >
              <h3
                id="venta-heading"
                className="text-xs font-semibold uppercase tracking-wider text-yellow-700"
              >
                Información de venta
              </h3>
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 min-[420px]:grid-cols-2 sm:grid-cols-3">
                <InfoCell label="Fecha" value={formatDate(animal.soldInfo.date)} muted />
                {animal.soldInfo.buyer && (
                  <InfoCell label="Comprador" value={animal.soldInfo.buyer} muted />
                )}
                {animal.soldInfo.price != null && (
                  <InfoCell
                    label="Precio"
                    value={`$${(animal.soldInfo.price / 100).toFixed(2)}`}
                    muted
                  />
                )}
                {animal.soldInfo.weight != null && (
                  <InfoCell
                    label="Peso al vender"
                    value={`${(animal.soldInfo.weight / 1000).toFixed(1)} kg`}
                    muted
                  />
                )}
              </div>
            </section>
          )}

          {/* Estado adicional — perdido */}
          {effectiveStatus === 'perdido' && animal.lostInfo && (
            <section
              aria-labelledby="perdido-heading"
              className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 space-y-2"
            >
              <h3
                id="perdido-heading"
                className="text-xs font-semibold uppercase tracking-wider text-orange-700"
              >
                Información de extravío
              </h3>
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 min-[420px]:grid-cols-2">
                <InfoCell label="Perdido el" value={formatDate(animal.lostInfo.lostAt)} muted />
                {animal.lostInfo.foundAt && (
                  <InfoCell
                    label="Encontrado el"
                    value={formatDate(animal.lostInfo.foundAt)}
                    muted
                  />
                )}
              </div>
            </section>
          )}

          {/* Estado adicional — destetado */}
          {animal.isWeaned && animal.weanedAt && (
            <section
              aria-labelledby="destete-heading"
              className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 space-y-2"
            >
              <h3
                id="destete-heading"
                className="text-xs font-semibold uppercase tracking-wider text-teal-700"
              >
                Destete
              </h3>
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 min-[420px]:grid-cols-2">
                <InfoCell label="Fecha de destete" value={formatDate(animal.weanedAt)} muted />
                {animal.weaningDestination && (
                  <InfoCell
                    label="Destino"
                    value={animal.weaningDestination === 'engorda' ? 'Engorda' : 'Reproductor'}
                    muted
                  />
                )}
              </div>
            </section>
          )}

          {/* Notas */}
          {animal.notes && (
            <section aria-labelledby="notas-heading">
              <h3
                id="notas-heading"
                className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2"
              >
                Notas
              </h3>
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {animal.notes}
                </p>
              </div>
            </section>
          )}

          {/* Footer — fechas de registro */}
          <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400">
            <span>
              <span className="font-medium text-gray-500">ID:</span>{' '}
              <span className="font-mono select-all">{animal.id}</span>
            </span>
            <span>
              <span className="font-medium text-gray-500">Registrado:</span>{' '}
              {formatDate(animal.createdAt, 'dd MMM yy')}
            </span>
            <span>
              <span className="font-medium text-gray-500">Actualizado:</span>{' '}
              {formatDate(animal.updatedAt)}
            </span>
          </div>
        </div>
      ),
    },
    {
      label: '🧬 Genética',
      content: <AnimalFamilyTree animal={animal} allAnimals={allAnimals} />,
    },
    {
      label: '📋 Registros',
      content: <AnimalRecordsSection animal={animal} />,
    },
  ]

  return (
    <div className="h-auto w-full bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-slate-50/60 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 max-w-full [&>span>span]:flex-wrap">
            <AnimalTag animal={animal} variant="header" />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Button
              size="sm"
              variant="outline"
              color="primary"
              className="col-span-2 min-h-11 w-full whitespace-nowrap sm:w-auto sm:flex-none"
              onClick={() => setChangeStageOpen(true)}
            >
              ⇄ Cambiar etapa
            </Button>
            <ModalEditAnimal animal={animal} triggerClassName="w-full sm:w-auto sm:flex-none" />
            <ButtonConfirm
              openLabel="Eliminar"
              confirmLabel="Eliminar"
              confirmText={`¿Eliminar animal ${animal.animalNumber}? Esta acción no se puede deshacer.`}
              openProps={{
                size: 'sm',
                color: 'error',
                variant: 'ghost',
                icon: 'delete',
                className: 'min-h-11 w-full whitespace-nowrap sm:w-auto',
              }}
              confirmProps={{ color: 'error' }}
              onConfirm={async () => {
                await remove(animal.id)
                onDeleted?.()
              }}
            />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 pt-3 sm:px-5">
        <Tabs tabs={tabs} tabsId={`animal-detail-${animal.id}`} />
      </div>

      <ModalChangeStage
        isOpen={changeStageOpen}
        onClose={() => setChangeStageOpen(false)}
        animals={[animal]}
        allAnimals={allAnimals}
      />
    </div>
  )
}

/** Small two-line info cell: label on top, value below */
interface InfoCellProps {
  label: string
  value: React.ReactNode
  /** Use slightly muted text styling for secondary cards */
  muted?: boolean
}

const InfoCell = ({ label, value, muted }: InfoCellProps) => (
  <div>
    <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
    <dd className={`text-sm font-medium ${muted ? 'text-gray-700' : 'text-gray-900'}`}>{value}</dd>
  </div>
)

export default AnimalDetailView
