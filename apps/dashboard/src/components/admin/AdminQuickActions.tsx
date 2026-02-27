'use client'

import React from 'react'

type AdminSection = 'overview' | 'users' | 'animals' | 'breedings' | 'reminders' | 'activities'

interface AdminQuickActionsProps {
  onSectionChange?: (section: AdminSection) => void
}

export default function AdminQuickActions({ onSectionChange }: AdminQuickActionsProps) {
  const actions = [
    {
      title: 'Ver Todos los Usuarios',
      description: 'Gestionar usuarios y permisos',
      icon: '👥',
      color: 'bg-blue-500 hover:bg-blue-600',
      action: 'users',
    },
    {
      title: 'Revisar Animales',
      description: 'Ver todos los animales del sistema',
      icon: '🐄',
      color: 'bg-green-500 hover:bg-green-600',
      action: 'animals',
    },
    {
      title: 'Recordatorios Pendientes',
      description: 'Ver recordatorios activos',
      icon: '⏰',
      color: 'bg-yellow-500 hover:bg-yellow-600',
      action: 'reminders',
    },
    {
      title: 'Actividades del Sistema',
      description: 'Ver log de actividades',
      icon: '📝',
      color: 'bg-purple-500 hover:bg-purple-600',
      action: 'activities',
    },
  ]

  const handleAction = (action: string) => {
    if (onSectionChange) {
      onSectionChange(action as AdminSection)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h3>

      <div className="space-y-3">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => handleAction(action.action)}
            className={`w-full text-left p-4 rounded-lg ${action.color} text-white transition-colors`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-xl">{action.icon}</span>
              <div>
                <h4 className="font-medium">{action.title}</h4>
                <p className="text-sm opacity-90">{action.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
