'use client'

import React from 'react'
import AnimalRecordsSection from '@/components/AnimalRecordsSection'
import AnimalTag from '@/components/AnimalTag'
import Tabs from '@/components/Tabs'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import { animalAge, formatWeight } from '@/lib/animal-utils'
import { formatDate } from '@/lib/dates'
import { MilkProduction, WeightRecord } from '@/types'
import {
  Animal,
  AnimalType,
  animal_icon,
  animal_status_colors,
  animal_status_labels,
} from '@/types/animals'
import { BreedingRecord } from '@/types/breedings'
import { AnimalDetailRow } from './AnimalCard'
import ButtonConfirm from './buttons/ButtonConfirm'
import ModalEditAnimal from './ModalEditAnimal'

interface AnimalDetailViewProps {
  animal: Animal
  breedingRecords?: BreedingRecord[]
  weightRecords?: WeightRecord[]
  milkRecords?: MilkProduction[]
}

/**
 * Vista detallada de un animal individual
 */
const AnimalDetailView: React.FC<AnimalDetailViewProps> = ({
  animal,
  weightRecords = [],
  milkRecords = [],
}) => {
  const { animals: allAnimals } = useAnimalCRUD()
  const { breedingRecords: allBreedingRecords } = useBreedingCRUD()

  const { remove: deleteAnimal, markStatus, markFound } = useAnimalCRUD()

  const breedingRecords = allBreedingRecords.filter(
    (record) =>
      record.femaleBreedingInfo?.find((female) => female.femaleId === animal.id) ||
      record.maleId === animal.id,
  )

  const getMother = () => {
    if (!animal.motherId) return null
    return allAnimals.find((a) => a.id === animal.motherId || a.animalNumber === animal.motherId)
  }

  const getFather = () => {
    if (!animal.fatherId) return null
    return allAnimals.find((a) => a.id === animal.fatherId || a.animalNumber === animal.fatherId)
  }

  const getOffspring = () => {
    return allAnimals.filter(
      (a) => a.motherId === animal.id || a.fatherId === animal.id ||
             a.motherId === animal.animalNumber || a.fatherId === animal.animalNumber,
    )
  }

  const getAnimalIcon = (type: AnimalType) => {
    return animal_icon[type] || '🐾'
  }

  const tabs = [
    {
      label: '📋 Información',
      content: (
        <div className="space-y-2">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Datos Básicos</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-500">Edad</label>
                  {animal.status === 'muerto' && animal.statusAt ? (
                    <p className="text-gray-900">
                      {animalAge(animal, { format: 'long', endDate: new Date(animal.statusAt as any) })}
                      <span className="ml-1" title="Edad al morir">💀</span>
                    </p>
                  ) : animal.status === 'vendido' && animal.statusAt ? (
                    <p className="text-gray-900">
                      {animalAge(animal, { format: 'long', endDate: new Date(animal.statusAt as any) })}
                      <span className="ml-1 text-xs text-gray-400">(al vender)</span>
                    </p>
                  ) : (
                    <p className="text-gray-900">{animalAge(animal, { format: 'long' })}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Raza</label>
                  <p className="text-gray-900">{animal.breed || ''}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Fecha de Nacimiento</label>
                  <p className="text-gray-900">
                    {animal.birthDate ? formatDate(animal.birthDate) : 'No registrado'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Peso Actual</label>
                  <p className="text-gray-900">
                    {formatWeight(animal.weight) ? `${formatWeight(animal.weight)} kg` : 'No registrado'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Genealogía</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-500">Madre</label>
                  <p className="text-gray-900">{getMother()?.animalNumber || 'No registrado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Padre</label>
                  <p className="text-gray-900">{getFather()?.animalNumber || 'No registrado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Descendencia</label>
                  <div className="text-gray-900">
                    {getOffspring().length === 0 ? (
                      'Sin descendencia registrada'
                    ) : (
                      <div>
                        <p className="font-medium mb-2">
                          {getOffspring().length} animal
                          {getOffspring().length !== 1 ? 'es' : ''}:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {getOffspring().map((offspring) => (
                            <AnimalTag key={offspring.id} animal={offspring} showAge />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notas */}
          {animal.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Notas</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">{animal.notes}</p>
              </div>
            </div>
          )}

          {/* Fechas de registro */}
          <div className="pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
              <div>
                <span className="font-medium">Registrado:</span>{' '}
                {formatDate(animal.createdAt, 'dd MMM yy')}
              </div>
              <div>
                <span className="font-medium">Actualizado:</span> {formatDate(animal.updatedAt)}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: '🐣 Reproducción',
      content: (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial Reproductivo</h3>
          {breedingRecords.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">🐣</span>
              <p className="text-gray-500">No hay registros reproductivos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {breedingRecords.map((record) => (
                <div key={record.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      Monta del {record.breedingDate ? formatDate(record.breedingDate) : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      label: '⚖️ Peso',
      content: (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial de Peso</h3>
          {weightRecords.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">⚖️</span>
              <p className="text-gray-500">No hay registros de peso</p>
            </div>
          ) : (
            <div className="space-y-2">
              {weightRecords.map((record) => (
                <div key={record.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{formatWeight(record.weight) ?? record.weight} kg</span>
                    <span className="text-sm text-gray-500">{formatDate(record.date)}</span>
                  </div>
                  {record.notes && <p className="text-sm text-gray-600 mt-2">{record.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      label: '🥛 Leche',
      content: (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Producción de Leche</h3>
          {animal.stage !== 'lechera' ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">🥛</span>
              <p className="text-gray-500">Este animal no está en etapa de producción lechera</p>
            </div>
          ) : milkRecords.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">🥛</span>
              <p className="text-gray-500">No hay registros de producción</p>
            </div>
          ) : (
            <div className="space-y-2">
              {milkRecords.map((record) => (
                <div key={record.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">{record.totalAmount} L</span>
                    <span className="text-sm text-gray-500">{formatDate(record.date)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Mañana: {record.morningAmount}L | Tarde: {record.eveningAmount}L
                  </div>
                  {record.notes && <p className="text-sm text-gray-600 mt-2">{record.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      label: '📋 Registros',
      content: <AnimalRecordsSection animal={animal} />,
    },
    {
      label: '⚙️ Configuración',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">Configuración</h3>
          <div className="flex flex-wrap gap-2 items-center">
            <ModalEditAnimal animal={animal} />
            <button
              className="px-3 py-1 text-sm rounded bg-yellow-100 text-yellow-800 border border-yellow-200"
              onClick={() =>
                markStatus(animal.id, {
                  status: 'vendido',
                  statusNotes: 'Marcado desde configuración',
                })
              }
            >
              Marcar vendido
            </button>
            <button
              className="px-3 py-1 text-sm rounded bg-gray-200 text-gray-800 border border-gray-300"
              onClick={() =>
                markStatus(animal.id, {
                  status: 'muerto',
                  statusNotes: 'Marcado desde configuración',
                })
              }
            >
              Marcar muerto
            </button>
            {animal.status === 'perdido' ? (
              <button
                className="px-3 py-1 text-sm rounded bg-green-100 text-green-800 border border-green-200"
                onClick={() => markFound(animal.id)}
              >
                Marcar encontrado
              </button>
            ) : (
              <button
                className="px-3 py-1 text-sm rounded bg-red-100 text-red-800 border border-red-200"
                onClick={() =>
                  markStatus(animal.id, {
                    status: 'perdido',
                    statusNotes: 'Marcado desde configuración',
                    lostInfo: { lostAt: new Date() },
                  })
                }
              >
                Marcar perdido
              </button>
            )}
            <ButtonConfirm
              openLabel="Eliminar animal"
              confirmLabel="Eliminar"
              confirmText="¿Estás seguro de que quieres eliminar este animal? Esta acción no se puede deshacer."
              onConfirm={() => deleteAnimal(animal.id)}
              confirmProps={{ color: 'error', icon: 'delete', size: 'sm' }}
              openProps={{
                color: 'error',
                variant: 'ghost',
                icon: 'delete',
                size: 'sm',
              }}
            />
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="bg-white w-full h-auto">
      {/* Header */}
      <div className="bg-green-600 text-white p-2 mb-2">
        <div className="flex items-center justify-between">
          <AnimalDetailRow animal={animal} />
        </div>
      </div>

      {/* Tabs (componente compartido) */}
      <Tabs tabs={tabs} tabsId={`animal-detail-${animal.id}`} />
    </div>
  )
}

export default AnimalDetailView
