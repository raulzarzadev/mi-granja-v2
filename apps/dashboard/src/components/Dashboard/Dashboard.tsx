'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import AnimalCard from '@/components/AnimalCard'
import BreedingTabs from '@/components/BreedingTabs'
import FarmSection from '@/components/FarmSection'
import Navbar from '@/components/Navbar'
import ReminderCard from '@/components/ReminderCard'
import Tabs from '@/components/Tabs'
import { RootState } from '@/features/store'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useReminders } from '@/hooks/useReminders'
import HealthRemindersCard from '../HealthRemindersCard'
import ModalAnimalDetails from '../ModalAnimalDetails'
import ModalBulkHealthAction from '../ModalBulkHealthAction'
import RecordsTab from '../RecordsTab'
import WeaningRemindersCard from '../WeaningRemindersCard'
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
    availableStages,
    availableGenders,
  } = useAnimalFilters()

  const {
    reminders,
    isLoading: remindersLoading,
    markAsCompleted,
    deleteReminder,
    getOverdueReminders,
    getTodayReminders,
    getUpcomingReminders,
  } = useReminders()

  // Estado para selección múltiple y aplicaciones masivas
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isBulkHealthModalOpen, setIsBulkHealthModalOpen] = useState(false)

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
            availableStages={availableStages}
            availableGenders={availableGenders}
            formatStatLabel={formatStatLabel}
          />

          {/* Lista de animales */}
          <div className="bg-white rounded-lg shadow">
            {/* Barra de selección múltiple dentro del card */}
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
                </div>

                {isSelectionMode && selectedAnimals.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {selectedAnimals.length} seleccionados
                    </span>
                    <button
                      onClick={() => setIsBulkHealthModalOpen(true)}
                      className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-700 transition-colors"
                    >
                      Aplicar Registro
                    </button>
                  </div>
                )}
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
              ) : (
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
      content: (
        <div className="space-y-6">
          {/* Estadísticas de recordatorios */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">⏰</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Hoy</p>
                  <p className="text-xl font-bold text-blue-600">{getTodayReminders().length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🔔</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Próximos</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {getUpcomingReminders().length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Vencidos</p>
                  <p className="text-xl font-bold text-red-600">{getOverdueReminders().length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">📋</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total</p>
                  <p className="text-xl font-bold text-gray-900">{reminders.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recordatorios automáticos */}
          <div className="grid grid-cols-1 md:grid-cols-2  gap-4">
            {/* Recordatorios de salud */}
            <HealthRemindersCard />
            {/* Recordatorios de destete */}
            <WeaningRemindersCard />
          </div>

          {/* Lista de recordatorios manuales */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recordatorios personalizados
            </h3>
            {remindersLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="ml-3 text-gray-600">Cargando recordatorios...</span>
              </div>
            ) : reminders.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">📋</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No tienes recordatorios personalizados
                </h3>
                <p className="text-gray-600 mb-6">
                  Crea recordatorios para no olvidar tareas importantes
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Recordatorios normales */}
                {reminders.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    animals={animals}
                    onComplete={(reminder) => markAsCompleted(reminder.id)}
                    onEdit={(reminder) => {
                      // TODO: Implementar edición
                      console.log('Editar recordatorio:', reminder.id)
                    }}
                    onDelete={(reminder) => deleteReminder(reminder.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      label: '📋 Registros',
      content: <RecordsTab />,
    },
    {
      label: '🚜 Granja',
      content: <FarmSection />,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        {/* Título de la granja siempre visible */}
        {currentFarm && (
          <h1 className="text-lg font-semibold text-gray-900 mb-2">{currentFarm.name}</h1>
        )}

        {/* Si no hay granjas, priorizar creación/selección */}
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
      />
    </div>
  )
}

export default Dashboard
