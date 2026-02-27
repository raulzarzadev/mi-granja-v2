'use client'

import React from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function AdminHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              🏪 Mi Granja - Panel Administrativo
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-700">
              Bienvenido, <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                👑 Admin
              </span>
              <button onClick={logout} className="text-gray-400 hover:text-gray-600 text-sm">
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
