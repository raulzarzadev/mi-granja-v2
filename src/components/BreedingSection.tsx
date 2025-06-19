'use client'

import React, { useState } from 'react'
import { useAnimals } from '@/hooks/useAnimals'
import { useBreeding } from '@/hooks/useBreeding'
import { BreedingRecord } from '@/types'
import BreedingCard from '@/components/BreedingCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import ModalBreedingForm from './ModalBreedingForm'

/**
 * Sección de reproducción del dashboard
 */
const BreedingSection: React.FC = () => {
  const { animals } = useAnimals()
  const {
    breedingRecords,
    isLoading,
    isSubmitting,
    createBreedingRecord,
    getActivePregnancies,
    getUpcomingBirths,
    getStats
  } = useBreeding()

  const [filter, setFilter] = useState<'all' | 'pregnant' | 'upcoming'>('all')

  const stats = getStats()
  const activePregnancies = getActivePregnancies()
  const upcomingBirths = getUpcomingBirths()

  const getFilteredRecords = () => {
    switch (filter) {
      case 'pregnant':
        return activePregnancies
      case 'upcoming':
        return upcomingBirths
      default:
        return breedingRecords
    }
  }

  const handleCreateBreeding = async (
    data: Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      await createBreedingRecord(data)
    } catch (error) {
      console.error('Error creating breeding record:', error)
    }
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Reproducción</h2>
          <ModalBreedingForm
            animals={animals}
            onSubmit={async (data) => {
              await handleCreateBreeding(data)
            }}
            isLoading={isSubmitting}
            triggerButton={
              <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium">
                + Registrar Monta
              </button>
            }
          />
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🐣</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  Total Montas
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {stats.totalBreedings}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🤰</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Embarazadas</p>
                <p className="text-xl font-bold text-blue-600">
                  {stats.activePregnancies}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🗓️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  Partos Próximos
                </p>
                <p className="text-xl font-bold text-yellow-600">
                  {stats.upcomingBirths}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🐾</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Crías</p>
                <p className="text-xl font-bold text-green-600">
                  {stats.totalOffspring}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h3 className="text-lg font-medium text-gray-900">Registros</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos ({breedingRecords.length})
            </button>
            <button
              onClick={() => setFilter('pregnant')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === 'pregnant'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Embarazadas ({activePregnancies.length})
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === 'upcoming'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Próximos Partos ({upcomingBirths.length})
            </button>
          </div>
        </div>
      </div>

      {/* Lista de registros */}
      <div className="bg-white rounded-lg shadow p-6">
        {getFilteredRecords().length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🐣</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all'
                ? 'No hay registros de reproducción'
                : filter === 'pregnant'
                ? 'No hay animales embarazados'
                : 'No hay partos próximos'}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? 'Comienza registrando tu primera monta'
                : 'Cambia el filtro para ver otros registros'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredRecords().map((record) => (
              <BreedingCard
                key={record.id}
                record={record}
                animals={animals}
                onEdit={(record) => {
                  // TODO: Implementar edición
                  console.log('Editar registro:', record.id)
                }}
                onAddBirth={(record) => {
                  // TODO: Implementar registro de parto
                  console.log('Registrar parto:', record.id)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de formulario */}
    </div>
  )
}

export default BreedingSection
