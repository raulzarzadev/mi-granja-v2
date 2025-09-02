'use client'

import React, { useMemo } from 'react'
import {
  AnimalRecord,
  record_category_icons,
  record_category_labels,
  record_categories,
  record_type_labels
} from '@/types/animals'

export type RecordFormState = {
  type: AnimalRecord['type']
  category: AnimalRecord['category']
  title: string
  description: string
  date: string // yyyy-MM-dd
  severity: '' | NonNullable<AnimalRecord['severity']>
  isResolved: boolean
  resolvedDate: string // yyyy-MM-dd | ''
  treatment: string
  nextDueDate: string // yyyy-MM-dd | ''
  batch: string
  veterinarian: string
  cost: string
}

interface Props {
  value: RecordFormState
  onChange: (next: RecordFormState) => void
  mode?: 'single' | 'bulk'
}

const clinicalCategories: ReadonlyArray<AnimalRecord['category']> = [
  'illness',
  'injury',
  'treatment',
  'surgery'
]

export const RecordForm: React.FC<Props> = ({
  value,
  onChange,
  mode = 'single'
}) => {
  const noteCategories = useMemo(
    () => ['general', 'observation', 'other'] as const,
    []
  )

  // Para salud, excluir categorías propias de notas
  const healthCategories = useMemo(
    () =>
      record_categories.filter(
        (c) => c !== 'general' && c !== 'observation'
      ) as AnimalRecord['category'][],
    []
  )

  const availableCategories: ReadonlyArray<AnimalRecord['category']> =
    value.type === 'note' ? noteCategories : healthCategories

  const isClinicalCategory = clinicalCategories.includes(value.category)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-medium mb-1">Tipo</label>
        <select
          value={value.type}
          onChange={(e) => {
            const t = e.target.value as AnimalRecord['type']
            const firstCat = (
              t === 'note' ? noteCategories[0] : healthCategories[0]
            ) as AnimalRecord['category']
            onChange({ ...value, type: t, category: firstCat })
          }}
          className="w-full border rounded-lg px-2 py-1.5 text-sm"
        >
          {(['note', 'health'] as const).map((t) => (
            <option key={t} value={t}>
              {record_type_labels[t]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Categoría</label>
        <select
          value={value.category}
          onChange={(e) =>
            onChange({
              ...value,
              category: e.target.value as AnimalRecord['category']
            })
          }
          className="w-full border rounded-lg px-2 py-1.5 text-sm"
        >
          {availableCategories.map((c) => (
            <option key={c} value={c}>
              {record_category_icons[c]} {record_category_labels[c]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Título *</label>
        <input
          type="text"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          className="w-full border rounded-lg px-2 py-1.5 text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {mode === 'bulk' ? 'Fecha de aplicación' : 'Fecha'}
        </label>
        <input
          type="date"
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
          className="w-full border rounded-lg px-2 py-1.5 text-sm"
        />
      </div>

      {value.type === 'health' && isClinicalCategory && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Severidad</label>
            <select
              value={value.severity}
              onChange={(e) =>
                onChange({ ...value, severity: e.target.value as any })
              }
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
            >
              <option value="">Sin especificar</option>
              <option value="low">Leve</option>
              <option value="medium">Moderada</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="resolved"
              type="checkbox"
              checked={value.isResolved}
              onChange={(e) =>
                onChange({ ...value, isResolved: e.target.checked })
              }
            />
            <label htmlFor="resolved" className="text-sm">
              Caso resuelto
            </label>
          </div>
          {value.isResolved && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Fecha de resolución
              </label>
              <input
                type="date"
                value={value.resolvedDate}
                onChange={(e) =>
                  onChange({ ...value, resolvedDate: e.target.value })
                }
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Tratamiento
            </label>
            <input
              type="text"
              value={value.treatment}
              onChange={(e) =>
                onChange({ ...value, treatment: e.target.value })
              }
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
        </>
      )}

      {value.type === 'health' && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">
              Próximo vencimiento
            </label>
            <input
              type="date"
              value={value.nextDueDate}
              onChange={(e) =>
                onChange({ ...value, nextDueDate: e.target.value })
              }
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Lote / Batch
            </label>
            <input
              type="text"
              value={value.batch}
              onChange={(e) => onChange({ ...value, batch: e.target.value })}
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Veterinario
            </label>
            <input
              type="text"
              value={value.veterinarian}
              onChange={(e) =>
                onChange({ ...value, veterinarian: e.target.value })
              }
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {mode === 'bulk' ? 'Costo por animal' : 'Costo'}
            </label>
            <input
              type="number"
              step="0.01"
              value={value.cost}
              onChange={(e) => onChange({ ...value, cost: e.target.value })}
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
        </>
      )}

      <div className="sm:col-span-2">
        <label className="block text-sm font-medium mb-1">Descripción</label>
        <textarea
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          className="w-full border rounded-lg px-2 py-1.5 text-sm"
          rows={2}
        />
      </div>
    </div>
  )
}

export default RecordForm
