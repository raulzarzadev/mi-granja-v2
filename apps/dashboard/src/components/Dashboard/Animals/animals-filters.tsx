import { useEffect, useRef, useState } from 'react'
import ModalAnimalForm from '@/components/ModalAnimalForm'
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
  const availableBreeds = [
    ...new Set(animals.map((a) => a.breed).filter(Boolean)),
  ].sort() as string[]
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
    availableBreeds,
    availableStages,
    availableGenders,
  }
}

// Props para el componente AnimalsFilters
export interface AnimalsFiltersProps {
  filters: AnimalFilters
  setFilters: React.Dispatch<React.SetStateAction<AnimalFilters>>
  filteredCount: number
  activeFilterCount: number
  availableTypes: string[]
  availableBreeds: string[]
  availableStages: string[]
  availableGenders: string[]
  crossTabDuplicatesCount: number
  onShowDuplicates: () => void
  formatStatLabel: (
    key: AnimalStage | AnimalType | AnimalGender | AnimalStatus | AnimalBreedingStatus | 'libre',
  ) => string
  tabsTotal?: number
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

type QuickFilterMenuProps = {
  label: string
  selectedLabel: string
  value: string
  allLabel: string
  options: Array<{ value: string; label: string }>
  open: boolean
  onToggle: () => void
  onChange: (value: string) => void
}

const QuickFilterMenu = ({
  label,
  selectedLabel,
  value,
  allLabel,
  options,
  open,
  onToggle,
  onChange,
}: QuickFilterMenuProps) => (
  <div className="relative">
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={onToggle}
      className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1 ${
        value
          ? 'border-slate-300 bg-white text-slate-800 ring-2 ring-slate-400 ring-offset-1'
          : open
            ? 'border-slate-300 bg-slate-50 text-slate-800'
            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
      }`}
    >
      <span>{selectedLabel || label}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`size-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0l-4.25-4.51a.75.75 0 0 1 .02-1.06Z"
          clipRule="evenodd"
        />
      </svg>
    </button>
    {open && (
      <div
        role="menu"
        aria-label={`Filtrar por ${label.toLowerCase()}`}
        className="absolute left-0 top-full z-30 mt-2 min-w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
      >
        <button
          type="button"
          role="menuitemradio"
          aria-checked={value === ''}
          onClick={() => onChange('')}
          className={`flex min-h-9 w-full items-center justify-between rounded-md px-2.5 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 ${
            value === ''
              ? 'bg-slate-100 font-medium text-slate-900'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {allLabel}
          {value === '' && <span aria-hidden="true">✓</span>}
        </button>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="menuitemradio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={`flex min-h-9 w-full items-center justify-between rounded-md px-2.5 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 ${
              value === option.value
                ? 'bg-slate-100 font-medium text-slate-900'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {option.label}
            {value === option.value && <span aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>
    )}
  </div>
)

export const AnimalsFilters = ({
  filters,
  setFilters,
  filteredCount,
  activeFilterCount,
  availableTypes,
  availableBreeds,
  crossTabDuplicatesCount,
  onShowDuplicates,
  formatStatLabel,
  tabsTotal,
}: AnimalsFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false)
  const [openQuickFilter, setOpenQuickFilter] = useState<'gender' | 'stage' | null>(null)
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

  const hasActiveFilters =
    filters.status !== 'activo' ||
    filters.type !== '' ||
    filters.breed !== '' ||
    filters.stage !== '' ||
    filters.gender !== '' ||
    filters.breedingStatus !== '' ||
    filters.search !== ''

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

        {/* Botón filtro */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 ${
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

        {/* Botón crear: formulario simple dentro de un modal */}
        <ModalAnimalForm compact formVariant="simple" />
      </div>

      {/* Panel de filtros colapsable */}
      {showFilters && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-gray-500">Estado</label>
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
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-gray-500">Especie</label>
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
                <option value="">Todas</option>
                {availableTypes.map((key) => (
                  <option key={key} value={key}>
                    {animals_types_labels[key as AnimalType] || key}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-gray-500">Raza</label>
              <select
                value={filters.breed}
                onChange={(e) => setFilters((prev) => ({ ...prev, breed: e.target.value }))}
                className={`px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  filters.breed !== ''
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-gray-300'
                }`}
              >
                <option value="">Todas</option>
                {availableBreeds.map((breed) => (
                  <option key={breed} value={breed}>
                    {breed}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-gray-500">Etapa</label>
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
                <option value="">Todas</option>
                {Object.entries(animals_stages_labels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-gray-500">Genero</label>
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
                <option value="">Todos</option>
                {Object.entries(animals_genders_labels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-gray-500">Reproduccion</label>
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
                <option value="">Todos</option>
                <option value="libre">Libre</option>
                {Object.entries(breeding_animal_status_labels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Resumen de resultados + filtros activos */}
      <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
        <div ref={quickFiltersRef} className="flex items-center gap-1.5 flex-wrap">
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
            onToggle={() => setOpenQuickFilter((current) => (current === 'stage' ? null : 'stage'))}
            onChange={(value) => {
              setFilters((prev) => ({ ...prev, stage: value as AnimalStage | '' }))
              setOpenQuickFilter(null)
            }}
          />
          {crossTabDuplicatesCount > 0 && (
            <button
              type="button"
              aria-label={`${crossTabDuplicatesCount} animales aparecen en más de una condición compatible. Ver condiciones`}
              title={`${crossTabDuplicatesCount} animales aparecen en más de una condición compatible`}
              onClick={onShowDuplicates}
              className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-2 text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM9.25 8.25A.75.75 0 0 1 10 7.5h.01a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5ZM10 5.25a.875.875 0 1 0 0 1.75.875.875 0 0 0 0-1.75Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
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
              {filters.breed && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {filters.breed}
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
        <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
          <span>Animales totales: </span>
          <span className="font-semibold text-gray-700">{filteredCount}</span>
          {typeof tabsTotal === 'number' &&
            (tabsTotal === filteredCount ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-3.5 text-green-500"
              >
                <path
                  fillRule="evenodd"
                  d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <span className="text-amber-500 font-medium">
                {tabsTotal}/{filteredCount}
              </span>
            ))}
        </span>
      </div>
    </div>
  )
}
