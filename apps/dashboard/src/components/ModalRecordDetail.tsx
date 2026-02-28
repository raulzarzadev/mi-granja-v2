'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import React, { useState } from 'react'
import { Modal } from '@/components/Modal'
import RecordForm, { RecordFormState } from '@/components/RecordForm'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useReminders } from '@/hooks/useReminders'
import { buildRecordFromForm } from '@/lib/records'
import {
  Animal,
  AnimalRecord,
  record_category_colors,
  record_category_icons,
  record_category_labels,
  record_severity_labels,
  record_type_labels,
} from '@/types/animals'

export type RecordDetailRow =
  | (AnimalRecord & { animalId: string; animalNumber: string; __isGrouped?: false })
  | (AnimalRecord & {
      animalId: string
      animalNumber: string
      __isGrouped: true
      __animals: Array<{ id: string; number: string }>
    })

interface ModalRecordDetailProps {
  isOpen: boolean
  onClose: () => void
  record: RecordDetailRow | null
  animals: Animal[]
}

const clinicalCategories = ['illness', 'injury', 'treatment', 'surgery']

const ModalRecordDetail: React.FC<ModalRecordDetailProps> = ({
  isOpen,
  onClose,
  record,
  animals,
}) => {
  const { updateRecord, removeRecord, resolveRecord, reopenRecord } = useAnimalCRUD()
  const { createReminder } = useReminders()
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [form, setForm] = useState<RecordFormState | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!record) return null

  const isClinical = record.type === 'health' && clinicalCategories.includes(record.category)
  const isGrouped = !!record.__isGrouped

  const handleClose = () => {
    setMode('view')
    setForm(null)
    onClose()
  }

  const startEdit = () => {
    setForm({
      type: record.type,
      category: record.category,
      title: record.title,
      description: record.description || '',
      date: format(new Date(record.date), 'yyyy-MM-dd'),
      severity: (record.severity as any) || '',
      isResolved: !!record.isResolved,
      resolvedDate: record.resolvedDate
        ? format(new Date(record.resolvedDate), 'yyyy-MM-dd')
        : '',
      treatment: record.treatment || '',
      nextDueDate: record.nextDueDate
        ? format(new Date(record.nextDueDate), 'yyyy-MM-dd')
        : '',
      batch: record.batch || '',
      veterinarian: record.veterinarian || '',
      cost: record.cost?.toString() || '',
      createReminder: false,
      reminderDate: '',
    })
    setMode('edit')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !form.title.trim()) {
      alert('El titulo es requerido')
      return
    }
    setIsSubmitting(true)
    try {
      const data = buildRecordFromForm(form)
      if (isGrouped && record.__isGrouped) {
        await Promise.all(
          record.__animals.map((a) => updateRecord(a.id, record.id, data)),
        )
      } else {
        await updateRecord(record.animalId, record.id, data)
      }

      if (form.createReminder && form.reminderDate) {
        const [y, m, d] = form.reminderDate.split('-').map(Number)
        await createReminder({
          title: `Recordatorio: ${form.title}`,
          description: form.description || '',
          dueDate: new Date(y, m - 1, d),
          completed: false,
          priority: 'medium',
          type: form.type === 'health' ? 'medical' : 'other',
          animalNumber: record.animalNumber,
        })
      }

      handleClose()
    } catch (error) {
      console.error('Error al actualizar registro:', error)
      alert('Error al actualizar el registro.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este registro?')) return
    setIsSubmitting(true)
    try {
      if (isGrouped && record.__isGrouped) {
        await Promise.all(
          record.__animals.map((a) => removeRecord(a.id, record.id)),
        )
      } else {
        await removeRecord(record.animalId, record.id)
      }
      handleClose()
    } catch (error) {
      console.error('Error al eliminar registro:', error)
      alert('Error al eliminar el registro.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResolve = async () => {
    setIsSubmitting(true)
    try {
      if (isGrouped && record.__isGrouped) {
        await Promise.all(
          record.__animals.map((a) => resolveRecord(a.id, record.id)),
        )
      } else {
        await resolveRecord(record.animalId, record.id)
      }
      handleClose()
    } catch (error) {
      console.error('Error al resolver registro:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReopen = async () => {
    setIsSubmitting(true)
    try {
      if (isGrouped && record.__isGrouped) {
        await Promise.all(
          record.__animals.map((a) => reopenRecord(a.id, record.id)),
        )
      } else {
        await reopenRecord(record.animalId, record.id)
      }
      handleClose()
    } catch (error) {
      console.error('Error al reabrir registro:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (d: string | Date | undefined) => {
    if (!d) return '-'
    try {
      return format(new Date(d), 'dd/MM/yyyy', { locale: es })
    } catch {
      return '-'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Detalle de Registro" size="lg">
      {mode === 'view' ? (
        <div className="space-y-4">
          {/* Badge de categoria */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${record_category_colors[record.category]}`}
            >
              {record_category_icons[record.category]} {record_category_labels[record.category]}
            </span>
            <span className="text-sm text-gray-500">
              {record_type_labels[record.type]}
            </span>
            {isGrouped && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Masivo
              </span>
            )}
          </div>

          {/* Titulo */}
          <h3 className="text-lg font-semibold text-gray-900">{record.title}</h3>

          {/* Campos en grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium text-gray-600">Fecha:</span>{' '}
              {formatDate(record.date)}
            </div>

            {/* Animal(es) */}
            <div>
              <span className="font-medium text-gray-600">Animal(es):</span>{' '}
              {isGrouped && record.__isGrouped ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {record.__animals.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                    >
                      #{a.number}
                    </span>
                  ))}
                </div>
              ) : (
                <span>#{record.animalNumber}</span>
              )}
            </div>

            {record.description && (
              <div className="sm:col-span-2">
                <span className="font-medium text-gray-600">Descripcion:</span>{' '}
                <p className="mt-1 text-gray-800 whitespace-pre-wrap">{record.description}</p>
              </div>
            )}

            {record.severity && (
              <div>
                <span className="font-medium text-gray-600">Severidad:</span>{' '}
                {record_severity_labels[record.severity]}
              </div>
            )}

            {isClinical && (
              <div>
                <span className="font-medium text-gray-600">Estado:</span>{' '}
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    record.isResolved
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {record.isResolved ? 'Resuelto' : 'Activo'}
                </span>
              </div>
            )}

            {record.treatment && (
              <div className="sm:col-span-2">
                <span className="font-medium text-gray-600">Tratamiento:</span>{' '}
                {record.treatment}
              </div>
            )}

            {record.veterinarian && (
              <div>
                <span className="font-medium text-gray-600">Veterinario:</span>{' '}
                {record.veterinarian}
              </div>
            )}

            {record.batch && (
              <div>
                <span className="font-medium text-gray-600">Lote:</span> {record.batch}
              </div>
            )}

            {record.cost != null && record.cost !== 0 && (
              <div>
                <span className="font-medium text-gray-600">Costo:</span> ${record.cost}
              </div>
            )}

            {record.nextDueDate && (
              <div>
                <span className="font-medium text-gray-600">Proximo vencimiento:</span>{' '}
                <span className="text-orange-600">{formatDate(record.nextDueDate)}</span>
              </div>
            )}
          </div>

          {/* Botones de accion */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <button
              onClick={startEdit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Editar
            </button>

            {isClinical && (
              record.isResolved ? (
                <button
                  onClick={handleReopen}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                >
                  Reabrir
                </button>
              ) : (
                <button
                  onClick={handleResolve}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Resolver
                </button>
              )
            )}

            <button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      ) : (
        /* Modo edit */
        <form onSubmit={handleSave} className="space-y-4">
          {form && <RecordForm value={form} onChange={setForm} mode="single" />}

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('view')
                setForm(null)
              }}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default ModalRecordDetail
