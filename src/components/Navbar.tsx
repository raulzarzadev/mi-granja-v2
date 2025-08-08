'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useSelector } from 'react-redux'
import { useAuth } from '@/hooks/useAuth'
import { RootState } from '@/features/store'
import { isUserAdmin } from '@/lib/userUtils'
import { ModalUseImpersonationSelector } from './ModalUseImpersonationSelector'
import BrandLogo from '@/components/BrandLogo'

/**
 * Componente de navegación principal
 * Muestra el logo, nombre de la granja y opciones de usuario
 * Diseñado con enfoque mobile-first
 */
const Navbar: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const { logout, impersonatingUser, originalUser } = useAuth()
  const [showUserSelector, setShowUserSelector] = useState(false)

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
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <Link href="/" aria-label="Inicio">
                <BrandLogo variant="blanco" height={70} width={70} />
              </Link>
            </div>

            {/* Enlaces para admins */}
            {isUserAdmin(user) && (
              <>
                <Link
                  href="/admin"
                  className="text-green-100 hover:text-white text-sm font-medium transition-colors"
                >
                  👑 Admin Panel
                </Link>
                <Link
                  href="/ui-showcase"
                  className="text-green-100 hover:text-white text-sm font-medium transition-colors"
                >
                  🎨 UI Showcase
                </Link>
                <ModalUseImpersonationSelector />
              </>
            )}
          </div>

          {/* Información del usuario */}
          <div className="flex items-center space-x-4">
            {/* Indicador de impersonación */}
            {impersonatingUser && originalUser && (
              <div className="bg-yellow-500 text-black px-2 py-1 rounded text-xs font-medium">
                🎭 Actuando como:{' '}
                {impersonatingUser.farmName || impersonatingUser.email}
                <div className="text-xs opacity-75">
                  Admin: {originalUser.email}
                </div>
              </div>
            )}

            <div className="text-sm text-right">
              <p className="font-medium">{user?.email}</p>
              {/* Ubicación de granja removida del navbar */}
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

        {/* Selector de usuario para admins
        <div className="border-t border-green-500 py-4">
          <UserImpersonationSelector
            onClose={() => setShowUserSelector(false)}
          />
        </div> */}
      </div>
    </nav>
  )
}

export default Navbar
