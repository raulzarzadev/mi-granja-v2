'use client'

import React, { useState } from 'react'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import {
  HealthEvent,
  health_event_types,
  health_event_types_labels,
  health_event_types_icons,
  health_event_types_colors,
  Animal
} from '@/types/animals'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface HealthHistorySectionProps {
  animal: Animal
}

const HealthHistorySection: React.FC<HealthHistorySectionProps> = ({
  animal
}) => {
  const { addHealthEvent, removeHealthEvent, updateHealthEvent } =
    useAnimalCRUD()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<HealthEvent | null>(null)

  const [formData, setFormData] = useState({
    type: 'vaccine' as HealthEvent['type'],
    name: '',
    applicationDate: new Date().toISOString().split('T')[0],
    nextDueDate: '',
    batch: '',
    veterinarian: '',
    cost: '',
    notes: ''
  })

  const healthHistory = animal.healthHistory || []

  // Ordenar eventos por fecha de aplicación (más recientes primero)
  const sortedEvents = [...healthHistory].sort(
    (a, b) =>
      new Date(b.applicationDate).getTime() -
      new Date(a.applicationDate).getTime()
  )

  const resetForm = () => {
    setFormData({
      type: 'vaccine',
      name: '',
      applicationDate: new Date().toISOString().split('T')[0],
      nextDueDate: '',
      batch: '',
      veterinarian: '',
      cost: '',
      notes: ''
    })
    setEditingEvent(null)
    setIsFormOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('El nombre del evento es requerido')
      return
    }

    try {
      // Preparar los datos limpiando campos vacíos
      const eventData = {
        type: formData.type,
        name: formData.name.trim(),
        applicationDate: new Date(formData.applicationDate),
        ...(formData.nextDueDate
          ? { nextDueDate: new Date(formData.nextDueDate) }
          : {}),
        ...(formData.batch ? { batch: formData.batch.trim() } : {}),
        ...(formData.veterinarian
          ? { veterinarian: formData.veterinarian.trim() }
          : {}),
        ...(formData.cost ? { cost: parseFloat(formData.cost) } : {}),
        ...(formData.notes ? { notes: formData.notes.trim() } : {})
      }

      if (editingEvent) {
        await updateHealthEvent(animal.id, editingEvent.id, eventData)
      } else {
        await addHealthEvent(animal.id, eventData)
      }

      resetForm()
    } catch (error) {
      console.error('Error al guardar evento de salud:', error)
    }
  }

  const handleEdit = (event: HealthEvent) => {
    setEditingEvent(event)
    setFormData({
      type: event.type,
      name: event.name,
      applicationDate: format(new Date(event.applicationDate), 'yyyy-MM-dd'),
      nextDueDate: event.nextDueDate
        ? format(new Date(event.nextDueDate), 'yyyy-MM-dd')
        : '',
      batch: event.batch || '',
      veterinarian: event.veterinarian || '',
      cost: event.cost?.toString() || '',
      notes: event.notes || ''
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (eventId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este evento de salud?')) {
      await removeHealthEvent(animal.id, eventId)
    }
  }

  const getEventTypeIcon = (type: HealthEvent['type']) => {
    return health_event_types_icons[type] || '💉'
  }

  const getEventTypeColor = (type: HealthEvent['type']) => {
    return health_event_types_colors[type] || 'blue'
  }

  const isOverdue = (event: HealthEvent) => {
    if (!event.nextDueDate) return false
    return new Date(event.nextDueDate) < new Date()
  }

  const getDaysUntilDue = (event: HealthEvent) => {
    if (!event.nextDueDate) return null
    const days = Math.ceil(
      (new Date(event.nextDueDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    )
    return days
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Botón para agregar nuevo evento */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Historial de Salud</h3>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 transition-colors"
        >
          💉 Agregar Evento
        </button>
      </div>

      {/* Formulario de evento de salud */}
      {isFormOpen && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">
              {editingEvent
                ? 'Editar Evento de Salud'
                : 'Nuevo Evento de Salud'}
            </h4>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tipo de Evento
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as HealthEvent['type']
                    })
                  }
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  required
                >
                  {health_event_types.map((type) => (
                    <option key={type} value={type}>
                      {getEventTypeIcon(type)} {health_event_types_labels[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Nombre/Producto *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  placeholder="Ej: Vacuna Triple, Vitamina B12..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha de Aplicación
                </label>
                <input
                  type="date"
                  value={formData.applicationDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      applicationDate: e.target.value
                    })
                  }
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Próximo Vencimiento
                </label>
                <input
                  type="date"
                  value={formData.nextDueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, nextDueDate: e.target.value })
                  }
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Lote/Batch
                </label>
                <input
                  type="text"
                  value={formData.batch}
                  onChange={(e) =>
                    setFormData({ ...formData, batch: e.target.value })
                  }
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  placeholder="Número de lote"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Veterinario
                </label>
                <input
                  type="text"
                  value={formData.veterinarian}
                  onChange={(e) =>
                    setFormData({ ...formData, veterinarian: e.target.value })
                  }
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  placeholder="Nombre del veterinario"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Costo</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notas</label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
                rows={2}
                placeholder="Observaciones adicionales..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                {editingEvent ? 'Actualizar' : 'Guardar'} Evento
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de eventos de salud */}
      {sortedEvents.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-green-700">
            Historial de Salud ({sortedEvents.length})
          </h4>
          {sortedEvents.map((event) => {
            const daysUntilDue = getDaysUntilDue(event)
            const overdue = isOverdue(event)

            return (
              <div
                key={event.id}
                className={`border rounded-lg p-3 ${
                  overdue
                    ? 'border-red-300 bg-red-50'
                    : daysUntilDue && daysUntilDue <= 7
                    ? 'border-yellow-300 bg-yellow-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-${getEventTypeColor(event.type)}-600`}
                      >
                        {getEventTypeIcon(event.type)}
                      </span>
                      <span className="font-medium">{event.name}</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium bg-${getEventTypeColor(
                          event.type
                        )}-100 text-${getEventTypeColor(event.type)}-700`}
                      >
                        {health_event_types_labels[event.type]}
                      </span>
                      {event.isBulkApplication && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          Aplicación Masiva
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        📅 Aplicado:{' '}
                        {format(new Date(event.applicationDate), 'dd/MM/yyyy', {
                          locale: es
                        })}
                      </div>

                      {event.nextDueDate && (
                        <div
                          className={
                            overdue
                              ? 'text-red-600 font-medium'
                              : daysUntilDue && daysUntilDue <= 7
                              ? 'text-yellow-600 font-medium'
                              : ''
                          }
                        >
                          ⏰ Próximo vencimiento:{' '}
                          {format(new Date(event.nextDueDate), 'dd/MM/yyyy', {
                            locale: es
                          })}
                          {daysUntilDue !== null && (
                            <span className="ml-2">
                              (
                              {overdue
                                ? `${Math.abs(daysUntilDue)} días vencido`
                                : daysUntilDue === 0
                                ? 'Vence hoy'
                                : `${daysUntilDue} días restantes`}
                              )
                            </span>
                          )}
                        </div>
                      )}

                      {event.batch && <div>🏷️ Lote: {event.batch}</div>}
                      {event.veterinarian && (
                        <div>👨‍⚕️ Veterinario: {event.veterinarian}</div>
                      )}
                      {event.cost && <div>💰 Costo: ${event.cost}</div>}
                      {event.notes && <div>📝 {event.notes}</div>}

                      <div className="text-xs text-gray-400">
                        Registrado:{' '}
                        {format(new Date(event.createdAt), 'dd/MM/yyyy HH:mm', {
                          locale: es
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => handleEdit(event)}
                      className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1"
                      title="Editar evento"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="text-red-600 hover:text-red-800 text-sm px-2 py-1"
                      title="Eliminar evento"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Mensaje cuando no hay eventos */}
      {healthHistory.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">💉</div>
          <p>No hay eventos de salud registrados</p>
          <p className="text-sm">Agrega vacunas, tratamientos o suplementos</p>
        </div>
      )}
    </div>
  )
}

export default HealthHistorySection
