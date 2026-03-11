'use client'

import React, { useState } from 'react'
import { Reminder } from '@/types'

interface ReminderCardProps {
  reminder: Reminder
  animals?: Array<{ id: string; animalNumber: string; type: string }>
  onEdit?: (reminder: Reminder) => void
  onComplete?: (reminder: Reminder) => void
  onCompleteAnimal?: (reminder: Reminder, animalNumber: string, completed: boolean) => void
  onDelete?: (reminder: Reminder) => void
}

const ReminderCard: React.FC<ReminderCardProps> = ({
  reminder,
  animals = [],
  onEdit,
  onComplete,
  onCompleteAnimal,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(false)

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date))
  }

  const getTimeUntilDue = () => {
    const now = new Date()
    const due = new Date(reminder.dueDate)
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return `Vencido hace ${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? 's' : ''}`
    } else if (diffDays === 0) {
      return 'Vence hoy'
    } else if (diffDays === 1) {
      return 'Vence mañana'
    } else {
      return `Vence en ${diffDays} dias`
    }
  }

  const getPriorityColor = () => {
    switch (reminder.priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = () => {
    switch (reminder.type) {
      case 'medical':
        return '🏥'
      case 'breeding':
        return '🐣'
      case 'feeding':
        return '🌾'
      case 'weight':
        return '⚖️'
      default:
        return '📝'
    }
  }

  const getStatusColor = () => {
    if (reminder.completed) return 'bg-green-50 border-green-200'

    const now = new Date()
    const due = new Date(reminder.dueDate)

    if (due < now) return 'bg-red-50 border-red-200'

    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 1) return 'bg-yellow-50 border-yellow-200'

    return 'bg-white border-gray-200'
  }

  // Animales asociados
  const allNumbers = reminder.animalNumbers || (reminder.animalNumber ? [reminder.animalNumber] : [])
  const hasMultipleAnimals = allNumbers.length > 1
  const completionMap = reminder.completionByAnimal || {}
  const completedCount = allNumbers.filter((n) => completionMap[n]).length
  const isPartial = completedCount > 0 && completedCount < allNumbers.length

  // Info de animales
  const animalInfos = allNumbers.map((num) => {
    const found = animals.find((a) => a.animalNumber === num)
    return { number: num, type: found?.type || '', completed: !!completionMap[num] }
  })

  return (
    <div className={`rounded-lg border-2 p-4 transition-all hover:shadow-md ${getStatusColor()}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{getTypeIcon()}</span>
          <div className="min-w-0">
            <h3
              className={`font-medium ${
                reminder.completed ? 'line-through text-gray-500' : 'text-gray-900'
              }`}
            >
              {reminder.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isPartial && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
              {completedCount}/{allNumbers.length}
            </span>
          )}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor()}`}>
            {reminder.priority === 'high'
              ? 'Alta'
              : reminder.priority === 'medium'
                ? 'Media'
                : 'Baja'}
          </span>
          {reminder.completed && <span className="text-green-500 text-sm">✓</span>}
        </div>
      </div>

      {/* Animales */}
      {allNumbers.length > 0 && (
        <div className="mb-2">
          {!hasMultipleAnimals ? (
            <p className="text-sm text-gray-500">
              {animalInfos[0].number}
              {animalInfos[0].type && ` - ${animalInfos[0].type}`}
            </p>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <span>
                  {allNumbers.length} animales
                  {isPartial && ` (${completedCount} completados)`}
                </span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expanded && (
                <div className="mt-2 space-y-1">
                  {animalInfos.map((info) => (
                    <div
                      key={info.number}
                      className="flex items-center gap-2 text-sm"
                    >
                      {onCompleteAnimal && !reminder.completed ? (
                        <input
                          type="checkbox"
                          checked={info.completed}
                          onChange={(e) =>
                            onCompleteAnimal(reminder, info.number, e.target.checked)
                          }
                          className="rounded"
                        />
                      ) : (
                        <span className={info.completed ? 'text-green-500' : 'text-gray-300'}>
                          {info.completed ? '✓' : '○'}
                        </span>
                      )}
                      <span
                        className={`font-medium ${info.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
                      >
                        {info.number}
                      </span>
                      {info.type && (
                        <span className="text-gray-400 text-xs">{info.type}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Descripción */}
      {reminder.description && (
        <p className={`text-sm mb-3 ${reminder.completed ? 'text-gray-400' : 'text-gray-600'}`}>
          {reminder.description}
        </p>
      )}

      {/* Fecha y estado */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm">
          <span className="text-gray-500">Fecha: </span>
          <span className={reminder.completed ? 'text-gray-400' : 'font-medium'}>
            {formatDate(reminder.dueDate)}
          </span>
        </div>

        {!reminder.completed && (
          <div
            className={`text-sm font-medium ${
              reminder.dueDate < new Date()
                ? 'text-red-600'
                : getTimeUntilDue().includes('hoy') || getTimeUntilDue().includes('mañana')
                  ? 'text-yellow-600'
                  : 'text-gray-600'
            }`}
          >
            {getTimeUntilDue()}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        {!reminder.completed && onComplete && (
          <button
            onClick={() => onComplete(reminder)}
            className="flex-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
          >
            {isPartial ? 'Completar todo' : 'Marcar como completado'}
          </button>
        )}

        {onEdit && (
          <button
            onClick={() => onEdit(reminder)}
            className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors"
          >
            Editar
          </button>
        )}

        {onDelete && (
          <button
            onClick={() => {
              if (confirm('¿Eliminar este recordatorio?')) onDelete(reminder)
            }}
            className="px-3 py-1 border border-red-300 text-red-700 rounded text-sm hover:bg-red-50 transition-colors"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  )
}

export default ReminderCard
