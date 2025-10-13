import { useState, useEffect } from 'react'
import ModalAnimalForm from '@/components/ModalAnimalForm'
import {
  animal_status_labels,
  AnimalGender,
  animals_genders_labels,
  animals_stages_labels,
  animals_types_labels,
  AnimalStage,
  AnimalStatus,
  AnimalType,
  Animal
} from '@/types/animals'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { setAnimals } from '@/features/animals/animalsSlice'

// Interfaz para los filtros de animales
export interface AnimalFilters {
  status: AnimalStatus
  type: AnimalType | ''
  stage: AnimalStage | ''
  gender: AnimalGender | ''
  search: string
}

// Filtros iniciales por defecto
export const initialAnimalFilters: AnimalFilters = {
  status: 'activo',
  type: 'oveja',
  stage: '',
  gender: '',
  search: ''
}

// Hook personalizado para manejar filtros de animales
export const useAnimalFilters = () => {
  const { animals, animalsFiltered, getFarmAnimals } = useAnimalCRUD()
  const [filters, setFilters] = useState<AnimalFilters>(initialAnimalFilters)
  const [statusAnimals, setStatusAnimals] = useState<Animal[]>([])

  // Recargar animales desde BD cuando cambia el filtro de estado (solo no-activo)
  useEffect(() => {
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
  }, [filters.status, getFarmAnimals])

  // Obtener animales filtrados
  const filteredAnimals = animalsFiltered(filters)

  // Función para formatear etiquetas de estado
  const formatStatLabel = (
    key: AnimalStage | AnimalType | AnimalGender | AnimalStatus
  ) => {
    const labels: Record<string, string> = {
      ...animals_types_labels,
      ...animals_stages_labels,
      ...animals_genders_labels,
      ...animal_status_labels
    }
    return labels[key] || key
  }

  return {
    filters,
    setFilters,
    filteredAnimals,
    animals,
    statusAnimals,
    formatStatLabel
  }
}

// Props para el componente AnimalsFilters
interface AnimalsFiltersProps {
  filters: AnimalFilters
  setFilters: React.Dispatch<React.SetStateAction<AnimalFilters>>
}

export const AnimalsFilters = ({
  filters,
  setFilters
}: AnimalsFiltersProps) => {
  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <h2 className="text-xl font-semibold text-gray-900">Mis Animales</h2>
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
              {Object.entries(animal_status_labels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
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
              {Object.entries(animals_types_labels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
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
              {Object.entries(animals_stages_labels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
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
              {Object.entries(animals_genders_labels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
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
  )
}
