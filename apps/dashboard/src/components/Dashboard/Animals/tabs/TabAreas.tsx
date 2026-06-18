'use client'

import { useMemo, useState } from 'react'
import FarmMapEditor, { UNASSIGNED_AREA_ID } from '@/components/Dashboard/Animals/FarmMapEditor'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { computeAnimalStage } from '@/lib/animal-utils'
import {
  type Animal,
  type AnimalGender,
  type AnimalStage,
  type AnimalType,
  animals_genders_labels,
  animals_stages_labels,
  animals_types_labels,
} from '@/types/animals'
import type { FarmArea } from '@/types/farm'

interface TabAreasProps {
  animals: Animal[]
  areas: FarmArea[]
}

interface AreaAnimalFilters {
  search: string
  type: AnimalType | ''
  gender: AnimalGender | ''
  stage: AnimalStage | ''
  breed: string
}

const animalMatchesFilters = (animal: Animal, filters: AreaAnimalFilters) => {
  if (filters.type && animal.type !== filters.type) return false
  if (filters.gender && animal.gender !== filters.gender) return false
  if (filters.breed && animal.breed !== filters.breed) return false
  if (filters.stage && (animal.computedStage ?? computeAnimalStage(animal)) !== filters.stage) {
    return false
  }

  const value = filters.search.trim().toLowerCase()
  if (!value) return true

  return [animal.animalNumber, animal.name, animal.breed, animal.notes]
    .filter(Boolean)
    .some((item) => item!.toLowerCase().includes(value))
}

interface ChipSelectProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  disabled?: boolean
}

function ChipSelect({ label, value, options, onChange, disabled }: ChipSelectProps) {
  const active = value !== ''
  return (
    <div
      className={`relative inline-flex items-center rounded-full border text-sm transition ${
        active
          ? 'border-green-500 bg-green-50 text-green-800'
          : 'border-gray-300 bg-white text-gray-600'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="cursor-pointer appearance-none rounded-full bg-transparent py-1.5 pl-3 pr-7 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed"
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 text-[10px] text-gray-400">▼</span>
    </div>
  )
}

export default function TabAreas({ animals, areas }: TabAreasProps) {
  const { assignArea } = useAnimalCRUD()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AnimalType | ''>('')
  const [genderFilter, setGenderFilter] = useState<AnimalGender | ''>('')
  const [stageFilter, setStageFilter] = useState<AnimalStage | ''>('')
  const [breedFilter, setBreedFilter] = useState('')
  const [selectedAnimalId, setSelectedAnimalId] = useState('')
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const activeAreas = useMemo(() => areas.filter((area) => area.isActive), [areas])
  const activeAreaIds = useMemo(() => new Set(activeAreas.map((area) => area.id)), [activeAreas])

  const availableBreeds = useMemo(
    () =>
      [...new Set(animals.map((animal) => animal.breed).filter(Boolean))].sort((a, b) =>
        a!.localeCompare(b!, 'es'),
      ) as string[],
    [animals],
  )

  const filters: AreaAnimalFilters = {
    search,
    type: typeFilter,
    gender: genderFilter,
    stage: stageFilter,
    breed: breedFilter,
  }
  const hasFilters =
    search.trim().length > 0 ||
    typeFilter !== '' ||
    genderFilter !== '' ||
    stageFilter !== '' ||
    breedFilter !== ''

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('')
    setGenderFilter('')
    setStageFilter('')
    setBreedFilter('')
  }

  const matchingAnimalIds = useMemo(
    () =>
      new Set(
        animals
          .filter((animal) => animalMatchesFilters(animal, filters))
          .map((animal) => animal.id),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [animals, search, typeFilter, genderFilter, stageFilter, breedFilter],
  )
  const animalsByArea = useMemo(() => {
    const groups = new Map<string, Animal[]>()
    groups.set(UNASSIGNED_AREA_ID, [])
    activeAreas.forEach((area) => {
      groups.set(area.id, [])
    })

    animals.forEach((animal) => {
      const areaId =
        animal.currentAreaId && activeAreaIds.has(animal.currentAreaId)
          ? animal.currentAreaId
          : UNASSIGNED_AREA_ID
      groups.get(areaId)?.push(animal)
    })

    groups.forEach((group) => {
      group.sort((a, b) => a.animalNumber.localeCompare(b.animalNumber, 'es', { numeric: true }))
    })

    return groups
  }, [activeAreaIds, activeAreas, animals])

  const setAnimalSaving = (animalId: string, isSaving: boolean) => {
    setSavingIds((prev) => {
      const next = new Set(prev)
      if (isSaving) next.add(animalId)
      else next.delete(animalId)
      return next
    })
  }

  const moveAnimal = async (animalId: string, areaId: string) => {
    const nextAreaId = areaId === UNASSIGNED_AREA_ID ? null : areaId
    const animal = animals.find((item) => item.id === animalId)
    if (!animal) return
    if ((animal.currentAreaId ?? null) === nextAreaId) return

    setError(null)
    setAnimalSaving(animalId, true)
    try {
      await assignArea(animalId, nextAreaId)
    } catch (err) {
      console.error('Error moving animal to area:', err)
      setError('No se pudo mover el animal. Intenta de nuevo.')
    } finally {
      setAnimalSaving(animalId, false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Mapa de áreas</h2>
          <p className="text-sm text-gray-500">
            Dibuja corrales o potreros y asigna animales sobre el lienzo.
          </p>
        </div>

        <input
          id="areas-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar animal: número, nombre, raza o notas..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ChipSelect
            label="Especie"
            value={typeFilter}
            onChange={(value) => setTypeFilter(value as AnimalType | '')}
            options={Object.entries(animals_types_labels).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <ChipSelect
            label="Género"
            value={genderFilter}
            onChange={(value) => setGenderFilter(value as AnimalGender | '')}
            options={Object.entries(animals_genders_labels).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <ChipSelect
            label="Etapa"
            value={stageFilter}
            onChange={(value) => setStageFilter(value as AnimalStage | '')}
            options={Object.entries(animals_stages_labels).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <ChipSelect
            label="Raza"
            value={breedFilter}
            onChange={setBreedFilter}
            disabled={availableBreeds.length === 0}
            options={availableBreeds.map((breed) => ({ value: breed, label: breed }))}
          />
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Limpiar ({matchingAnimalIds.size})<span aria-hidden>✕</span>
            </button>
          ) : null}
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Usa el menú <span className="font-semibold">⋮</span> de cada animal para reasignarlo, o
          arrástralo sobre el lienzo.
        </p>

        {error ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>

      <FarmMapEditor
        areas={activeAreas}
        animalsByArea={animalsByArea}
        matchingAnimalIds={matchingAnimalIds}
        hasFilters={hasFilters}
        selectedAnimalId={selectedAnimalId}
        savingIds={savingIds}
        onSelectAnimal={setSelectedAnimalId}
        onMoveAnimal={moveAnimal}
      />
    </div>
  )
}
