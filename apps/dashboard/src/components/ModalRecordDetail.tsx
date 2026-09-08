'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import React, { useState } from 'react'
import { useAppFeedback } from '@/components/AppFeedbackProvider'
import { Modal } from '@/components/Modal'
import RecordForm, { RecordFormState } from '@/components/RecordForm'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useRecordMovements } from '@/hooks/useRecordMovements'
import { useReminders } from '@/hooks/useReminders'
import { buildRecordFromForm } from '@/lib/records'
import {
  Animal,
  AnimalRecord,
  getRecordTypeIcon,
  getRecordTypeLabel,
  record_category_colors,
  record_category_icons,
  record_category_labels,
  record_severity_labels,
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
const milkingSessionLabels = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  evening: 'Noche',
  total: 'Total del día',
} as const

const ModalRecordDetail: React.FC<ModalRecordDetailProps> = ({ isOpen, onClose, record }) => {
  const { confirmAction, notify } = useAppFeedback()
  const { animals, updateRecord, removeRecord, resolveRecord, reopenRecord, updateWeightRecord } =
    useAnimalCRUD()
  const { createReminder } = useReminders()
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [form, setForm] = useState<RecordFormState | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const movements = useRecordMovements(animals)
  if (!record) return null

  const isClinical = record.type === 'health' && clinicalCategories.includes(record.category)
  const isSystemEvent = record.type === 'event'
  const isUndoableMovement =
    !record.undoneAt &&
    Boolean(record.undoData?.documents?.length || record.undoData?.previousAnimalStates?.length)
  const isGrouped = !!record.__isGrouped

  const handleClose = () => {
    setMode('view')
    setForm(null)
    onClose()
  }

  const startEdit = () => {
    // Para registros de peso, extraer el valor del título (e.g. "33.0 kg")
    let weightValue = ''
    let weightUnit: 'kg' | 'lb' = 'kg'
    if (record.type === 'weight') {
      if (typeof record.weightGrams === 'number') {
        weightValue = (record.weightGrams / 1000).toString()
      } else {
        const match = record.title.match(/^([\d.]+)\s*(kg|lb)$/i)
        if (match) {
          weightValue = match[1]
          weightUnit = match[2].toLowerCase() as 'kg' | 'lb'
        }
      }
    }

    setForm({
      type: record.type,
      category: record.category,
      title: record.title,
      description: record.description || '',
      date: format(new Date(record.date), 'yyyy-MM-dd'),
      severity: (record.severity as any) || '',
      isResolved: !!record.isResolved,
      resolvedDate: record.resolvedDate ? format(new Date(record.resolvedDate), 'yyyy-MM-dd') : '',
      treatment: record.treatment || '',
      nextDueDate: record.nextDueDate ? format(new Date(record.nextDueDate), 'yyyy-MM-dd') : '',
      batch: record.batch || '',
      veterinarian: record.veterinarian || '',
      cost: record.cost?.toString() || '',
      createReminder: false,
      reminderDate: '',
      reminderTitle: '',
      weight: weightValue,
      weightUnit,
      expenseCategory: (record as any).expenseCategory || 'feed',
      supplier: (record as any).supplier || '',
    })
    setMode('edit')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return

    // Validar según tipo
    if (form.type === 'weight') {
      if (!form.weight || parseFloat(form.weight) <= 0) {
        notify('Ingresa un peso válido', 'info')
        return
      }
    } else if (!form.title.trim()) {
      notify('El título es requerido', 'info')
      return
    }

    setIsSubmitting(true)
    try {
      let data: Partial<AnimalRecord>

      if (form.type === 'weight') {
        // Para peso, reconstruir el título desde el valor
        const weightKg =
          form.weightUnit === 'kg' ? parseFloat(form.weight) : parseFloat(form.weight) * 0.453592
        data = {
          type: 'weight',
          category: 'general',
          title: `${weightKg.toFixed(1)} kg`,
          weightGrams: Math.round(weightKg * 1000),
          date: form.date ? new Date(form.date) : new Date(),
          description: form.description || undefined,
        }

        const weightGrams = Math.round(weightKg * 1000)
        const targets =
          isGrouped && record.__isGrouped ? record.__animals : [{ id: record.animalId }]
        await Promise.all(
          targets.map((target) =>
            updateWeightRecord(target.id, record.id, {
              date: form.date ? new Date(form.date) : new Date(),
              weight: weightGrams,
              ...(form.description ? { notes: form.description } : {}),
            }),
          ),
        )
      } else {
        data = buildRecordFromForm(form)
        if (isGrouped && record.__isGrouped) {
          await Promise.all(record.__animals.map((a) => updateRecord(a.id, record.id, data)))
        } else {
          await updateRecord(record.animalId, record.id, data)
        }
      }

      if (form.createReminder && form.reminderDate) {
        const [y, m, d] = form.reminderDate.split('-').map(Number)
        const reminderTitle = form.reminderTitle?.trim() || `Recordatorio: ${form.title || 'Peso'}`
        await createReminder({
          title: reminderTitle,
          description: form.description || '',
          dueDate: new Date(y, m - 1, d),
          completed: false,
          priority: 'medium',
          type: form.type === 'health' ? 'medical' : form.type === 'weight' ? 'weight' : 'other',
          animalNumber: record.animalNumber,
        })
      }

      handleClose()
    } catch (error) {
      console.error('Error al actualizar registro:', error)
      notify('Error al actualizar el registro.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (record.undoData?.documents) return
    const confirmed = await confirmAction({
      title: 'Eliminar registro',
      message: '¿Eliminar este registro?',
      confirmLabel: 'Eliminar',
      danger: true,
    })
    if (!confirmed) return
    setIsSubmitting(true)
    try {
      if (isGrouped && record.__isGrouped) {
        await Promise.all(record.__animals.map((a) => removeRecord(a.id, record.id)))
      } else {
        await removeRecord(record.animalId, record.id)
      }
      handleClose()
    } catch (error) {
      console.error('Error al eliminar registro:', error)
      notify('Error al eliminar el registro.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUndoMovement = async () => {
    if (
      !(await confirmAction({
        title: 'Deshacer movimiento',
        message:
          'Se revertirán los cambios de este movimiento y quedará marcado como deshecho en el historial.',
        confirmLabel: 'Deshacer',
      }))
    )
      return
    setIsSubmitting(true)
    try {
      await movements.undo({
        ...record,
        appliedToAnimals: record.appliedToAnimals?.length
          ? record.appliedToAnimals
          : [record.animalId],
      })
      handleClose()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo deshacer el movimiento.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResolve = async () => {
    setIsSubmitting(true)
    try {
      if (isGrouped && record.__isGrouped) {
        await Promise.all(record.__animals.map((a) => resolveRecord(a.id, record.id)))
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
        await Promise.all(record.__animals.map((a) => reopenRecord(a.id, record.id)))
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
            {isSystemEvent ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                ⚡ Acción
              </span>
            ) : (
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${record_category_colors[record.category]}`}
              >
                {record_category_icons[record.category]} {record_category_labels[record.category]}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-sm text-gray-500">
              {getRecordTypeIcon(record)} {getRecordTypeLabel(record)}
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
              <span className="font-medium text-gray-600">Fecha:</span> {formatDate(record.date)}
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

            {record.undoneAt && <p className="text-gray-600 sm:col-span-2">Movimiento deshecho</p>}
            {record.eventType && !record.undoneAt && !isUndoableMovement && (
              <p className="text-sm text-gray-600 sm:col-span-2">
                Este registro anterior no conserva el estado previo necesario para deshacerlo de
                forma segura.
              </p>
            )}
            {Object.entries(record.details ?? {}).map(([label, value]) => (
              <div key={label} className="sm:col-span-2">
                <span className="font-medium text-gray-600">{label}:</span> {value}
              </div>
            ))}
            {record.eventType === 'muerte' && !record.details?.Motivo && record.notes && (
              <p className="sm:col-span-2">
                <strong>Motivo:</strong> {record.notes}
              </p>
            )}
            {record.description && (
              <div className="sm:col-span-2">
                <span className="font-medium text-gray-600">Descripcion:</span>{' '}
                <p className="mt-1 text-gray-800 whitespace-pre-wrap">{record.description}</p>
              </div>
            )}

            {record.type === 'milk' && typeof record.amountMl === 'number' && (
              <div>
                <span className="font-medium text-gray-600">Cantidad:</span>{' '}
                {(record.amountMl / 1000).toLocaleString('es-MX', {
                  maximumFractionDigits: 3,
                })}{' '}
                L
              </div>
            )}

            {record.type === 'milk' && record.session && (
              <div>
                <span className="font-medium text-gray-600">Turno:</span>{' '}
                {milkingSessionLabels[record.session]}
              </div>
            )}

            {record.notes && (
              <div className="sm:col-span-2">
                <span className="font-medium text-gray-600">Notas:</span>{' '}
                <p className="mt-1 whitespace-pre-wrap text-gray-800">{record.notes}</p>
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
                <span className="font-medium text-gray-600">Tratamiento:</span> {record.treatment}
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
            {record.type !== 'milk' && !isSystemEvent && !isUndoableMovement && (
              <button
                onClick={startEdit}
                disabled={isSubmitting}
                className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50"
              >
                Editar
              </button>
            )}

            {isClinical &&
              (record.isResolved ? (
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
              ))}

            <button
              onClick={handleDelete}
              hidden={Boolean(record.undoData?.documents)}
              disabled={isSubmitting}
              className="min-h-11 rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              Eliminar
            </button>

            {isUndoableMovement && (
              <button
                onClick={handleUndoMovement}
                disabled={isSubmitting}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:opacity-50"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 14 4 9l5-5" />
                  <path d="M4 9h10.5a4.5 4.5 0 0 1 0 9H13" />
                </svg>
                Deshacer movimiento
              </button>
            )}
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
