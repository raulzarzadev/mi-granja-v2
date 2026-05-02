'use client'

import React from 'react'
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
  animal_icon,
  animal_stage_config,
  animal_stage_descriptions,
  animal_status_colors,
  animal_status_icons,
  animal_status_labels,
  animals_types_labels,
} from '@/types/animals'
import ButtonConfirm from './buttons/ButtonConfirm'
import { Icon } from './Icon/icon'
import ModalEditAnimal from './ModalEditAnimal'
import AnimalTag from './AnimalTag'

interface AnimalDetailViewProps {
  animal: Animal
  onDeleted?: () => void
}

/**
 * Vista detallada de un animal individual
 */
const AnimalDetailView: React.FC<AnimalDetailViewProps> = ({ animal: animalProp, onDeleted }) => {
  const { animals: allAnimals, remove } = useAnimalCRUD()
  const animal = allAnimals.find((a) => a.id === animalProp.id) ?? animalProp

  const getMother = () => findAnimalByRef(allAnimals, animal.motherId) || null
  const getFather = () => findAnimalByRef(allAnimals, animal.fatherId) || null

  const breedings = useSelector((state: RootState) => state.breeding.breedingRecords)
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
        <div className="space-y-4">
          {/* Stage description */}
          {stageDesc && (
            <div className="rounded-md bg-gray-50 border border-gray-100 px-3 py-2 space-y-1">
              <p className="text-sm text-gray-700 leading-relaxed break-words">
                {stageDesc.description}
              </p>
              {speciesInfo && (
                <p className="text-xs text-gray-500 leading-snug break-words">{speciesInfo}</p>
              )}
            </div>
          )}

          {/* Siguientes pasos */}
          {nextSteps && nextSteps.length > 0 && (
            <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Siguientes pasos
              </h3>
              <ul className="space-y-2">
                {nextSteps.map((step) => (
                  <li key={step.text} className="flex gap-2 text-sm text-gray-700 leading-snug">
                    <span className="text-blue-700 flex-shrink-0 mt-0.5">•</span>
                    <div className="flex-1 min-w-0 break-words">
                      <span>{step.text}</span>
                      {step.detail && (
                        <span className="block mt-0.5 text-xs text-blue-800 break-words">
                          {step.detail}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Datos section */}
          <section aria-labelledby="datos-heading">
            <h3
              id="datos-heading"
              className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2"
            >
              Datos
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
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
            </div>
          </section>

          {/* Genealogía section */}
          <section aria-labelledby="genealogia-heading">
            <h3
              id="genealogia-heading"
              className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2"
            >
              Genealogía
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
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
            </div>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
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
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
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
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
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

  const stageCfg = animal_stage_config[animal.computedStage ?? computeAnimalStage(animal)]
  const genderCfg = animal_gender_config[animal.gender]

  return (
    <div className="bg-white w-full h-auto">
      {/* Header */}
      <div className="px-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between gap-3">
          <AnimalTag animal={animal} variant="header" />

          <div className="flex items-center gap-2">
            <ModalEditAnimal animal={animal} />
            <ButtonConfirm
              openLabel="Eliminar"
              confirmLabel="Eliminar"
              confirmText={`¿Eliminar animal ${animal.animalNumber}? Esta acción no se puede deshacer.`}
              openProps={{ size: 'sm', color: 'error', variant: 'outline', icon: 'delete' }}
              confirmProps={{ color: 'error' }}
              onConfirm={async () => {
                await remove(animal.id)
                onDeleted?.()
              }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} tabsId={`animal-detail-${animal.id}`} />
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
