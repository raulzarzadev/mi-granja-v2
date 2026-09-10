'use client'

import { WHATSAPP_COMMUNITY_URL } from '@mi-granja/shared'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import BrandLogo from '@/components/BrandLogo'
import { RootState } from '@/features/store'
import { useAuth } from '@/hooks/useAuth'
import { isUserAdmin } from '@/lib/userUtils'
import { PlanMenuSection } from './billing/PlanMenuSection'
import { Modal } from './Modal'
import NotificationsBell from './NotificationsBell'
import ModalOnboarding from './onboarding/ModalOnboarding'
import UserImpersonationSelector from './UserImpersonationSelector'

/**
 * Componente de navegación principal
 * Muestra el logo, nombre de la granja y opciones de usuario
 * Diseñado con enfoque mobile-first
 */
const Navbar: React.FC = () => {
  const { user, isLoading, impersonatingUser, originalUser } = useSelector(
    (state: RootState) => state.auth,
  )
  const { logout, stopImpersonation } = useAuth()
  const [showUserSelector, setShowUserSelector] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
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
      <div className="mx-auto w-full min-w-0 max-w-7xl px-2 min-[360px]:px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 min-w-0 items-center justify-between gap-1 min-[360px]:gap-2">
          {/* Logo */}
          <div className="hidden min-w-0 items-center min-[360px]:flex min-[360px]:space-x-2 sm:space-x-4">
            <div className="flex-shrink-0">
              <Link href="/" aria-label="Inicio">
                <BrandLogo variant="blanco" height={70} width={70} />
              </Link>
            </div>

            {/* Badge de impersonación (desktop) */}
            {impersonatingUser && originalUser && (
              <div className="hidden md:flex items-center gap-2 bg-yellow-500/90 text-black px-2 py-1 rounded text-[11px] font-medium shadow-sm">
                <span>🎭 {impersonatingUser.farmName || impersonatingUser.email}</span>
                <span className="opacity-70">(Admin: {originalUser.email})</span>
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
          <div className="ml-auto flex min-w-0 items-center gap-1 min-[360px]:gap-2 sm:gap-3" ref={menuRef}>
            {/* Impersonación (mobile) */}
            {impersonatingUser && originalUser && (
              <div className="md:hidden flex items-center gap-1 bg-yellow-500 text-black px-2 py-1 rounded text-[10px] font-medium">
                <span>🎭 {impersonatingUser.farmName || impersonatingUser.email}</span>
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
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-xs font-medium transition-colors hover:bg-white/20 min-[360px]:px-3"
                aria-label="Suplantar usuario"
              >
                <span aria-hidden="true">🎭</span>
                <span className="hidden min-[360px]:inline">Suplantar</span>
              </button>
            )}

            {/* Si hay usuario mostrar avatar y menú */}
            {user && (
              <div className="flex min-w-0 items-center gap-1 min-[360px]:gap-2 sm:gap-3" ref={menuRef}>
                <NotificationsBell />

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
                      className={`h-4 w-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
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
                      className="absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-1rem)] origin-top-right divide-y divide-gray-100 rounded-lg bg-white shadow-lg ring-1 ring-black/5 focus:outline-none"
                      role="menu"
                    >
                      <div className="px-4 py-3 text-sm">
                        <p className="font-medium text-gray-900 truncate">{user.email}</p>
                        {user.farmName && (
                          <p className="text-gray-500 truncate text-xs">{user.farmName}</p>
                        )}
                        {impersonatingUser && originalUser && (
                          <p className="mt-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded px-1 py-0.5">
                            🎭 Impersonando
                          </p>
                        )}
                      </div>
                      <PlanMenuSection onNavigate={() => setMenuOpen(false)} />
                      <div className="py-1" role="none">
                        <button
                          className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
                          role="menuitem"
                          onClick={() => {
                            setMenuOpen(false)
                            window.location.href = '/?dashboard-main=perfil'
                          }}
                        >
                          👤 Mi Perfil
                        </button>
                        <Link
                          href="/"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                        >
                          🏠 Dashboard
                        </Link>
                        <button
                          type="button"
                          className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 cursor-pointer"
                          role="menuitem"
                          onClick={() => {
                            setShowOnboarding(true)
                            setMenuOpen(false)
                          }}
                        >
                          📘 Primeros pasos
                        </button>
                        <a
                          href={WHATSAPP_COMMUNITY_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                        >
                          💬 Comunidad WhatsApp
                        </a>
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
          <UserImpersonationSelector onClose={() => setShowUserSelector(false)} />
        </Modal>

        <ModalOnboarding isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      </div>
    </nav>
  )
}

export default Navbar
