'use client'

import {
  type Animal,
  type AnimalStageKey,
  animal_stage_config,
} from '@mi-granja/shared/types/animals'
import React, { useMemo, useState } from 'react'
import { Modal } from '@/components/Modal'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { animalAge } from '@/lib/animal-utils'

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

function sortByAnimalNumber(list: Animal[]): Animal[] {
  return [...list].sort((a, b) =>
    (a.animalNumber || '').localeCompare(b.animalNumber || '', 'es', { numeric: true }),
  )
}

const NumbersTab: React.FC = () => {
  const { animals } = useAnimalCRUD()
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

interface AnimalPrintListModalProps {
  title: string
  animals: Animal[]
  onClose: () => void
}

const AnimalPrintListModal: React.FC<AnimalPrintListModalProps> = ({ title, animals, onClose }) => {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const sorted = useMemo(() => sortByAnimalNumber(animals), [animals])

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handlePrint = () => {
    const rows = sorted
      .map((a) => {
        const isChecked = checked.has(a.id)
        const box = isChecked ? '☑' : '☐'
        const label = a.animalNumber || a.id.slice(0, 6)
        return `<li><span class="box">${box}</span><span class="num">${label}</span></li>`
      })
      .join('')

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Lista: ${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 16px; }
  .meta { font-size: 12px; color: #555; margin-bottom: 16px; }
  ul { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px 16px; }
  li { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 4px 0; break-inside: avoid; }
  .box { font-size: 16px; width: 18px; display: inline-block; }
  .num { font-weight: 500; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
  <h1>Lista de: ${title}</h1>
  <div class="meta">Total: ${sorted.length} · Marcados: ${checked.size}</div>
  <ul>${rows}</ul>
  <script>
    window.addEventListener('load', () => { setTimeout(() => { window.print(); }, 150); });
  </script>
</body>
</html>`

    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    w.document.open()
    w.document.write(html)
    w.document.close()
  }

  return (
    <Modal isOpen onClose={onClose} title={`Lista de: ${title}`} size="xl">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600">
          Total: {sorted.length} · Marcados: {checked.size}
        </div>
        <button
          type="button"
          onClick={handlePrint}
          disabled={sorted.length === 0}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          🖨️ Imprimir
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center text-gray-500 py-8 text-sm">Sin animales en esta categoría</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {sorted.map((a) => {
            const isChecked = checked.has(a.id)
            return (
              <label
                key={a.id}
                className="inline-flex items-center gap-2 text-sm border border-gray-200 rounded px-2 py-1.5 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(a.id)}
                  className="cursor-pointer"
                />
                <span className={`font-medium ${isChecked ? 'line-through text-gray-500' : ''}`}>
                  {a.animalNumber || a.id.slice(0, 6)}
                </span>
              </label>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

export default NumbersTab
