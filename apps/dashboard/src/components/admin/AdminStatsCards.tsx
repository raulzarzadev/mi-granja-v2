'use client'

import React from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useAdminStats } from '@/hooks/admin/useAdminStats'

export default function AdminStatsCards() {
  const {
    totalUsers,
    totalAnimals,
    totalBreedings,
    totalReminders,
    activeReminders,
    isLoading,
    error,
  } = useAdminStats()

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
        <p className="text-red-700">Error al cargar estadísticas: {error}</p>
      </div>
    )
  }

  const stats = [
    {
      title: 'Total Usuarios',
      value: totalUsers,
      icon: '👥',
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      title: 'Total Animales',
      value: totalAnimals,
      icon: '🐄',
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
    },
    {
      title: 'Reproducciones',
      value: totalBreedings,
      icon: '💕',
      color: 'bg-pink-500',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-700',
    },
    {
      title: 'Recordatorios Activos',
      value: `${activeReminders}/${totalReminders}`,
      icon: '⏰',
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className={`${stat.bgColor} rounded-lg p-6 border`}>
          <div className="flex items-center">
            <div className={`${stat.color} rounded-lg p-3 text-white text-xl`}>{stat.icon}</div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
