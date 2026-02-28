import { useEffect, useState } from 'react'
import ModalAnimalForm from '@/components/ModalAnimalForm'
import { setAnimals } from '@/features/animals/animalsSlice'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import {
  Animal,
  AnimalBreedingStatus,
  AnimalGender,
  AnimalStage,
  AnimalStatus,
  AnimalType,
  animal_status_labels,
  animals_genders_labels,
  animals_stages_labels,
  animals_types_labels,
  breeding_animal_status_labels,
} from '@/types/animals'

// Interfaz para los filtros de animales
export interface AnimalFilters {
  status: AnimalStatus
  type: AnimalType | ''
  stage: AnimalStage | ''
  gender: AnimalGender | ''
  breedingStatus: AnimalBreedingStatus | 'libre' | '' // Nuevo filtro para estado de cría
  search: string
}

// Filtros iniciales por defecto
export const initialAnimalFilters: AnimalFilters = {
  status: 'activo',
  type: 'oveja',
  stage: '',
  gender: '',
  breedingStatus: '',
  search: '',
}

// Hook personalizado para manejar filtros de animales
export const useAnimalFilters = () => {
  const { animals, animalsFiltered, getFarmAnimals } = useAnimalCRUD()
  const { breedingRecords } = useBreedingCRUD()
  const [filters, setFilters] = useState<AnimalFilters>(initialAnimalFilters)
  const [statusAnimals, setStatusAnimals] = useState<Animal[]>([])

  // Función para determinar el estado de cría de un animal
  const getAnimalBreedingStatus = (animal: Animal): AnimalBreedingStatus | 'libre' => {
    if (animal.gender !== 'hembra') return 'libre' // Solo hembras pueden estar en estos estados

    // Buscar en registros de cría activos para esta hembra
    const activeBreeding = breedingRecords.find((breeding) =>
      breeding.femaleBreedingInfo.some((femaleInfo) => femaleInfo.femaleId === animal.id),
    )

    if (!activeBreeding) return 'libre'

    const femaleInfo = activeBreeding.femaleBreedingInfo.find((info) => info.femaleId === animal.id)
    if (!femaleInfo) return 'libre'

    // Determinar estado basado en fechas
    if (femaleInfo.actualBirthDate) return 'parida'
    if (femaleInfo.pregnancyConfirmedDate) return 'embarazada'
    return 'monta' // Está en proceso de monta pero no confirmada
  }

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

  // Obtener animales filtrados (incluye filtro de estado de cría)
  const filteredAnimals = (() => {
    let result = animalsFiltered(filters)

    // Aplicar filtro de estado de cría si está especificado
    if (filters.breedingStatus) {
      result = result.filter((animal) => {
        const breedingStatus = getAnimalBreedingStatus(animal)
        return breedingStatus === filters.breedingStatus
      })
    }

    return result
  })()

  // Función para formatear etiquetas de estado
  const formatStatLabel = (
    key: AnimalStage | AnimalType | AnimalGender | AnimalStatus | AnimalBreedingStatus | 'libre',
  ) => {
    const labels: Record<string, string> = {
      ...animals_types_labels,
      ...animals_stages_labels,
      ...animals_genders_labels,
      ...animal_status_labels,
      ...breeding_animal_status_labels,
      libre: 'Libre',
    }
    return labels[key] || key
  }

  // Opciones disponibles basadas en los animales reales de la granja
  const availableTypes = [...new Set(animals.map((a) => a.type))].sort()
  const availableStages = [...new Set(animals.map((a) => a.stage))].sort()
  const availableGenders = [...new Set(animals.map((a) => a.gender))].sort()

  // Contar filtros activos (excluyendo los defaults)
  const activeFilterCount = [
    filters.status !== 'activo',
    filters.type !== '',
    filters.stage !== '',
    filters.gender !== '',
    filters.breedingStatus !== '',
  ].filter(Boolean).length

  return {
    filters,
    setFilters,
    filteredAnimals,
    animals,
    statusAnimals,
    formatStatLabel,
    activeFilterCount,
    availableTypes,
    availableStages,
    availableGenders,
  }
}

// Props para el componente AnimalsFilters
interface AnimalsFiltersProps {
  filters: AnimalFilters
  setFilters: React.Dispatch<React.SetStateAction<AnimalFilters>>
  filteredCount: number
  activeFilterCount: number
  availableTypes: string[]
  availableStages: string[]
  availableGenders: string[]
  formatStatLabel: (
    key: AnimalStage | AnimalType | AnimalGender | AnimalStatus | AnimalBreedingStatus | 'libre',
  ) => string
}

const FilterIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={`w-5 h-5 ${active ? 'text-green-600' : 'text-gray-500'}`}
  >
    <path
      fillRule="evenodd"
      d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z"
      clipRule="evenodd"
    />
  </svg>
)

export const AnimalsFilters = ({
  filters,
  setFilters,
  filteredCount,
  activeFilterCount,
  availableTypes,
  availableStages,
  availableGenders,
  formatStatLabel,
}: AnimalsFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilters =
    filters.status !== 'activo' ||
    filters.type !== '' ||
    filters.stage !== '' ||
    filters.gender !== '' ||
    filters.breedingStatus !== '' ||
    filters.search !== ''

  return (
    <div className="bg-white rounded-lg shadow mb-4">
      {/* Barra principal: búsqueda + filtro + crear */}
      <div className="px-4 py-3 flex items-center gap-2">
        <input
          type="text"
          placeholder="Buscar por ID o notas..."
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        {/* Botón filtro */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`relative p-2 rounded-lg border transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
          title="Filtros"
        >
          <FilterIcon active={showFilters || activeFilterCount > 0} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-green-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Botón crear */}
        <ModalAnimalForm mode="create" compact />
      </div>

      {/* Panel de filtros colapsable */}
      {showFilters && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-100">
          <div className="flex justify-end my-2">
            {hasActiveFilters && (
              <button
                onClick={() =>
                  setFilters({
                    status: 'activo',
                    type: '',
                    stage: '',
                    gender: '',
                    breedingStatus: '',
                    search: '',
                  })
                }
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-3.5 h-3.5"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value as AnimalStatus }))
              }
              className={`px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                filters.status !== 'activo'
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : 'border-gray-300'
              }`}
            >
              {Object.entries(animal_status_labels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={filters.type}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, type: e.target.value as AnimalType | '' }))
              }
              className={`px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                filters.type !== ''
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : 'border-gray-300'
              }`}
            >
              <option value="">Tipo: Todos</option>
              {availableTypes.map((key) => (
                <option key={key} value={key}>
                  {animals_types_labels[key as AnimalType] || key}
                </option>
              ))}
            </select>

            <select
              value={filters.stage}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, stage: e.target.value as AnimalStage | '' }))
              }
              className={`px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                filters.stage !== ''
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : 'border-gray-300'
              }`}
            >
              <option value="">Etapa: Todas</option>
              {availableStages.map((key) => (
                <option key={key} value={key}>
                  {animals_stages_labels[key as AnimalStage] || key}
                </option>
              ))}
            </select>

            <select
              value={filters.gender}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, gender: e.target.value as AnimalGender | '' }))
              }
              className={`px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                filters.gender !== ''
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : 'border-gray-300'
              }`}
            >
              <option value="">Genero: Todos</option>
              {availableGenders.map((key) => (
                <option key={key} value={key}>
                  {animals_genders_labels[key as AnimalGender] || key}
                </option>
              ))}
            </select>

            <select
              value={filters.breedingStatus}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  breedingStatus: e.target.value as AnimalBreedingStatus | 'libre' | '',
                }))
              }
              className={`px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                filters.breedingStatus !== ''
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : 'border-gray-300'
              }`}
            >
              <option value="">Cria: Todos</option>
              <option value="libre">Libre</option>
              {Object.entries(breeding_animal_status_labels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Resumen de resultados + filtros activos */}
      <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {hasActiveFilters && (
            <>
              {filters.type && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {formatStatLabel(filters.type)}
                </span>
              )}
              {filters.status !== 'activo' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {formatStatLabel(filters.status)}
                </span>
              )}
              {filters.stage && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {formatStatLabel(filters.stage)}
                </span>
              )}
              {filters.gender && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                  {formatStatLabel(filters.gender)}
                </span>
              )}
              {filters.breedingStatus && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  {formatStatLabel(filters.breedingStatus)}
                </span>
              )}
            </>
          )}
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">
          <span className="font-semibold text-gray-700">{filteredCount}</span>{' '}
          {filteredCount === 1 ? 'animal' : 'animales'}
        </span>
      </div>
    </div>
  )
}
