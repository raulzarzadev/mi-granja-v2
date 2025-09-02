'use client'

import React, { useMemo, useState } from 'react'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import {
  Animal,
  AnimalRecord,
  record_category_labels,
  record_category_icons,
  record_category_colors
} from '@/types/animals'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import RecordForm, { RecordFormState } from '@/components/RecordForm'
import { buildRecordFromForm } from '@/lib/records'

interface Props {
  animal: Animal
}

type UnifiedRecord = AnimalRecord

const AnimalRecordsSection: React.FC<Props> = ({ animal }) => {
  const { addRecord, updateRecord, removeRecord, resolveRecord, reopenRecord } =
    useAnimalCRUD()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<UnifiedRecord | null>(null)
  const [form, setForm] = useState<RecordFormState>({
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
    cost: ''
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
      cost: ''
    })
    setIsFormOpen(false)
  }

  // opciones de categoría ahora las maneja RecordForm

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return alert('El título es requerido')

    const base = buildRecordFromForm(form)

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
      cost: rec.cost?.toString() || ''
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
        <div className="bg-gray-50 rounded-lg p-3 space-y-3 ">
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
          <form onSubmit={onSubmit} className="space-y-3 ">
            <RecordForm value={form} onChange={setForm} mode="single" />

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
