'use client'

import React, { useMemo, useState } from 'react'
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

  // Auto-expand health details if any health field has a value (editing mode)
  const hasHealthValues =
    !!value.severity ||
    !!value.treatment ||
    !!value.nextDueDate ||
    !!value.batch ||
    !!value.veterinarian ||
    !!value.cost ||
    value.isResolved

  const [healthDetailsOpen, setHealthDetailsOpen] = useState(hasHealthValues)

  return (
    <div className="space-y-3">
      {/* Core fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Tipo</label>
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
          <label className="block text-sm font-medium">Categoria</label>
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
          <label className="block text-sm font-medium">Titulo *</label>
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
            label={mode === 'bulk' ? 'Fecha de aplicacion' : 'Fecha'}
            type="date"
          />
        </div>

        <div className="sm:col-span-2 space-y-2">
          <div className="flex items-center gap-2">
            <input
              id="createReminder"
              type="checkbox"
              checked={value.createReminder}
              onChange={(e) =>
                onChange({
                  ...value,
                  createReminder: e.target.checked,
                  reminderDate: e.target.checked ? value.reminderDate || value.date : '',
                })
              }
            />
            <label htmlFor="createReminder" className="text-sm">
              Activar recordatorio
            </label>
          </div>
          {value.createReminder && (
            <DateTimeInput
              value={value.reminderDate ? new Date(value.reminderDate) : null}
              onChange={(date) =>
                onChange({
                  ...value,
                  reminderDate: date ? date.toISOString().split('T')[0] : '',
                })
              }
              label="Fecha del recordatorio"
              type="date"
            />
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Descripcion</label>
          <textarea
            value={value.description}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            className="w-full border rounded-lg px-2 py-1.5 text-sm resize-none field-sizing-content"
            rows={2}
            placeholder="Describe los detalles para agregar contexto..."
          />
        </div>
      </div>

      {/* Collapsible health details */}
      {value.type === 'health' && (
        <div className="border border-gray-200 rounded-lg">
          <button
            type="button"
            onClick={() => setHealthDetailsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <span>
              Detalles de salud
              {hasHealthValues && (
                <span className="ml-2 inline-flex w-2 h-2 rounded-full bg-blue-500" />
              )}
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${healthDetailsOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {healthDetailsOpen && (
            <div className="px-3 pb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isClinicalCategory && (
                  <>
                    <div>
                      <label className="block text-sm font-medium">Severidad</label>
                      <select
                        value={value.severity}
                        onChange={(e) => onChange({ ...value, severity: e.target.value as any })}
                        className="w-full border rounded-lg px-2 py-1.5 text-sm"
                      >
                        <option value="">Sin especificar</option>
                        <option value="low">Leve</option>
                        <option value="medium">Moderada</option>
                        <option value="high">Alta</option>
                        <option value="critical">Critica</option>
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
                          label="Fecha de resolucion"
                          type="date"
                        />
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium">Tratamiento</label>
                      <input
                        type="text"
                        value={value.treatment}
                        onChange={(e) => onChange({ ...value, treatment: e.target.value })}
                        className="w-full border rounded-lg px-2 py-1.5 text-sm"
                      />
                    </div>
                  </>
                )}

                <div>
                  <DateTimeInput
                    value={value.nextDueDate ? new Date(value.nextDueDate) : null}
                    onChange={(date) =>
                      onChange({
                        ...value,
                        nextDueDate: date ? date.toISOString().split('T')[0] : '',
                      })
                    }
                    label="Proximo vencimiento"
                    type="date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Lote / Batch</label>
                  <input
                    type="text"
                    value={value.batch}
                    onChange={(e) => onChange({ ...value, batch: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Veterinario</label>
                  <input
                    type="text"
                    value={value.veterinarian}
                    onChange={(e) => onChange({ ...value, veterinarian: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
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
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RecordForm
