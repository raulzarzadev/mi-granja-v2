'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import Navbar from '@/components/Navbar'
import FarmSwitcherBar from '@/components/FarmSwitcherBar'
import AnimalCard from '@/components/AnimalCard'
import BreedingTabs from '@/components/BreedingTabs'
import ReminderCard from '@/components/ReminderCard'
import FarmSection from '@/components/FarmSection'
import { useReminders } from '@/hooks/useReminders'
import ModalAnimalForm from './ModalAnimalForm'
import ModalAnimalDetails from './ModalAnimalDetails'
import ModalBulkHealthAction from './ModalBulkHealthAction'
import HealthRemindersCard from './HealthRemindersCard'
import RecordsTab from './RecordsTab'
import Tabs from '@/components/Tabs'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import {
  animal_status_labels,
  AnimalGender,
  animals_stages_labels,
  animals_types_labels,
  AnimalStage,
  AnimalStatus,
  AnimalType
} from '@/types/animals'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { setAnimals } from '@/features/animals/animalsSlice'

/**
 * Dashboard principal de la aplicación
 * Muestra resumen del ganado y permite gestionar animales
 */
const Dashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const { farms } = useFarmCRUD()
  const {
    animals,
    animalsStats,
    animalsFiltered,
    isLoading: isLoadingAnimals,
    getFarmAnimals
  } = useAnimalCRUD()
  const [_statusAnimals, setStatusAnimals] = useState<typeof animals>([])

  const {
    reminders,
    isLoading: remindersLoading,
    markAsCompleted,
    deleteReminder,
    getOverdueReminders,
    getTodayReminders,
    getUpcomingReminders
  } = useReminders()

  interface AnimalFilters {
    status: AnimalStatus
    type: AnimalType | ''
    stage: AnimalStage | ''
    gender: AnimalGender | ''
    search: string
  }

  const initialFilter: AnimalFilters = {
    status: 'activo',
    type: 'oveja',
    stage: '',
    gender: '',
    search: ''
  }

  const [filters, setFilters] = useState<AnimalFilters>(initialFilter)

  // Estado para selección múltiple y aplicaciones masivas
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isBulkHealthModalOpen, setIsBulkHealthModalOpen] = useState(false)

  // Recargar animales desde BD cuando cambia el filtro de estado (solo no-activo)
  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (filters.status !== 'activo') {
        const list = await getFarmAnimals({ status: filters.status })
        if (cancelled) return
        setAnimals(list)
        setStatusAnimals((prev) => {
          const prevIds = prev.map((a) => a.id).join(',')
          const newIds = list.map((a) => a.id).join(',')
          return prevIds === newIds ? prev : list
        })
      } else {
        setStatusAnimals((prev) => (prev.length === 0 ? prev : []))
        // Nota: los 'activos' ya se cargan por el initializer
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [filters.status])

  const _stats = animalsStats()

  const filteredAnimals = animalsFiltered(filters)

  // Funciones para selección múltiple
  const toggleAnimalSelection = (animalId: string) => {
    setSelectedAnimals((prev) =>
      prev.includes(animalId)
        ? prev.filter((id) => id !== animalId)
        : [...prev, animalId]
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
    return filteredAnimals.filter((animal) =>
      selectedAnimals.includes(animal.id)
    )
  }

  const formatStatLabel = (key: string) => {
    switch (key) {
      case 'oveja':
        return 'Ovejas'
      case 'vaca_leche':
        return 'Vacas Lecheras'
      case 'vaca_engorda':
        return 'Vacas de Engorda'
      case 'cabra':
        return 'Cabras'
      case 'cerdo':
        return 'Cerdos'
      case 'cria':
        return 'Crías'
      case 'engorda':
        return 'En Engorda'
      case 'lechera':
        return 'Lecheras'
      case 'reproductor':
        return 'Reproductores'
      case 'descarte':
        return 'Descarte'
      case 'macho':
        return 'Machos'
      case 'hembra':
        return 'Hembras'
      default:
        return key
    }
  }

  if (!user) {
    return null
  }

  const tabs = [
    {
      label: '🐄 Animales',
      content: (
        <>
          {/* Controles */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <h2 className="text-xl font-semibold text-gray-900">
                  Mis Animales
                </h2>
                <ModalAnimalForm mode="create" />
              </div>

              {/* Filtros */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label
                    htmlFor="statusFilter"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Estado
                  </label>
                  <select
                    id="statusFilter"
                    value={filters.status}
                    onChange={async (e) => {
                      const value = e.target.value as AnimalStatus
                      setFilters((prev) => ({ ...prev, status: value }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {Object.entries(animal_status_labels).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="typeFilter"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Tipo
                  </label>
                  <select
                    id="typeFilter"
                    value={filters.type}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        type: e.target.value as AnimalType | ''
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Todos</option>
                    {Object.entries(animals_types_labels).map(
                      ([key, value]) => (
                        <option key={key} value={key}>
                          {value}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="stageFilter"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Etapa
                  </label>
                  <select
                    id="stageFilter"
                    value={filters.stage}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        stage: e.target.value as AnimalStage | ''
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Todas</option>
                    {Object.entries(animals_stages_labels).map(
                      ([key, value]) => (
                        <option key={key} value={key}>
                          {value}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="genderFilter"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Género
                  </label>
                  <select
                    id="genderFilter"
                    value={filters.gender}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        gender: e.target.value as AnimalGender | ''
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Todos</option>
                    <option value="macho">Macho</option>
                    <option value="hembra">Hembra</option>
                  </select>
                </div>
              </div>
              {/* Buscar */}
              <div>
                <label
                  htmlFor="searchFilter"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Buscar
                </label>
                <input
                  id="searchFilter"
                  type="text"
                  placeholder="ID o notas..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      search: e.target.value
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Conteo de animales filtrados */}
          <div className="bg-white rounded-lg shadow mb-4">
            <div className="px-6 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Resultados:
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {filteredAnimals.length}{' '}
                  {filteredAnimals.length === 1 ? 'animal' : 'animales'}
                  {filters.status !== 'activo' ||
                  filters.type ||
                  filters.stage ||
                  filters.gender ||
                  filters.search ? (
                    <span className="text-gray-500 font-normal">
                      {' '}
                      filtrados
                    </span>
                  ) : (
                    <span className="text-gray-500 font-normal"> en total</span>
                  )}
                </span>
              </div>
              {(filters.status !== 'activo' ||
                filters.type ||
                filters.stage ||
                filters.gender ||
                filters.search) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {filters.status !== 'activo' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {animal_status_labels[filters.status]}
                    </span>
                  )}
                  {filters.type && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {formatStatLabel(filters.type)}
                    </span>
                  )}
                  {filters.stage && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {formatStatLabel(filters.stage)}
                    </span>
                  )}
                  {filters.gender && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                      {formatStatLabel(filters.gender)}
                    </span>
                  )}
                  {filters.search && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Búsqueda: {filters.search}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Botones de selección múltiple */}
            {filteredAnimals.length > 0 && (
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {!isSelectionMode ? (
                      <button
                        onClick={() => setIsSelectionMode(true)}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                      >
                        📋 Seleccionar Múltiples
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={selectAllVisibleAnimals}
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 transition-colors"
                        >
                          ✅ Seleccionar Todos ({filteredAnimals.length})
                        </button>
                        <button
                          onClick={clearSelection}
                          className="bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-gray-700 transition-colors"
                        >
                          ❌ Cancelar
                        </button>
                      </>
                    )}
                  </div>

                  {isSelectionMode && selectedAnimals.length > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">
                        {selectedAnimals.length} seleccionados
                      </span>
                      <button
                        onClick={() => setIsBulkHealthModalOpen(true)}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 transition-colors"
                      >
                        Aplicar Registro Multiple 📋
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lista de animales */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              {isLoadingAnimals ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <span className="ml-3 text-gray-600">
                    Cargando animales...
                  </span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      )
    },
    {
      label: '📋 Registros',
      content: <RecordsTab />
    },
    {
      label: '🐣 Reproducción',
      content: <BreedingTabs />
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
                  <p className="text-xl font-bold text-blue-600">
                    {getTodayReminders().length}
                  </p>
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
                  <p className="text-xl font-bold text-red-600">
                    {getOverdueReminders().length}
                  </p>
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
                  <p className="text-xl font-bold text-gray-900">
                    {reminders.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de recordatorios */}
          <div className="bg-white rounded-lg shadow p-6">
            {remindersLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="ml-3 text-gray-600">
                  Cargando recordatorios...
                </span>
              </div>
            ) : reminders.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">📋</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No tienes recordatorios
                </h3>
                <p className="text-gray-600 mb-6">
                  Crea recordatorios para no olvidar tareas importantes
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Recordatorios de salud */}
                <HealthRemindersCard />

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
      )
    },
    {
      label: '🚜 Granja',
      content: <FarmSection />
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <FarmSwitcherBar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Si no hay granjas, priorizar creación/selección */}
        {farms.length === 0 ? <FarmSection /> : <Tabs tabs={tabs} />}
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
