'use client'

import React, { useMemo } from 'react'
import {
  AnimalRecord,
  record_categories,
  record_category_icons,
  record_category_labels,
  record_type_labels,
} from '@/types/animals'
import { RecordFormState } from '@/types/records'
import DateTimeInput from './inputs/DateTimeInput'

export type { RecordFormState }

interface Props {
  value: RecordFormState
  onChange: (next: RecordFormState) => void
  mode?: 'single' | 'bulk'
}

const clinicalCategories: ReadonlyArray<AnimalRecord['category']> = [
  'illness',
  'injury',
  'treatment',
  'surgery',
]

export const RecordForm: React.FC<Props> = ({ value, onChange, mode = 'single' }) => {
  const noteCategories = useMemo(() => ['general', 'observation', 'other'] as const, [])

  // Para salud, excluir categorías propias de notas
  const healthCategories = useMemo(
    () =>
      record_categories.filter(
        (c) => c !== 'general' && c !== 'observation',
      ) as AnimalRecord['category'][],
    [],
  )

  const availableCategories: ReadonlyArray<AnimalRecord['category']> =
    value.type === 'note' ? noteCategories : healthCategories

  const isClinicalCategory = clinicalCategories.includes(value.category)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ">
      <div>
        <label className="block text-sm font-medium ">Tipo</label>
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
        <label className="block text-sm font-medium ">Categoría</label>
        <select
          value={value.category}
          onChange={(e) =>
            onChange({
              ...value,
              category: e.target.value as AnimalRecord['category'],
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
        <label className="block text-sm font-medium ">Título *</label>
        <input
          type="text"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          className="w-full border rounded-lg px-2 py-1.5 text-sm"
          required
        />
      </div>

      <div>
        <DateTimeInput
          value={value.date ? new Date(value.date) : null}
          onChange={(date) => {
            onChange({
              ...value,
              date: date ? date.toISOString().split('T')[0] : '',
            })
          }}
          label={mode === 'bulk' ? 'Fecha de aplicación' : 'Fecha'}
          type="date"
        />
      </div>

      {value.type === 'health' && isClinicalCategory && (
        <>
          <div>
            <label className="block text-sm font-medium ">Severidad</label>
            <select
              value={value.severity}
              onChange={(e) => onChange({ ...value, severity: e.target.value as any })}
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
              onChange={(e) => onChange({ ...value, isResolved: e.target.checked })}
            />
            <label htmlFor="resolved" className="text-sm">
              Caso resuelto
            </label>
          </div>
          {value.isResolved && (
            <div>
              <DateTimeInput
                value={value.resolvedDate ? new Date(value.resolvedDate) : null}
                onChange={(date) =>
                  onChange({
                    ...value,
                    resolvedDate: date ? date.toISOString().split('T')[0] : '',
                  })
                }
                label="Fecha de resolución"
                type="date"
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium ">Tratamiento</label>
            <input
              type="text"
              value={value.treatment}
              onChange={(e) => onChange({ ...value, treatment: e.target.value })}
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
        </>
      )}

      {value.type === 'health' && (
        <>
          <div>
            <DateTimeInput
              value={value.nextDueDate ? new Date(value.nextDueDate) : null}
              onChange={(date) =>
                onChange({
                  ...value,
                  nextDueDate: date ? date.toISOString().split('T')[0] : '',
                })
              }
              label="Próximo vencimiento"
              type="date"
            />
          </div>
          <div>
            <label className="block text-sm font-medium ">Lote / Batch</label>
            <input
              type="text"
              value={value.batch}
              onChange={(e) => onChange({ ...value, batch: e.target.value })}
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium ">Veterinario</label>
            <input
              type="text"
              value={value.veterinarian}
              onChange={(e) => onChange({ ...value, veterinarian: e.target.value })}
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium ">
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
        <label className="block text-sm font-medium ">Descripción</label>
        <textarea
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          className="w-full border rounded-lg px-2 py-1.5 text-sm resize-none field-sizing-content"
          rows={2}
          placeholder="Describe los detalles para agregar contexto..."
        />
      </div>
    </div>
  )
}

export default RecordForm
