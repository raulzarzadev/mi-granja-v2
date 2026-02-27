'use client'

import { format } from 'date-fns'
import React, { useMemo, useState } from 'react'
import RecordForm, { RecordFormState } from '@/components/RecordForm'
import RecordRow from '@/components/RecordRow'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { buildRecordFromForm, getTodayLocalDateString } from '@/lib/records'
import { Animal, AnimalRecord } from '@/types/animals'

interface Props {
  animal: Animal
}

type UnifiedRecord = AnimalRecord

const AnimalRecordsSection: React.FC<Props> = ({ animal }) => {
  const { addRecord, updateRecord, removeRecord, resolveRecord, reopenRecord } = useAnimalCRUD()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<UnifiedRecord | null>(null)
  const initialFormState = (): RecordFormState => ({
    type: 'note',
    category: 'general',
    title: '',
    description: '',
    date: getTodayLocalDateString(),
    severity: '',
    isResolved: false,
    resolvedDate: '',
    treatment: '',
    nextDueDate: '',
    batch: '',
    veterinarian: '',
    cost: '',
  })
  const [form, setForm] = useState<RecordFormState>(() => initialFormState())

  const unifiedRecords: UnifiedRecord[] = useMemo(() => {
    const unified = [...((animal.records as UnifiedRecord[]) || [])]
    return unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [animal.records])

  const resetForm = () => {
    setEditing(null)
    setForm(initialFormState())
    setIsFormOpen(false)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return alert('El título es requerido')

    const base = buildRecordFromForm(form)

    if (editing) {
      await updateRecord(animal.id, editing.id, base)
    } else {
      await addRecord(animal.id, base as Omit<AnimalRecord, 'id' | 'createdAt' | 'createdBy'>)
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
      resolvedDate: rec.resolvedDate ? format(new Date(rec.resolvedDate), 'yyyy-MM-dd') : '',
      treatment: rec.treatment || '',
      nextDueDate: rec.nextDueDate ? format(new Date(rec.nextDueDate), 'yyyy-MM-dd') : '',
      batch: rec.batch || '',
      veterinarian: rec.veterinarian || '',
      cost: rec.cost?.toString() || '',
    })
  }

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
            <h4 className="font-medium">{editing ? 'Editar registro' : 'Nuevo registro'}</h4>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
          <form onSubmit={onSubmit} className="space-y-3">
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
            <RecordRow
              key={rec.id}
              rec={rec}
              onEdit={onEdit}
              onDelete={async (id) => {
                if (!confirm('¿Eliminar registro?')) return
                await removeRecord(animal.id, id)
              }}
              onResolve={(id) => resolveRecord(animal.id, id)}
              onReopen={(id) => reopenRecord(animal.id, id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default AnimalRecordsSection
