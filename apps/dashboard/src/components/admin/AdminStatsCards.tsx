'use client'

import LoadingSpinner from '@/components/LoadingSpinner'
import { useAdminStats } from '@/hooks/admin/useAdminStats'
import { animal_icon, animals_types_labels } from '@/types/animals'
import { sale_status_labels } from '@/types/sales'

type AdminSection = 'overview' | 'users' | 'animals' | 'breedings' | 'reminders' | 'activities'

interface AdminStatsCardsProps {
  onSectionChange?: (section: AdminSection) => void
}

export default function AdminStatsCards({ onSectionChange }: AdminStatsCardsProps) {
  const {
    totalUsers,
    totalAnimals,
    totalBreedings,
    totalReminders,
    activeReminders,
    totalFarms,
    totalInvitations,
    invitationsByStatus,
    totalSales,
    salesByStatus,
    speciesBreakdown,
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

  const go = (section: AdminSection) => () => onSectionChange?.(section)

  const primaryStats = [
    {
      title: 'Usuarios',
      value: totalUsers,
      icon: '👥',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      iconBg: 'bg-blue-500',
      onClick: go('users'),
    },
    {
      title: 'Granjas',
      value: totalFarms,
      icon: '🚜',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      iconBg: 'bg-emerald-500',
      onClick: go('users'),
    },
    {
      title: 'Animales',
      value: totalAnimals,
      icon: '🐄',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      iconBg: 'bg-green-500',
      onClick: go('animals'),
    },
    {
      title: 'Reproducciones',
      value: totalBreedings,
      icon: '💕',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-700',
      iconBg: 'bg-pink-500',
      onClick: go('breedings'),
    },
    {
      title: 'Recordatorios',
      value: `${activeReminders}/${totalReminders}`,
      icon: '⏰',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      iconBg: 'bg-yellow-500',
      onClick: go('reminders'),
    },
    {
      title: 'Ventas',
      value: totalSales,
      icon: '💲',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700',
      iconBg: 'bg-indigo-500',
      onClick: go('activities'),
    },
  ]

  const invitationStatusLabels: Record<string, string> = {
    pending: 'Pendientes',
    accepted: 'Aceptadas',
    rejected: 'Rechazadas',
    expired: 'Expiradas',
    revoked: 'Revocadas',
  }

  const saleStatusLabels: Record<string, string> = {
    scheduled: sale_status_labels.scheduled,
    pending: sale_status_labels.pending,
    completed: sale_status_labels.completed,
    cancelled: sale_status_labels.cancelled,
  }

  return (
    <div className="space-y-6">
      {/* Stats principales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {primaryStats.map((stat, index) => (
          <div
            key={index}
            onClick={stat.onClick}
            className={`${stat.bgColor} rounded-lg p-4 border cursor-pointer hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center gap-3">
              <div className={`${stat.iconBg} rounded-lg p-2 text-white text-lg`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{stat.title}</p>
                <p className={`text-xl font-bold ${stat.textColor}`}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desglose: especies, invitaciones, ventas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Especies */}
        {speciesBreakdown.length > 0 && (
          <div
            onClick={go('animals')}
            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Especies</h3>
            <div className="space-y-2">
              {speciesBreakdown.map(({ type, count }) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {animal_icon[type] || '🐾'} {animals_types_labels[type] || type}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invitaciones */}
        {totalInvitations > 0 && (
          <div
            onClick={go('users')}
            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Invitaciones ({totalInvitations})
            </h3>
            <div className="space-y-2">
              {Object.entries(invitationsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {invitationStatusLabels[status] || status}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ventas */}
        {totalSales > 0 && (
          <div
            onClick={go('activities')}
            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Ventas ({totalSales})
            </h3>
            <div className="space-y-2">
              {Object.entries(salesByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {saleStatusLabels[status] || status}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
