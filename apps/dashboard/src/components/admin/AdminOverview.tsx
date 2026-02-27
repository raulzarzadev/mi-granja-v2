'use client'

import React from 'react'
import AdminQuickActions from './AdminQuickActions'
import AdminRecentActivity from './AdminRecentActivity'
import AdminStatsCards from './AdminStatsCards'

type AdminSection = 'overview' | 'users' | 'animals' | 'breedings' | 'reminders' | 'activities'

interface AdminOverviewProps {
  onSectionChange?: (section: AdminSection) => void
}

export default function AdminOverview({ onSectionChange }: AdminOverviewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resumen General del Sistema</h1>
        <p className="text-gray-600 mt-1">Vista general de la actividad en Mi Granja</p>
      </div>

      {/* Tarjetas de estadísticas */}
      <AdminStatsCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actividad reciente */}
        <AdminRecentActivity />

        {/* Acciones rápidas */}
        <AdminQuickActions onSectionChange={onSectionChange} />
      </div>
    </div>
  )
}
