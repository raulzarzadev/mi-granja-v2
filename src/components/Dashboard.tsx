'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { useAnimals } from '@/hooks/useAnimals'
import Navbar from '@/components/Navbar'
import AnimalCard from '@/components/AnimalCard'
import AnimalForm from '@/components/AnimalForm'
import { Animal } from '@/types'

/**
 * Dashboard principal de la aplicación
 * Muestra resumen del ganado y permite gestionar animales
 */
const Dashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const {
    animals,
    isLoading,
    createAnimal,
    getStats,
    filterAnimals,
    isSubmitting
  } = useAnimals()

  const [showAnimalForm, setShowAnimalForm] = useState(false)
  const [filters, setFilters] = useState({
    type: '',
    stage: '',
    search: ''
  })

  const stats = getStats()
  const filteredAnimals = filterAnimals(filters)

  const handleCreateAnimal = async (
    animalData: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      await createAnimal(animalData)
      setShowAnimalForm(false)
    } catch (error) {
      console.error('Error creating animal:', error)
    }
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
              <button
                onClick={() => setShowAnimalForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                + Agregar Animal
              </button>
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
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
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
                    setFilters((prev) => ({ ...prev, type: e.target.value }))
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
                    setFilters((prev) => ({ ...prev, stage: e.target.value }))
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
            {isLoading ? (
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
                {animals.length === 0 && (
                  <button
                    onClick={() => setShowAnimalForm(true)}
                    className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors font-medium"
                  >
                    Agregar Primer Animal
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAnimals.map((animal) => (
                  <AnimalCard
                    key={animal.id}
                    animal={animal}
                    onClick={() => {
                      // TODO: Implementar vista detallada del animal
                      console.log('Ver detalles de:', animal.animalId)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de formulario */}
      {showAnimalForm && (
        <AnimalForm
          onSubmit={handleCreateAnimal}
          onCancel={() => setShowAnimalForm(false)}
          isLoading={isSubmitting}
        />
      )}
    </div>
  )
}

export default Dashboard
