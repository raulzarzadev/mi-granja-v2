'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import AnimalCard from '@/components/AnimalCard'
import BreedingTabs from '@/components/BreedingTabs'
import FarmAvatar from '@/components/FarmAvatar'
import FarmSection from '@/components/FarmSection'
import Navbar from '@/components/Navbar'
import ProfileSection from '@/components/ProfileSection'
import RemindersTab from '@/components/RemindersTab'
import Tabs from '@/components/Tabs'
import { RootState } from '@/features/store'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useReminders } from '@/hooks/useReminders'
import { AnimalType, animal_icon, animals_types_labels } from '@/types/animals'
import ModalAnimalDetails from '../ModalAnimalDetails'
import ModalBulkHealthAction from '../ModalBulkHealthAction'
import RecordsTab from '../RecordsTab'
import AnimalsTable from './Animals/AnimalsTable'
import { AnimalsFilters, useAnimalFilters } from './Animals/animals-filters'

/**
 * Dashboard principal de la aplicación
 * Muestra resumen del ganado y permite gestionar animales
 */
const Dashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const { farms, currentFarm } = useFarmCRUD()
  const { isLoading: isLoadingAnimals } = useAnimalCRUD()

  // Usar el hook personalizado para filtros de animales
  const {
    filters,
    setFilters,
    filteredAnimals,
    animals,
    formatStatLabel,
    activeFilterCount,
    availableTypes,
    availableBreeds,
    availableStages,
    availableGenders,
  } = useAnimalFilters()
  const { getOverdueReminders } = useReminders()

  // Estado para seleccion multiple y aplicaciones masivas
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isBulkHealthModalOpen, setIsBulkHealthModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  // Funciones para selección múltiple
  const toggleAnimalSelection = (animalId: string) => {
    setSelectedAnimals((prev) =>
      prev.includes(animalId) ? prev.filter((id) => id !== animalId) : [...prev, animalId],
    )
  }

  const selectAllVisibleAnimals = () => {
    const visibleIds = filteredAnimals.map((animal) => animal.id)
    setSelectedAnimals(visibleIds)
  }

  const clearSelection = () => {
    setSelectedAnimals([])
    setIsSelectionMode(false)
  }

  const getSelectedAnimalsData = () => {
    return filteredAnimals.filter((animal) => selectedAnimals.includes(animal.id))
  }

  if (!user) {
    return null
  }

  const tabs = [
    {
      label: '🐄 Animales',
      content: (
        <>
          {/* Filtros compactos */}
          <AnimalsFilters
            filters={filters}
            setFilters={setFilters}
            filteredCount={filteredAnimals.length}
            activeFilterCount={activeFilterCount}
            availableTypes={availableTypes}
            availableBreeds={availableBreeds}
            availableStages={availableStages}
            availableGenders={availableGenders}
            formatStatLabel={formatStatLabel}
          />

          {/* Lista de animales */}
          <div className="bg-white rounded-lg shadow">
            {/* Barra de selección múltiple + toggle vista */}
            {filteredAnimals.length > 0 && (
              <div className="px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!isSelectionMode ? (
                    <button
                      onClick={() => setIsSelectionMode(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Seleccionar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={selectAllVisibleAnimals}
                        className="text-xs text-green-600 hover:text-green-800 transition-colors"
                      >
                        Todos ({filteredAnimals.length})
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={clearSelection}
                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Cancelar
                      </button>
                    </>
                  )}

                  {isSelectionMode && selectedAnimals.length > 0 && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-xs text-gray-500">
                        {selectedAnimals.length} seleccionados
                      </span>
                      <button
                        onClick={() => setIsBulkHealthModalOpen(true)}
                        className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-700 transition-colors"
                      >
                        Aplicar Registro
                      </button>
                    </>
                  )}
                </div>

                {/* Toggle cards/tabla */}
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`p-1.5 transition-colors ${
                      viewMode === 'cards'
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                    title="Vista de tarjetas"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 transition-colors ${
                      viewMode === 'table'
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                    title="Vista de tabla"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M2 3.75A.75.75 0 0 1 2.75 3h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75Zm0 4.167a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.166a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.167a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            <div className="p-2 md:p-6 md:pt-2">
              {isLoadingAnimals ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <span className="ml-3 text-gray-600">Cargando animales...</span>
                </div>
              ) : filteredAnimals.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-6xl mb-4 block">🐄</span>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {animals.length === 0
                      ? 'No tienes animales registrados'
                      : 'No se encontraron animales'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {animals.length === 0
                      ? 'Comienza agregando tu primer animal a la granja'
                      : 'Intenta ajustar los filtros de búsqueda'}
                  </p>
                </div>
              ) : viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:gap-6 gap-2">
                  {filteredAnimals.map((animal) => (
                    <div key={animal.id} className="relative">
                      {/* Checkbox de selección */}
                      {isSelectionMode && (
                        <div className="absolute top-2 left-2 z-10">
                          <input
                            type="checkbox"
                            checked={selectedAnimals.includes(animal.id)}
                            onChange={() => toggleAnimalSelection(animal.id)}
                            className="w-5 h-5 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                        </div>
                      )}

                      {/* Card del animal */}
                      {isSelectionMode ? (
                        <div
                          onClick={() => toggleAnimalSelection(animal.id)}
                          className={`cursor-pointer transition-all ${
                            selectedAnimals.includes(animal.id)
                              ? 'ring-2 ring-blue-500 ring-offset-2'
                              : 'hover:shadow-lg'
                          }`}
                        >
                          <AnimalCard animal={animal} />
                        </div>
                      ) : (
                        <ModalAnimalDetails
                          animal={animal}
                          triggerComponent={<AnimalCard animal={animal} />}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <AnimalsTable
                  animals={filteredAnimals}
                  isSelectionMode={isSelectionMode}
                  selectedAnimals={selectedAnimals}
                  onToggleSelection={toggleAnimalSelection}
                />
              )}
            </div>
          </div>
        </>
      ),
    },
    {
      label: '🐣 Reproducción',
      content: <BreedingTabs />,
    },

    {
      label: '📆 Recordatorios',
      badgeCount: getOverdueReminders().length,
      content: <RemindersTab />,
    },
    {
      label: '📋 Registros',
      content: <RecordsTab />,
    },
    {
      label: '🚜 Granja',
      content: <FarmSection />,
    },
    {
      label: '👤 Perfil',
      content: <ProfileSection />,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        {/* Titulo de la granja + filtro global por tipo */}
        {currentFarm && (
          <div className="flex items-center gap-3 mb-3">
            <FarmAvatar name={currentFarm.name} photoURL={currentFarm.photoURL} size="md" />
            <h1 className="text-lg font-semibold text-gray-900">{currentFarm.name}</h1>

            {availableTypes.length > 1 && (
              <div className="flex items-center gap-2">
                {availableTypes.map((t) => {
                  const typeKey = t as AnimalType
                  const isSelected = filters.type === t
                  const hasFilter = filters.type !== ''
                  const count = animals.filter((a) => a.type === t).length
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          type: prev.type === t ? '' : (t as AnimalType),
                        }))
                      }
                      className={`relative flex items-center justify-center w-11 h-11 rounded-full text-xl transition-all duration-200 ${
                        isSelected
                          ? 'bg-green-100 ring-2 ring-green-500 shadow-sm scale-110'
                          : hasFilter
                            ? 'bg-gray-100 opacity-40 grayscale hover:opacity-70 hover:grayscale-0'
                            : 'bg-gray-100 hover:bg-green-50 hover:ring-1 hover:ring-green-300'
                      }`}
                      title={`${animals_types_labels[typeKey] || t} (${count})`}
                    >
                      {animal_icon[typeKey] || '🐾'}
                      {isSelected && (
                        <span className="absolute -bottom-1 -right-1 bg-green-600 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Si no hay granjas, priorizar creacion/seleccion */}
        {farms.length === 0 ? <FarmSection /> : <Tabs tabs={tabs} tabsId="dashboard-main" />}
      </div>

      {/* Modal de aplicación masiva de eventos de salud */}
      <ModalBulkHealthAction
        isOpen={isBulkHealthModalOpen}
        onClose={() => setIsBulkHealthModalOpen(false)}
        selectedAnimals={getSelectedAnimalsData()}
        onSuccess={() => {
          clearSelection()
          setIsBulkHealthModalOpen(false)
        }}
        onRemoveAnimal={(id) => setSelectedAnimals((prev) => prev.filter((x) => x !== id))}
      />
    </div>
  )
}

export default Dashboard
