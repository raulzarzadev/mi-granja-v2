'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import React from 'react'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { record_category_icons } from '@/types/animals'

const HealthRemindersCard: React.FC = () => {
  const { getUpcomingHealthRecords } = useAnimalCRUD()

  // Próximos 30 días
  const upcoming = getUpcomingHealthRecords(30)
  if (upcoming.length === 0) return null

  // Separar por urgencia
  const overdue = upcoming.filter((item) => item.daysUntilDue < 0)
  const today = upcoming.filter((item) => item.daysUntilDue === 0)
  const thisWeek = upcoming.filter((item) => item.daysUntilDue > 0 && item.daysUntilDue <= 7)
  const thisMonth = upcoming.filter((item) => item.daysUntilDue > 7)

  const getUrgencyColor = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return 'bg-red-50 border-red-200 text-red-800'
    if (daysUntilDue === 0) return 'bg-orange-50 border-orange-200 text-orange-800'
    if (daysUntilDue <= 7) return 'bg-yellow-50 border-yellow-200 text-yellow-800'
    return 'bg-blue-50 border-blue-200 text-blue-800'
  }

  const getUrgencyIcon = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return '🚨'
    if (daysUntilDue === 0) return '⏰'
    if (daysUntilDue <= 7) return '⚠️'
    return 'ℹ️'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">💉</span>
        <h3 className="text-lg font-semibold text-gray-900">Recordatorios de Salud</h3>
        <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
          {upcoming.length}
        </span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {/* Vencidos */}
        {overdue.map(({ animal, record, daysUntilDue }) => (
          <div
            key={`${animal.id}-${record.id}`}
            className={`p-3 rounded-lg border ${getUrgencyColor(daysUntilDue)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span>{getUrgencyIcon(daysUntilDue)}</span>
                  <span className="font-medium text-sm">
                    {animal.animalNumber || `#${animal.id.slice(0, 6)}`}
                  </span>
                  <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
                    {record_category_icons[record.category]} {record.title}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <div>
                    Vencido hace <strong>{Math.abs(daysUntilDue)} días</strong>
                  </div>
                  {record.nextDueDate && (
                    <div>
                      Fecha:{' '}
                      {format(new Date(record.nextDueDate), 'dd/MM/yyyy', {
                        locale: es,
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Vence hoy */}
        {today.map(({ animal, record, daysUntilDue }) => (
          <div
            key={`${animal.id}-${record.id}`}
            className={`p-3 rounded-lg border ${getUrgencyColor(daysUntilDue)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span>{getUrgencyIcon(daysUntilDue)}</span>
                  <span className="font-medium text-sm">
                    {animal.animalNumber || `#${animal.id.slice(0, 6)}`}
                  </span>
                  <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
                    {record_category_icons[record.category]} {record.title}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <div>
                    <strong>Vence HOY</strong>
                  </div>
                  {record.nextDueDate && (
                    <div>
                      Fecha:{' '}
                      {format(new Date(record.nextDueDate), 'dd/MM/yyyy', {
                        locale: es,
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Esta semana */}
        {thisWeek.map(({ animal, record, daysUntilDue }) => (
          <div
            key={`${animal.id}-${record.id}`}
            className={`p-3 rounded-lg border ${getUrgencyColor(daysUntilDue)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span>{getUrgencyIcon(daysUntilDue)}</span>
                  <span className="font-medium text-sm">
                    {animal.animalNumber || `#${animal.id.slice(0, 6)}`}
                  </span>
                  <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
                    {record_category_icons[record.category]} {record.title}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <div>
                    En <strong>{daysUntilDue} días</strong>
                  </div>
                  {record.nextDueDate && (
                    <div>
                      Fecha:{' '}
                      {format(new Date(record.nextDueDate), 'dd/MM/yyyy', {
                        locale: es,
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Este mes */}
        {thisMonth.slice(0, 5).map(({ animal, record, daysUntilDue }) => (
          <div
            key={`${animal.id}-${record.id}`}
            className={`p-3 rounded-lg border ${getUrgencyColor(daysUntilDue)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span>{getUrgencyIcon(daysUntilDue)}</span>
                  <span className="font-medium text-sm">
                    {animal.animalNumber || `#${animal.id.slice(0, 6)}`}
                  </span>
                  <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
                    {record_category_icons[record.category]} {record.title}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <div>
                    En <strong>{daysUntilDue} días</strong>
                  </div>
                  {record.nextDueDate && (
                    <div>
                      Fecha:{' '}
                      {format(new Date(record.nextDueDate), 'dd/MM/yyyy', {
                        locale: es,
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {thisMonth.length > 5 && (
          <div className="text-center text-sm text-gray-500 pt-2">
            ... y {thisMonth.length - 5} más este mes
          </div>
        )}
      </div>
    </div>
  )
}

export default HealthRemindersCard
