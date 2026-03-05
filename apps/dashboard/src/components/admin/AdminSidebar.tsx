'use client'

import React from 'react'

type AdminSection = 'overview' | 'users' | 'animals' | 'breedings' | 'reminders' | 'activities'

interface AdminSidebarProps {
  activeSection: AdminSection
  onSectionChange: (section: AdminSection) => void
}

const menuItems = [
  { id: 'overview', label: 'Resumen General', icon: '\uD83D\uDCCA' },
  { id: 'users', label: 'Usuarios', icon: '\uD83D\uDC65' },
  { id: 'animals', label: 'Animales', icon: '\uD83D\uDC04' },
  { id: 'breedings', label: 'Reproducciones', icon: '\uD83D\uDC95' },
  { id: 'reminders', label: 'Recordatorios', icon: '\u23F0' },
  { id: 'activities', label: 'Actividades', icon: '\uD83D\uDCDD' },
] as const

export default function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <nav className="mt-8">
        <div className="px-4">
          <h2 className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
            Navegacion
          </h2>
        </div>
        <div className="mt-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id as AdminSection)}
              className={`w-full text-left px-4 py-2 flex items-center space-x-3 text-sm font-medium rounded-lg transition-colors mx-2 ${
                activeSection === item.id
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
