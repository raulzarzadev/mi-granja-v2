'use client'

import React from 'react'
import { useAdminStats } from '@/hooks/admin/useAdminStats'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function AdminRecentActivity() {
  const { recentUsers, recentAnimals, isLoading } = useAdminStats()

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Actividad Reciente
        </h3>
        <div className="animate-pulse">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const activities = [
    ...recentUsers.map((user) => ({
      type: 'user' as const,
      title: `Nuevo usuario registrado: ${user.email}`,
      subtitle: user.farmName || 'Sin nombre de granja',
      date: user.createdAt,
      icon: '👤'
    })),
    ...recentAnimals.map((animal) => ({
      type: 'animal' as const,
      title: `Nuevo animal agregado: ${animal.animalNumber}`,
      subtitle: `${animal.type} - ${animal.stage}`,
      date: animal.createdAt,
      icon: '🐄'
    }))
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Actividad Reciente
      </h3>

      {activities.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          No hay actividad reciente
        </p>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <span className="text-lg">{activity.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {activity.title}
                </p>
                <p className="text-sm text-gray-500">{activity.subtitle}</p>
                <p className="text-xs text-gray-400">
                  {format(activity.date, 'PPpp', { locale: es })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
