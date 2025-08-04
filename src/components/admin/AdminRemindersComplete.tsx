'use client'

import React from 'react'
import { useAdminReminders } from '@/hooks/admin/useAdminReminders'
import { format, isAfter, isBefore, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function AdminRemindersComplete() {
  const { reminders, isLoading, error } = useAdminReminders()

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error al cargar recordatorios: {error}</p>
      </div>
    )
  }

  // Clasificar recordatorios
  const now = new Date()
  const tomorrow = addDays(now, 1)

  const overdue = reminders.filter(
    (r) => !r.completed && isBefore(r.dueDate, now)
  )
  const today = reminders.filter(
    (r) =>
      !r.completed && isAfter(r.dueDate, now) && isBefore(r.dueDate, tomorrow)
  )
  const upcoming = reminders.filter(
    (r) => !r.completed && isAfter(r.dueDate, tomorrow)
  )
  const completed = reminders.filter((r) => r.completed)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'medical':
        return '🩺'
      case 'breeding':
        return '💕'
      case 'feeding':
        return '🌾'
      case 'weight':
        return '⚖️'
      default:
        return '📝'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestión de Recordatorios
          </h1>
          <p className="text-gray-600 mt-1">
            Vista general de los recordatorios en el sistema
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Total: {reminders.length} recordatorios
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 p-4 rounded-lg shadow border-l-4 border-red-400">
          <div className="text-sm text-red-600 font-medium">Vencidos</div>
          <div className="text-2xl font-bold text-red-900">
            {overdue.length}
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow border-l-4 border-yellow-400">
          <div className="text-sm text-yellow-600 font-medium">Hoy</div>
          <div className="text-2xl font-bold text-yellow-900">
            {today.length}
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow border-l-4 border-blue-400">
          <div className="text-sm text-blue-600 font-medium">Próximos</div>
          <div className="text-2xl font-bold text-blue-900">
            {upcoming.length}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow border-l-4 border-green-400">
          <div className="text-sm text-green-600 font-medium">Completados</div>
          <div className="text-2xl font-bold text-green-900">
            {completed.length}
          </div>
        </div>
      </div>

      {/* Recordatorios vencidos */}
      {overdue.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-red-700">
              🚨 Recordatorios Vencidos ({overdue.length})
            </h3>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Animal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Granjero
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Vencimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioridad
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {overdue.map((reminder) => (
                  <tr key={reminder.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-2xl">
                        {getTypeIcon(reminder.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {reminder.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {reminder.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {reminder.animalNumber || 'General'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reminder.farmerId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                      {format(reminder.dueDate, 'PP', { locale: es })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                          reminder.priority
                        )}`}
                      >
                        {reminder.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Todos los recordatorios */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Todos los Recordatorios
          </h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Título
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Animal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Granjero
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Vencimiento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prioridad
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reminders.map((reminder) => (
              <tr key={reminder.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  {reminder.completed ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✅ Completado
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      ⏳ Pendiente
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-2xl">{getTypeIcon(reminder.type)}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {reminder.title}
                  </div>
                  <div className="text-sm text-gray-500">
                    {reminder.description}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {reminder.animalNumber || 'General'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {reminder.farmerId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(reminder.dueDate, 'PP', { locale: es })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                      reminder.priority
                    )}`}
                  >
                    {reminder.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {reminders.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No se encontraron recordatorios registrados
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
