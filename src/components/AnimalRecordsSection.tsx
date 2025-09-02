'use client'

import React, { useMemo, useState } from 'react'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import {
  Animal,
  AnimalRecord,
  record_category_labels,
  record_category_icons,
  record_category_colors,
  record_type_labels,
  record_categories
} from '@/types/animals'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
  animal: Animal
}

type UnifiedRecord = AnimalRecord

const AnimalRecordsSection: React.FC<Props> = ({ animal }) => {
  const { addRecord, updateRecord, removeRecord, resolveRecord, reopenRecord } =
    useAnimalCRUD()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<UnifiedRecord | null>(null)
  const [form, setForm] = useState({
    type: 'note' as AnimalRecord['type'],
    category: 'general' as AnimalRecord['category'],
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    // clínico
    severity: '' as '' | NonNullable<AnimalRecord['severity']>,
    isResolved: false,
    resolvedDate: '',
    treatment: '',
    // salud
    nextDueDate: '',
    batch: '',
    veterinarian: '',
    cost: '',
    notes: ''
  })

  const unifiedRecords: UnifiedRecord[] = useMemo(() => {
    const unified = [...((animal.records as UnifiedRecord[]) || [])]
    return unified.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [animal.records])

  const resetForm = () => {
    setEditing(null)
    setForm({
      type: 'note',
      category: 'general',
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      severity: '',
      isResolved: false,
      resolvedDate: '',
      treatment: '',
      nextDueDate: '',
      batch: '',
      veterinarian: '',
      cost: '',
      notes: ''
    })
    setIsFormOpen(false)
  }

  const categoryOptions = (type: AnimalRecord['type']) => {
    if (type === 'note') return ['general', 'observation', 'other'] as const
    // Todo lo médico va a 'health' con categorías clínicas allí
    return record_categories
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return alert('El título es requerido')

    const base: Partial<AnimalRecord> = {
      type: form.type,
      category: form.category as any,
      title: form.title.trim(),
      description: form.description?.trim() || undefined,
      date: new Date(form.date),
      notes: form.notes?.trim() || undefined
    }

    if (
      form.type === 'health' &&
      ['illness', 'injury', 'treatment', 'surgery'].includes(
        form.category as any
      )
    ) {
      Object.assign(base, {
        severity: form.severity || undefined,
        isResolved: !!form.isResolved,
        resolvedDate: form.resolvedDate
          ? new Date(form.resolvedDate)
          : undefined,
        treatment: form.treatment?.trim() || undefined
      })
    }

    if (form.type === 'health') {
      Object.assign(base, {
        nextDueDate: form.nextDueDate ? new Date(form.nextDueDate) : undefined,
        batch: form.batch?.trim() || undefined,
        veterinarian: form.veterinarian?.trim() || undefined,
        cost: form.cost ? parseFloat(form.cost) : undefined
      })
    }

    if (editing) {
      await updateRecord(animal.id, editing.id, base)
    } else {
      await addRecord(
        animal.id,
        base as Omit<AnimalRecord, 'id' | 'createdAt' | 'createdBy'>
      )
    }
    resetForm()
  }

  const onEdit = (rec: UnifiedRecord) => {
    setEditing(rec)
    setIsFormOpen(true)
    setForm({
      type: rec.type,
      category: rec.category,
      title: rec.title,
      description: rec.description || '',
      date: format(new Date(rec.date), 'yyyy-MM-dd'),
      severity: (rec.severity as any) || '',
      isResolved: !!rec.isResolved,
      resolvedDate: rec.resolvedDate
        ? format(new Date(rec.resolvedDate), 'yyyy-MM-dd')
        : '',
      treatment: rec.treatment || '',
      nextDueDate: rec.nextDueDate
        ? format(new Date(rec.nextDueDate), 'yyyy-MM-dd')
        : '',
      batch: rec.batch || '',
      veterinarian: rec.veterinarian || '',
      cost: rec.cost?.toString() || '',
      notes: rec.notes || ''
    })
  }

  const onDelete = async (id: string) => {
    if (!confirm('¿Eliminar registro?')) return
    await removeRecord(animal.id, id)
  }

  const TypeBadge = ({ rec }: { rec: UnifiedRecord }) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        record_category_colors[rec.category]
      }`}
    >
      {record_category_icons[rec.category]}{' '}
      {record_category_labels[rec.category]}
    </span>
  )

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Registro unificado</h3>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
        >
          ➕ Nuevo registro
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">
              {editing ? 'Editar registro' : 'Nuevo registro'}
            </h4>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => {
                    const t = e.target.value as AnimalRecord['type']
                    setForm((f) => ({
                      ...f,
                      type: t,
                      category: categoryOptions(t)[0] as any
                    }))
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
                <label className="block text-sm font-medium mb-1">
                  Categoría
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value as any }))
                  }
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                >
                  {categoryOptions(form.type).map((c) => (
                    <option key={c} value={c}>
                      {
                        record_category_labels[
                          c as keyof typeof record_category_labels
                        ]
                      }
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                />
              </div>

              {form.type === 'health' &&
                ['illness', 'injury', 'treatment', 'surgery'].includes(
                  form.category as any
                ) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Severidad
                      </label>
                      <select
                        value={form.severity}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            severity: e.target.value as any
                          }))
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
                        checked={form.isResolved}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            isResolved: e.target.checked
                          }))
                        }
                      />
                      <label htmlFor="resolved" className="text-sm">
                        Caso resuelto
                      </label>
                    </div>
                    {form.isResolved && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Fecha de resolución
                        </label>
                        <input
                          type="date"
                          value={form.resolvedDate}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              resolvedDate: e.target.value
                            }))
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
                        value={form.treatment}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, treatment: e.target.value }))
                        }
                        className="w-full border rounded-lg px-2 py-1.5 text-sm"
                      />
                    </div>
                  </>
                )}

              {form.type === 'health' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Próximo vencimiento
                    </label>
                    <input
                      type="date"
                      value={form.nextDueDate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nextDueDate: e.target.value }))
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
                      value={form.batch}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, batch: e.target.value }))
                      }
                      className="w-full border rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Veterinario
                    </label>
                    <input
                      type="text"
                      value={form.veterinarian}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, veterinarian: e.target.value }))
                      }
                      className="w-full border rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Costo
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.cost}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, cost: e.target.value }))
                      }
                      className="w-full border rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                </>
              )}

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Descripción
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  rows={2}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
              >
                {editing ? 'Actualizar' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {unifiedRecords.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📋</div>
          <p>No hay registros aún</p>
        </div>
      ) : (
        <div className="space-y-2">
          {unifiedRecords.map((rec) => (
            <div
              key={rec.id}
              className="border border-gray-200 rounded-lg p-3 bg-white"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <TypeBadge rec={rec} />
                    <span className="font-medium">{rec.title}</span>
                    {/* Sin badge legacy, datos ya unificados */}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      📅{' '}
                      {format(new Date(rec.date), 'dd/MM/yyyy', { locale: es })}
                      {rec.nextDueDate && (
                        <span className="ml-2 text-xs text-yellow-700">
                          ⏰ Próximo:{' '}
                          {format(new Date(rec.nextDueDate), 'dd/MM/yyyy', {
                            locale: es
                          })}
                        </span>
                      )}
                    </div>
                    {rec.description && <div>📝 {rec.description}</div>}
                    {rec.veterinarian && <div>👨‍⚕️ {rec.veterinarian}</div>}
                    {rec.cost !== undefined && <div>💰 ${rec.cost}</div>}
                    {rec.severity && (
                      <div>
                        <span className="text-xs text-gray-500 mr-1">
                          Severidad:
                        </span>
                        {rec.severity}
                      </div>
                    )}
                    {rec.isResolved && rec.resolvedDate && (
                      <div className="text-xs text-green-700">
                        Resuelto:{' '}
                        {format(new Date(rec.resolvedDate), 'dd/MM/yyyy', {
                          locale: es
                        })}
                      </div>
                    )}
                  </div>
                </div>
                {
                  <div className="flex gap-1 ml-2">
                    {rec.type === 'health' &&
                      ['illness', 'injury', 'treatment', 'surgery'].includes(
                        rec.category as any
                      ) &&
                      !rec.isResolved && (
                        <button
                          onClick={() => resolveRecord(animal.id, rec.id)}
                          className="text-green-700 hover:text-green-900 text-sm px-2 py-1"
                          title="Marcar resuelto"
                        >
                          ✅
                        </button>
                      )}
                    {rec.type === 'health' &&
                      ['illness', 'injury', 'treatment', 'surgery'].includes(
                        rec.category as any
                      ) &&
                      rec.isResolved && (
                        <button
                          onClick={() => reopenRecord(animal.id, rec.id)}
                          className="text-yellow-700 hover:text-yellow-900 text-sm px-2 py-1"
                          title="Reabrir caso"
                        >
                          ♻️
                        </button>
                      )}
                    <button
                      onClick={() => onEdit(rec)}
                      className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1"
                      title="Editar registro"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDelete(rec.id)}
                      className="text-red-600 hover:text-red-800 text-sm px-2 py-1"
                      title="Eliminar registro"
                    >
                      🗑️
                    </button>
                  </div>
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AnimalRecordsSection
