'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { useAnimals } from '@/hooks/useAnimals'
import Navbar from '@/components/Navbar'
import AnimalCard from '@/components/AnimalCard'
import BreedingSection from '@/components/BreedingSection'
import ReminderCard from '@/components/ReminderCard'
import FarmSection from '@/components/FarmSection'
import { useReminders } from '@/hooks/useReminders'
import ModalAnimalForm from './ModalAnimalForm'
import ModalAnimalDetails from './ModalAnimalDetails'
import Tabs from '@/components/Tabs'

/**
 * Dashboard principal de la aplicación
 * Muestra resumen del ganado y permite gestionar animales
 */
const Dashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const {
    animals,
    isLoading: isLoadingAnimals,
    getStats,
    filterAnimals
  } = useAnimals()

  const {
    reminders,
    isLoading: remindersLoading,
    markAsCompleted,
    deleteReminder,
    getOverdueReminders,
    getTodayReminders,
    getUpcomingReminders
  } = useReminders()

  const [filters, setFilters] = useState({
    type: '',
    stage: '',
    search: ''
  })

  const stats = getStats()
  const filteredAnimals = filterAnimals(filters)
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
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{stats.total}</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total de Animales
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                </div>
              </div>
            </div>

            {/* Estadísticas por tipo */}
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">
                      {type === 'oveja'
                        ? '🐑'
                        : type.includes('vaca')
                        ? '🐄'
                        : type === 'cabra'
                        ? '🐐'
                        : '🐷'}
                    </span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      {formatStatLabel(type)}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

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
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        type: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Todos</option>
                    <option value="oveja">Ovejas</option>
                    <option value="vaca_leche">Vacas Lecheras</option>
                    <option value="vaca_engorda">Vacas de Engorda</option>
                    <option value="cabra">Cabras</option>
                    <option value="cerdo">Cerdos</option>
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
                        stage: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Todas</option>
                    <option value="cria">Crías</option>
                    <option value="engorda">Engorda</option>
                    <option value="lechera">Lecheras</option>
                    <option value="reproductor">Reproductores</option>
                    <option value="descarte">Descarte</option>
                  </select>
                </div>
              </div>
            </div>
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
                    <ModalAnimalDetails
                      animal={animal}
                      key={animal.id}
                      triggerComponent={<AnimalCard animal={animal} />}
                    ></ModalAnimalDetails>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )
    },
    {
      label: '🐣 Reproducción',
      content: <BreedingSection />
    },
    {
      label: '📋 Recordatorios',
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Bienvenido a {user.farmName || 'tu granja'}, {user.email}
          </p>
        </div>

        {/* Tabs Component */}
        <Tabs tabs={tabs} />
      </div>
    </div>
  )
}

export default Dashboard
