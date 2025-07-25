'use client'

import React, { useState } from 'react'
import ModalEditAnimal from './ModalEditAnimal'
import { BreedingRecord } from '@/types/breedings'
import { Animal } from '@/types/animals'
import { MilkProduction, WeightRecord } from '@/types'
import { useAnimals } from '@/hooks/useAnimals'
import { useBreeding } from '@/hooks/useBreeding'
import { formatDate } from '@/lib/dates'

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
  milkRecords = []
}) => {
  const { animals: allAnimals } = useAnimals()
  const { breedingRecords } = useBreeding()
  const [activeTab, setActiveTab] = useState<
    'info' | 'breeding' | 'weight' | 'milk'
  >('info')

  const getAge = () => {
    if (!animal.birthDate)
      return animal.age ? `${animal.age} meses (aprox.)` : 'No registrado'

    const birth = new Date(animal.birthDate)
    const today = new Date()
    const diffMonths =
      (today.getFullYear() - birth.getFullYear()) * 12 +
      (today.getMonth() - birth.getMonth())

    if (diffMonths < 12) {
      return `${diffMonths} meses`
    } else {
      const years = Math.floor(diffMonths / 12)
      const months = diffMonths % 12
      return `${years} año${years !== 1 ? 's' : ''} ${
        months > 0 ? `y ${months} meses` : ''
      }`
    }
  }

  const getMother = () => {
    if (!animal.motherId) return null
    return allAnimals.find((a) => a.id === animal.motherId)
  }

  const getFather = () => {
    if (!animal.fatherId) return null
    return allAnimals.find((a) => a.id === animal.fatherId)
  }

  const getOffspring = () => {
    return allAnimals.filter(
      (a) => a.motherId === animal.id || a.fatherId === animal.id
    )
  }

  const getAnimalIcon = (type: string) => {
    switch (type) {
      case 'oveja':
        return '🐑'
      case 'vaca_leche':
      case 'vaca_engorda':
        return '🐄'
      case 'cabra':
        return '🐐'
      case 'cerdo':
        return '🐷'
      default:
        return '🐾'
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'cria':
        return 'bg-yellow-100 text-yellow-800'
      case 'engorda':
        return 'bg-orange-100 text-orange-800'
      case 'lechera':
        return 'bg-blue-100 text-blue-800'
      case 'reproductor':
        return 'bg-purple-100 text-purple-800'
      case 'descarte':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const tabs = [
    { id: 'info' as const, label: 'Información General', icon: '📋' },
    { id: 'breeding' as const, label: 'Reproducción', icon: '🐣' },
    { id: 'weight' as const, label: 'Peso', icon: '⚖️' },
    { id: 'milk' as const, label: 'Leche', icon: '🥛' }
  ]

  return (
    <div>
      <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-green-600 text-white p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{getAnimalIcon(animal.type)}</span>
              <div>
                <h1 className="text-2xl font-bold">{animal.animalNumber}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-green-100">
                    {animal.type.replace('_', ' ')}{' '}
                    {animal.gender === 'macho' ? '♂' : '♀'}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(
                      animal.stage
                    )} bg-opacity-20 text-white`}
                  >
                    {animal.stage}
                  </span>
                </div>
              </div>
              <div>
                <ModalEditAnimal animal={animal} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Datos Básicos
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Edad
                      </label>
                      <p className="text-gray-900">{getAge()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Fecha de Nacimiento
                      </label>
                      <p className="text-gray-900">
                        {animal.birthDate
                          ? formatDate(animal.birthDate)
                          : 'No registrado'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Peso Actual
                      </label>
                      <p className="text-gray-900">
                        {animal.weight
                          ? `${animal.weight} kg`
                          : 'No registrado'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Genealogía
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Madre
                      </label>
                      <p className="text-gray-900">
                        {getMother()?.animalNumber || 'No registrado'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Padre
                      </label>
                      <p className="text-gray-900">
                        {getFather()?.animalNumber || 'No registrado'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Descendencia
                      </label>
                      <div className="text-gray-900">
                        {getOffspring().length === 0 ? (
                          'Sin descendencia registrada'
                        ) : (
                          <div>
                            <p className="font-medium mb-2">
                              {getOffspring().length} animal
                              {getOffspring().length !== 1 ? 'es' : ''}:
                            </p>
                            <div className="space-y-1">
                              {getOffspring().map((offspring) => (
                                <div
                                  key={offspring.id}
                                  className="flex items-center gap-2 text-sm bg-gray-50 rounded px-2 py-1"
                                >
                                  <span>{getAnimalIcon(offspring.type)}</span>
                                  <span className="font-medium">
                                    {offspring.animalNumber}
                                  </span>
                                  <span className="text-gray-500">
                                    ({offspring.gender === 'macho' ? '♂' : '♀'})
                                  </span>
                                  <span className="text-gray-400 text-xs">
                                    {offspring.birthDate
                                      ? formatDate(offspring.birthDate)
                                      : 'Sin fecha'}
                                  </span>
                                </div>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Notas
                  </h3>
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
                    <span className="font-medium">Actualizado:</span>{' '}
                    {formatDate(animal.updatedAt)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'breeding' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Historial Reproductivo
              </h3>
              {breedingRecords.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl mb-4 block">🐣</span>
                  <p className="text-gray-500">
                    No hay registros reproductivos
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {breedingRecords.map((record) => (
                    <div key={record.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          Monta del{' '}
                          {record.breedingDate
                            ? formatDate(record.breedingDate)
                            : ''}
                        </span>
                        {/* TODO: breedig state */}
                      </div>
                      {/*TODO:Show springof and more details */}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'weight' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Historial de Peso
              </h3>
              {weightRecords.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl mb-4 block">⚖️</span>
                  <p className="text-gray-500">No hay registros de peso</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {weightRecords.map((record) => (
                    <div key={record.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">
                          {record.weight} kg
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(record.date)}
                        </span>
                      </div>
                      {record.notes && (
                        <p className="text-sm text-gray-600 mt-2">
                          {record.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'milk' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Producción de Leche
              </h3>
              {animal.stage !== 'lechera' ? (
                <div className="text-center py-8">
                  <span className="text-4xl mb-4 block">🥛</span>
                  <p className="text-gray-500">
                    Este animal no está en etapa de producción lechera
                  </p>
                </div>
              ) : milkRecords.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl mb-4 block">🥛</span>
                  <p className="text-gray-500">
                    No hay registros de producción
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {milkRecords.map((record) => (
                    <div key={record.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900">
                          {record.totalAmount} L
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(record.date)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Mañana: {record.morningAmount}L | Tarde:{' '}
                        {record.eveningAmount}L
                      </div>
                      {record.notes && (
                        <p className="text-sm text-gray-600 mt-2">
                          {record.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnimalDetailView
