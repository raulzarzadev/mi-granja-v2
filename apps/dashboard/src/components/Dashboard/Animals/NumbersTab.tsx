'use client'

import {
  type Animal,
  type AnimalStageKey,
  animal_stage_config,
} from '@mi-granja/shared/types/animals'
import React, { useMemo, useState } from 'react'
import AnimalPrintListModal from '@/components/AnimalPrintListModal'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { animalAge, isAvailableToSale } from '@/lib/animal-utils'

type GenderFilter = 'todos' | 'macho' | 'hembra'

const GENDER_OPTIONS: { value: GenderFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'macho', label: 'Machos' },
  { value: 'hembra', label: 'Hembras' },
]

const AGE_BUCKETS: { key: string; label: string; min: number; max: number }[] = [
  { key: '0-3m', label: '0-3 meses', min: 0, max: 3 },
  { key: '3-6m', label: '3-6 meses', min: 3, max: 6 },
  { key: '6-12m', label: '6-12 meses', min: 6, max: 12 },
  { key: '1-2a', label: '1-2 años', min: 12, max: 24 },
  { key: '2-4a', label: '2-4 años', min: 24, max: 48 },
  { key: '4a+', label: '4+ años', min: 48, max: Number.POSITIVE_INFINITY },
]

const STAGE_ORDER: AnimalStageKey[] = [
  'cria',
  'juvenil',
  'empadre',
  'embarazos',
  'crias_lactantes',
  'reproductor',
  'engorda',
  'descarte',
]

interface NumbersTabProps {
  animals?: Animal[]
}

const NumbersTab: React.FC<NumbersTabProps> = ({ animals: animalsProp }) => {
  const { animals: storeAnimals } = useAnimalCRUD()
  const animals = animalsProp ?? storeAnimals
  const [gender, setGender] = useState<GenderFilter>('todos')
  const [modalData, setModalData] = useState<{ title: string; animals: Animal[] } | null>(null)

  const activeAnimals = useMemo(
    () => animals.filter((a) => (a.status ?? 'activo') === 'activo'),
    [animals],
  )

  const genderFiltered = useMemo(() => {
    if (gender === 'todos') return activeAnimals
    return activeAnimals.filter((a) => a.gender === gender)
  }, [activeAnimals, gender])

  const stageGroups = useMemo(() => {
    const map = new Map<AnimalStageKey, Animal[]>()
    for (const a of genderFiltered) {
      const s = a.computedStage ?? a.stage
      if (!map.has(s)) map.set(s, [])
      map.get(s)?.push(a)
    }
    return map
  }, [genderFiltered])

  const ageGroups = useMemo(
    () =>
      AGE_BUCKETS.map((bucket) => {
        const list = genderFiltered.filter((a) => {
          const m = animalAge(a, { format: 'months' })
          return m >= bucket.min && m < bucket.max
        })
        return { ...bucket, animals: list }
      }),
    [genderFiltered],
  )

  const availableToSale = useMemo(() => genderFiltered.filter(isAvailableToSale), [genderFiltered])

  return (
    <div className="mt-2 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Filtrar:</span>
        {GENDER_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className="inline-flex items-center gap-1.5 cursor-pointer text-sm"
          >
            <input
              type="radio"
              name="numbers-gender-filter"
              checked={gender === opt.value}
              onChange={() => setGender(opt.value)}
              className="cursor-pointer"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Etapas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => setModalData({ title: 'Total', animals: genderFiltered })}
            disabled={genderFiltered.length === 0}
            className="bg-white rounded-lg shadow p-4 text-left hover:shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow ring-1 ring-blue-200"
          >
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <span>📊</span>
              <span>Total</span>
            </p>
            <p className="text-2xl font-bold text-gray-900">{genderFiltered.length}</p>
          </button>
          {STAGE_ORDER.map((key) => {
            const cfg = animal_stage_config[key]
            const list = stageGroups.get(key) || []
            return (
              <button
                type="button"
                key={key}
                onClick={() => setModalData({ title: cfg.label, animals: list })}
                disabled={list.length === 0}
                className="bg-white rounded-lg shadow p-4 text-left hover:shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow"
              >
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span>{cfg.icon}</span>
                  <span>{cfg.label}</span>
                </p>
                <p className="text-2xl font-bold text-gray-900">{list.length}</p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Edades</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => setModalData({ title: 'Total', animals: genderFiltered })}
            disabled={genderFiltered.length === 0}
            className="bg-white rounded-lg shadow p-4 text-left hover:shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow ring-1 ring-blue-200"
          >
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">{genderFiltered.length}</p>
          </button>
          {ageGroups.map((g) => (
            <button
              type="button"
              key={g.key}
              onClick={() => setModalData({ title: g.label, animals: g.animals })}
              disabled={g.animals.length === 0}
              className="bg-white rounded-lg shadow p-4 text-left hover:shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow"
            >
              <p className="text-xs text-gray-500">{g.label}</p>
              <p className="text-2xl font-bold text-gray-900">{g.animals.length}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Venta</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => setModalData({ title: 'Listos para venta', animals: availableToSale })}
            disabled={availableToSale.length === 0}
            className="bg-white rounded-lg shadow p-4 text-left hover:shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow ring-1 ring-yellow-200"
          >
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <span>💲</span>
              <span>Listos para venta</span>
            </p>
            <p className="text-2xl font-bold text-gray-900">{availableToSale.length}</p>
          </button>
        </div>
      </section>

      {modalData && (
        <AnimalPrintListModal
          title={modalData.title}
          animals={modalData.animals}
          onClose={() => setModalData(null)}
        />
      )}
    </div>
  )
}

export default NumbersTab
