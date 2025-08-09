'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSelector } from 'react-redux'
import { useAuth } from '@/hooks/useAuth'
import { RootState } from '@/features/store'
import { isUserAdmin } from '@/lib/userUtils'
import { Modal } from './Modal'
import UserImpersonationSelector from './UserImpersonationSelector'
import BrandLogo from '@/components/BrandLogo'
import Button from './buttons/Button'

/**
 * Componente de navegación principal
 * Muestra el logo, nombre de la granja y opciones de usuario
 * Diseñado con enfoque mobile-first
 */
const Navbar: React.FC = () => {
  const { user, isLoading, impersonatingUser, originalUser } = useSelector(
    (state: RootState) => state.auth
  )
  const { logout, stopImpersonation } = useAuth()
  const [showUserSelector, setShowUserSelector] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }
  // Skeleton mientras user === undefined (estado inicial de carga)
  if (user === undefined || isLoading) {
    return (
      <nav className="bg-green-600 text-white shadow-lg animate-pulse">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-green-500" />
              </div>
              <div className="h-4 w-24 bg-green-500 rounded" />
              <div className="h-4 w-14 bg-green-500 rounded" />
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-6 w-20 bg-green-500 rounded" />
              <div className="h-9 w-9 rounded-full bg-green-500" />
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-gradient-to-r from-green-700 via-green-600 to-green-700 text-white shadow-lg relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <Link href="/" aria-label="Inicio">
                <BrandLogo variant="blanco" height={70} width={70} />
              </Link>
            </div>

            {/* Badge de impersonación (desktop) */}
            {impersonatingUser && originalUser && (
              <div className="hidden md:flex items-center gap-2 bg-yellow-500/90 text-black px-2 py-1 rounded text-[11px] font-medium shadow-sm">
                <span>
                  🎭 {impersonatingUser.farmName || impersonatingUser.email}
                </span>
                <span className="opacity-70">
                  (Admin: {originalUser.email})
                </span>
                <button
                  onClick={stopImpersonation}
                  className="ml-1 text-xs font-bold hover:text-red-700"
                  aria-label="Volver a mi cuenta"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Lado derecho */}
          <div className="flex items-center space-x-3" ref={menuRef}>
            {/* Impersonación (mobile) */}
            {impersonatingUser && originalUser && (
              <div className="md:hidden flex items-center gap-1 bg-yellow-500 text-black px-2 py-1 rounded text-[10px] font-medium">
                <span>
                  🎭 {impersonatingUser.farmName || impersonatingUser.email}
                </span>
                <button
                  onClick={stopImpersonation}
                  className="ml-1 text-[10px] font-bold hover:text-red-700"
                  aria-label="Volver a mi cuenta"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Si no hay usuario (null) mostrar botón de login */}
            {user === null && (
              <Link
                href="/auth"
                className="bg-white/10 hover:bg-white/20 backdrop-blur px-4 py-2 rounded-md text-sm font-medium transition-colors border border-white/20"
              >
                Iniciar sesión
              </Link>
            )}

            {/* Botón abrir modal impersonación (solo admins, fuera del menú para rápido acceso) */}
            {user && isUserAdmin(user) && !impersonatingUser && (
              <button
                onClick={() => setShowUserSelector(true)}
                className=" sm:inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-xs font-medium border border-white/20 transition-colors"
              >
                🎭 Suplantar
              </button>
            )}

            {/* Si hay usuario mostrar avatar y menú */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((p) => !p)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-2 py-1 rounded-full transition-colors border border-white/20"
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                >
                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-300 to-green-500 flex items-center justify-center text-green-900 font-semibold shadow-inner">
                    {user.farmName?.charAt(0)?.toUpperCase() ||
                      user.email?.charAt(0)?.toUpperCase() ||
                      'U'}
                  </div>
                  <div className="hidden sm:flex flex-col items-start leading-tight text-left">
                    <span className="text-xs opacity-70">
                      {isUserAdmin(user) ? 'Admin' : 'Usuario'}
                    </span>
                    <span className="text-[11px] font-medium truncate max-w-[110px]">
                      {user.email}
                    </span>
                  </div>
                  <svg
                    className={`h-4 w-4 transition-transform ${
                      menuOpen ? 'rotate-180' : ''
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg shadow-lg bg-white ring-1 ring-black/5 focus:outline-none divide-y divide-gray-100 z-50"
                    role="menu"
                  >
                    <div className="px-4 py-3 text-sm">
                      <p className="font-medium text-gray-900 truncate">
                        {user.email}
                      </p>
                      {user.farmName && (
                        <p className="text-gray-500 truncate text-xs">
                          {user.farmName}
                        </p>
                      )}
                      {impersonatingUser && originalUser && (
                        <p className="mt-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded px-1 py-0.5">
                          🎭 Impersonando
                        </p>
                      )}
                    </div>
                    <div className="py-1" role="none">
                      <Link
                        href="/"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                      >
                        🏠 Dashboard
                      </Link>
                      {isUserAdmin(user) && (
                        <>
                          <Link
                            href="/admin"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
                            role="menuitem"
                            onClick={() => setMenuOpen(false)}
                          >
                            👑 Admin Panel
                          </Link>
                          <Link
                            href="/ui-showcase"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
                            role="menuitem"
                            onClick={() => setMenuOpen(false)}
                          >
                            🎨 UI Showcase
                          </Link>
                        </>
                      )}
                      {impersonatingUser && originalUser && (
                        <button
                          onClick={() => {
                            stopImpersonation()
                            setMenuOpen(false)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-yellow-800 hover:bg-yellow-50"
                          role="menuitem"
                        >
                          ✕ Salir de impersonación
                        </button>
                      )}
                    </div>
                    <div className="py-1" role="none">
                      <button
                        onClick={() => {
                          handleLogout()
                          setMenuOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                        role="menuitem"
                      >
                        🚪 Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Impersonación */}
        <Modal
          isOpen={showUserSelector}
          onClose={() => setShowUserSelector(false)}
          title="Seleccionar usuario para suplantar"
          size="md"
        >
          <UserImpersonationSelector
            onClose={() => setShowUserSelector(false)}
          />
        </Modal>
      </div>
    </nav>
  )
}

export default Navbar
