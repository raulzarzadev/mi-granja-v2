'use client'

import React from 'react'
import AnimalFamilyTree from '@/components/AnimalFamilyTree'
import AnimalRecordsSection from '@/components/AnimalRecordsSection'
import Tabs from '@/components/Tabs'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { animalAge, formatWeight } from '@/lib/animal-utils'
import { formatDate } from '@/lib/dates'
import {
  Animal,
  AnimalType,
  animal_icon,
  animal_status_colors,
  animal_status_labels,
} from '@/types/animals'
import { AnimalDetailRow } from './AnimalCard'
import ButtonConfirm from './buttons/ButtonConfirm'
import ModalEditAnimal from './ModalEditAnimal'

interface AnimalDetailViewProps {
  animal: Animal
}

/**
 * Vista detallada de un animal individual
 */
const AnimalDetailView: React.FC<AnimalDetailViewProps> = ({ animal }) => {
  const { animals: allAnimals, remove: deleteAnimal, markStatus, markFound } = useAnimalCRUD()

  const getMother = () => {
    if (!animal.motherId) return null
    return allAnimals.find((a) => a.id === animal.motherId || a.animalNumber === animal.motherId)
  }

  const getFather = () => {
    if (!animal.fatherId) return null
    return allAnimals.find((a) => a.id === animal.fatherId || a.animalNumber === animal.fatherId)
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
                      {animalAge(animal, {
                        format: 'long',
                        endDate: new Date(animal.statusAt as any),
                      })}
                      <span className="ml-1" title="Edad al morir">
                        💀
                      </span>
                    </p>
                  ) : animal.status === 'vendido' && animal.statusAt ? (
                    <p className="text-gray-900">
                      {animalAge(animal, {
                        format: 'long',
                        endDate: new Date(animal.statusAt as any),
                      })}
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
                  {(() => {
                    // Buscar último registro de peso en records[] y weightRecords[]
                    const weightFromRecords = [...(animal.records || [])]
                      .filter((r) => r.type === 'weight')
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

                    const weightFromEntries = [...(animal.weightRecords || [])].sort(
                      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
                    )[0]

                    // Elegir el más reciente
                    let lastWeight: { kg: number; date: Date } | null = null

                    if (weightFromRecords && weightFromEntries) {
                      const rDate = new Date(weightFromRecords.date).getTime()
                      const eDate = new Date(weightFromEntries.date).getTime()
                      if (rDate >= eDate) {
                        const match = weightFromRecords.title.match(/^([\d.]+)/)
                        if (match)
                          lastWeight = {
                            kg: parseFloat(match[1]),
                            date: new Date(weightFromRecords.date),
                          }
                      } else {
                        lastWeight = {
                          kg: weightFromEntries.weight / 1000,
                          date: new Date(weightFromEntries.date),
                        }
                      }
                    } else if (weightFromRecords) {
                      const match = weightFromRecords.title.match(/^([\d.]+)/)
                      if (match)
                        lastWeight = {
                          kg: parseFloat(match[1]),
                          date: new Date(weightFromRecords.date),
                        }
                    } else if (weightFromEntries) {
                      lastWeight = {
                        kg: weightFromEntries.weight / 1000,
                        date: new Date(weightFromEntries.date),
                      }
                    }

                    if (!lastWeight) {
                      return <p className="text-gray-900">No registrado</p>
                    }

                    const now = new Date()
                    const diffMs = now.getTime() - lastWeight.date.getTime()
                    const diffDays = Math.floor(diffMs / 86400000)
                    let timeAgo = ''
                    if (diffDays === 0) timeAgo = 'hoy'
                    else if (diffDays === 1) timeAgo = 'ayer'
                    else if (diffDays < 30) timeAgo = `hace ${diffDays}d`
                    else if (diffDays < 365) timeAgo = `hace ${Math.floor(diffDays / 30)}m`
                    else timeAgo = `hace ${Math.floor(diffDays / 365)}a`

                    return (
                      <p className="text-gray-900">
                        {lastWeight.kg.toFixed(1)} kg
                        <span className="text-xs text-gray-400 ml-1">({timeAgo})</span>
                      </p>
                    )
                  })()}
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
      label: '🧬 Genética',
      content: <AnimalFamilyTree animal={animal} allAnimals={allAnimals} />,
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
