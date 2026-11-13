'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { PiCaretRight, PiMapTrifold, PiPencilSimple } from 'react-icons/pi'
import type { Animal } from '@/types/animals'
import type { FarmArea } from '@/types/farm'

export default function FarmAreasTable({
  areas,
  animalsByArea,
  renderAnimal,
  onEdit,
  onMap,
  busy,
}: {
  areas: FarmArea[]
  animalsByArea: Map<string, Animal[]>
  renderAnimal: (animal: Animal) => ReactNode
  onEdit: (area: FarmArea) => void
  onMap: (areaId: string) => void
  busy: boolean
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const pending = animalsByArea.get('__unassigned__') ?? []
  const rows = [
    ...areas.map((area) => ({
      id: area.id,
      name: area.name,
      area,
      animals: animalsByArea.get(area.id) ?? [],
    })),
    ...(pending.length
      ? [{ id: '__unassigned__', name: 'Pendientes de asignar', area: null, animals: pending }]
      : []),
  ]
  const actionClass =
    'inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 disabled:cursor-not-allowed disabled:opacity-50'
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Áreas de la granja, animales y metros cuadrados</caption>
        <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500">
          <tr>
            <th scope="col" className="px-3 py-3">
              Área
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              Animales
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              m²
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              Acciones
            </th>
          </tr>
        </thead>
        {rows.map(({ id, name, area, animals }) => (
          <tbody key={id} className="border-b border-gray-100 last:border-0">
            <tr className="align-middle">
              <th scope="row" className="px-2 py-1 font-medium text-gray-900">
                <button
                  type="button"
                  aria-expanded={expanded.has(id)}
                  onClick={() =>
                    setExpanded((previous) => {
                      const next = new Set(previous)
                      if (next.has(id)) next.delete(id)
                      else next.add(id)
                      return next
                    })
                  }
                  className="flex min-h-11 min-w-32 cursor-pointer items-center gap-2 rounded-lg px-1 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                >
                  <PiCaretRight
                    aria-hidden="true"
                    className={`shrink-0 ${expanded.has(id) ? 'rotate-90' : ''}`}
                  />
                  {name}
                </button>
              </th>
              <td className="px-3 py-2 text-right tabular-nums text-gray-700">{animals.length}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                {area?.areaM2 != null ? area.areaM2.toLocaleString('es') : '—'}
              </td>
              <td className="px-2 py-1">
                <div className="flex items-center justify-end gap-1">
                  {area ? (
                    <button
                      type="button"
                      disabled={busy}
                      className={actionClass}
                      aria-label={`Editar datos de ${name}`}
                      onClick={() => onEdit(area)}
                    >
                      <PiPencilSimple aria-hidden="true" size={18} />
                      <span>Datos</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    className={actionClass}
                    aria-label={`Ver ${name} en mapa`}
                    onClick={() => onMap(id)}
                  >
                    <PiMapTrifold aria-hidden="true" size={18} />
                    <span className="hidden sm:inline">Mapa</span>
                  </button>
                </div>
              </td>
            </tr>
            {expanded.has(id) ? (
              <tr>
                <td colSpan={4} className="bg-gray-50/60 px-4 pb-3 pt-1">
                  {area?.description ? (
                    <p className="mb-2 text-sm text-gray-500">{area.description}</p>
                  ) : null}
                  {animals.length ? (
                    <div className="flex flex-wrap gap-2">{animals.map(renderAnimal)}</div>
                  ) : (
                    <p className="py-2 text-sm text-gray-500">Sin animales asignados.</p>
                  )}
                </td>
              </tr>
            ) : null}
          </tbody>
        ))}
      </table>
    </div>
  )
}
