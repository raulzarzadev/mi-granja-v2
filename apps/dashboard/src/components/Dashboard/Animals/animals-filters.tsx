import { QuickFilterMenu } from '@/components/inputs/FilterChip'
import { useEffect, useRef, useState } from 'react'
import { EmojiIcon } from '@/components/Icon/emoji-icons'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { computeAnimalStage } from '@/lib/animal-utils'
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
  getReproductiveStatus,
} from '@/types/animals'

// Interfaz para los filtros de animales
export interface AnimalFilters {
  status: AnimalStatus
  type: AnimalType | ''
  breed: string
  stage: AnimalStage | ''
  gender: AnimalGender | ''
  breedingStatus: AnimalBreedingStatus | 'libre' | '' // Nuevo filtro para estado de cría
  search: string
}

// Filtros iniciales por defecto
export const initialAnimalFilters: AnimalFilters = {
  status: 'activo',
  type: '',
  breed: '',
  stage: '',
  gender: '',
  breedingStatus: '',
  search: '',
}

// Hook personalizado para manejar filtros de animales
export const useAnimalFilters = (externalState?: {
  filters: AnimalFilters
  setFilters: React.Dispatch<React.SetStateAction<AnimalFilters>>
}) => {
  const { animals, animalsFiltered, queryAnimalsByStatus, searchExact } = useAnimalCRUD()
  const [internalFilters, internalSetFilters] = useState<AnimalFilters>(() => {
    if (typeof window === 'undefined') return initialAnimalFilters
    try {
      const saved = sessionStorage.getItem('mg_animal_search')
      return saved ? { ...initialAnimalFilters, search: saved } : initialAnimalFilters
    } catch {
      return initialAnimalFilters
    }
  })
  const filters = externalState?.filters ?? internalFilters
  const setFilters = externalState?.setFilters ?? internalSetFilters

  // Persistir búsqueda en sessionStorage
  useEffect(() => {
    try {
      if (filters.search) {
        sessionStorage.setItem('mg_animal_search', filters.search)
      } else {
        sessionStorage.removeItem('mg_animal_search')
      }
    } catch {}
  }, [filters.search])
  const [statusAnimals, setStatusAnimals] = useState<Animal[]>([])
  const [searchResults, setSearchResults] = useState<Animal[]>([])
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Estado reproductivo derivado de los campos del animal
  const getAnimalBreedingStatus = (animal: Animal): AnimalBreedingStatus | 'libre' => {
    return getReproductiveStatus(animal)
  }

  // Recargar animales desde BD cuando cambia el filtro de estado (solo no-activo)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (filters.status !== 'activo') {
        const list = await queryAnimalsByStatus(filters.status)
        if (cancelled) return
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
  }, [filters.status, queryAnimalsByStatus])

  // Busqueda exacta en Firestore (debounced) — trae animales de cualquier status
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    const term = filters.search.trim()
    if (!term) {
      setSearchResults([])
      return
    }

    searchTimerRef.current = setTimeout(async () => {
      const results = await searchExact(term)
      setSearchResults(results)
    }, 400)

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [filters.search, searchExact])

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

    // Prepend resultados exactos de Firestore que no estan ya en la lista
    if (searchResults.length > 0) {
      const existingIds = new Set(result.map((a) => a.id))
      const extraAnimals = searchResults.filter((a) => !existingIds.has(a.id))
      if (extraAnimals.length > 0) {
        result = [...extraAnimals, ...result]
      }
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
  const availableStages = [...new Set(animals.map((a) => computeAnimalStage(a)))].sort()
  const availableGenders = [...new Set(animals.map((a) => a.gender))].sort()

  // Contar filtros activos (excluyendo los defaults)
  const activeFilterCount = [
    filters.status !== 'activo',
    filters.type !== '',
    filters.breed !== '',
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
export interface AnimalsFiltersProps {
  speciesAnimals: Animal[]
  filters: AnimalFilters
  setFilters: React.Dispatch<React.SetStateAction<AnimalFilters>>
  filteredCount: number
  activeFilterCount: number
  availableTypes: string[]
  availableStages: string[]
  availableGenders: string[]
  crossTabDuplicatesCount: number
  onShowDuplicates: () => void
  formatStatLabel: (
    key: AnimalStage | AnimalType | AnimalGender | AnimalStatus | AnimalBreedingStatus | 'libre',
  ) => string
  tabsTotal?: number
}

export const AnimalsFilters = ({
  speciesAnimals,
  filters,
  setFilters,
  filteredCount,
  activeFilterCount,
  availableTypes,
  crossTabDuplicatesCount,
  onShowDuplicates,
  formatStatLabel,
  tabsTotal,
}: AnimalsFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false)
  const [openQuickFilter, setOpenQuickFilter] = useState<
    'type' | 'gender' | 'stage' | 'status' | 'breedingStatus' | null
  >(null)
  const speciesCounts = speciesAnimals.reduce<Record<string, number>>((counts, animal) => {
    counts[animal.type] = (counts[animal.type] ?? 0) + 1
    return counts
  }, {})
  const speciesOptions = Object.keys(speciesCounts)
    .sort()
    .map((value) => ({
      value,
      label: `${animals_types_labels[value as AnimalType] || value} (${speciesCounts[value]})`,
    }))
  const allSpeciesLabel = `Todos (${speciesAnimals.length})`
  const speciesSummaryIndicator =
    !filters.type &&
    typeof tabsTotal === 'number' &&
    (tabsTotal === filteredCount ? (
      <svg
        aria-label="Todos los animales visibles"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="size-3.5 text-green-500"
      >
        <path
          fillRule="evenodd"
          d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 1 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207l.207.207Z"
          clipRule="evenodd"
        />
      </svg>
    ) : (
      <span className="text-amber-500 font-medium" aria-label={`${tabsTotal} de ${filteredCount}`}>
        {tabsTotal}/{filteredCount}
      </span>
    ))
  const quickFiltersRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!openQuickFilter) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!quickFiltersRef.current?.contains(event.target as Node)) {
        setOpenQuickFilter(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [openQuickFilter])

  return (
    <div className="bg-white rounded-lg shadow mb-4">
      {/* Barra principal: búsqueda + filtro + crear */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Buscar por numero, nombre o notas..."
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          className="min-w-[14rem] flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        {/* Botón limpiar filtros */}
        {(activeFilterCount > 0 || filters.search) && (
          <button
            onClick={() =>
              setFilters({
                status: 'activo',
                type: '',
                breed: '',
                stage: '',
                gender: '',
                breedingStatus: '',
                search: '',
              })
            }
            className="relative p-2 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer text-white "
            title="Borrar filtros"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5 text-red-500"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
            <span className="absolute -top-1.5 -right-1.5 bg-rose-400 text-white text-[12px] min-w-4 h-4 rounded-full flex items-center justify-center px-1 font-extrabold ">
              {filteredCount}
            </span>
          </button>
        )}
        <button
          type="button"
          aria-label="Filtros"
          title="Filtros"
          aria-expanded={showFilters}
          onClick={() => {
            setShowFilters((current) => !current)
            setOpenQuickFilter(null)
          }}
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 ${showFilters || activeFilterCount > 0 ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M3 4h18v3l-7 7v5l-4 2v-7L3 7V4Z" />
          </svg>
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-green-700 px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Resumen de resultados + filtros activos */}
      {showFilters && (
        <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
          <div ref={quickFiltersRef} className="flex items-center gap-1.5 flex-wrap">
            <QuickFilterMenu
              label="Estado"
              selectedLabel={
                filters.status !== 'activo' ? animal_status_labels[filters.status] : ''
              }
              value={filters.status === 'activo' ? '' : filters.status}
              allLabel="Activo"
              options={Object.entries(animal_status_labels)
                .filter(([value]) => value !== 'activo')
                .map(([value, label]) => ({ value, label }))}
              open={openQuickFilter === 'status'}
              onToggle={() =>
                setOpenQuickFilter((current) => (current === 'status' ? null : 'status'))
              }
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, status: (value || 'activo') as AnimalStatus }))
                setOpenQuickFilter(null)
              }}
            />
            <QuickFilterMenu
              label="Especie"
              selectedLabel={
                <span className="inline-flex items-center gap-1">
                  {filters.type
                    ? `${formatStatLabel(filters.type)} (${speciesCounts[filters.type] ?? 0})`
                    : allSpeciesLabel}
                  {speciesSummaryIndicator}
                </span>
              }
              value={filters.type}
              allLabel={allSpeciesLabel}
              options={speciesOptions}
              open={openQuickFilter === 'type'}
              onToggle={() => setOpenQuickFilter((current) => (current === 'type' ? null : 'type'))}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, type: value as AnimalType | '' }))
                setOpenQuickFilter(null)
              }}
            />
            <QuickFilterMenu
              label="Género"
              selectedLabel={filters.gender ? formatStatLabel(filters.gender) : ''}
              value={filters.gender}
              allLabel="Todos"
              options={Object.entries(animals_genders_labels).map(([value, label]) => ({
                value,
                label,
              }))}
              open={openQuickFilter === 'gender'}
              onToggle={() =>
                setOpenQuickFilter((current) => (current === 'gender' ? null : 'gender'))
              }
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, gender: value as AnimalGender | '' }))
                setOpenQuickFilter(null)
              }}
            />
            <QuickFilterMenu
              label="Etapa"
              selectedLabel={filters.stage ? formatStatLabel(filters.stage) : ''}
              value={filters.stage}
              allLabel="Todas"
              options={Object.entries(animals_stages_labels).map(([value, label]) => ({
                value,
                label,
              }))}
              open={openQuickFilter === 'stage'}
              onToggle={() =>
                setOpenQuickFilter((current) => (current === 'stage' ? null : 'stage'))
              }
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, stage: value as AnimalStage | '' }))
                setOpenQuickFilter(null)
              }}
            />
            <QuickFilterMenu
              label="Reproducción"
              selectedLabel={filters.breedingStatus ? formatStatLabel(filters.breedingStatus) : ''}
              value={filters.breedingStatus}
              allLabel="Todos"
              options={[
                { value: 'libre', label: 'Libre' },
                ...Object.entries(breeding_animal_status_labels).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
              open={openQuickFilter === 'breedingStatus'}
              onToggle={() =>
                setOpenQuickFilter((current) =>
                  current === 'breedingStatus' ? null : 'breedingStatus',
                )
              }
              onChange={(value) => {
                setFilters((prev) => ({
                  ...prev,
                  breedingStatus: value as AnimalFilters['breedingStatus'],
                }))
                setOpenQuickFilter(null)
              }}
            />
            {crossTabDuplicatesCount > 0 && (
              <button
                type="button"
                aria-label={`${crossTabDuplicatesCount} animales aparecen en más de una condición compatible. Ver condiciones`}
                title={`${crossTabDuplicatesCount} animales aparecen en más de una condición compatible`}
                onClick={onShowDuplicates}
                className="inline-flex min-h-8 min-w-8 items-center justify-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM9.25 8.25A.75.75 0 0 1 10 7.5h.01a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5ZM10 5.25a.875.875 0 1 0 0 1.75.875.875 0 0 0 0-1.75Z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xs font-semibold">{crossTabDuplicatesCount}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
