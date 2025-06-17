'use client'

import React from 'react'
import { useSelector } from 'react-redux'
import { useAuth } from '@/features/auth/AuthContext'
import { RootState } from '@/store'

/**
 * Componente de navegación principal
 * Muestra el logo, nombre de la granja y opciones de usuario
 * Diseñado con enfoque mobile-first
 */
const Navbar: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const { logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  if (!user) return null

  return (
    <nav className="bg-green-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo y nombre de la app */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-xl font-bold">🐄 Mi Granja</span>
            </div>
          </div>

          {/* Información del usuario */}
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <p className="font-medium">{user.farmName || 'Mi Granja'}</p>
              <p className="text-green-100 text-xs">{user.email}</p>
            </div>

            {/* Botón de logout */}
            <button
              onClick={handleLogout}
              className="bg-green-700 hover:bg-green-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              aria-label="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
