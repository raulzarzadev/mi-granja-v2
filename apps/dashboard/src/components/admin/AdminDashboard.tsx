'use client'

import React from 'react'
import { useAdminStats } from '@/hooks/admin/useAdminStats'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function AdminDashboard() {
  const {
    totalUsers,
    totalAnimals,
    totalBreedings,
    totalReminders,
    activeReminders,
    isLoading,
    error
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                🏪 Mi Granja - Panel Administrativo
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Resumen General del Sistema
            </h1>
            <p className="text-gray-600 mt-1">
              Vista general de la actividad en Mi Granja
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-blue-50 rounded-lg p-6 border">
              <div className="flex items-center">
                <div className="bg-blue-500 rounded-lg p-3 text-white text-xl">
                  👥
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Usuarios
                  </p>
                  <p className="text-2xl font-bold text-blue-700">
                    {totalUsers}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-6 border">
              <div className="flex items-center">
                <div className="bg-green-500 rounded-lg p-3 text-white text-xl">
                  🐄
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Animales
                  </p>
                  <p className="text-2xl font-bold text-green-700">
                    {totalAnimals}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-pink-50 rounded-lg p-6 border">
              <div className="flex items-center">
                <div className="bg-pink-500 rounded-lg p-3 text-white text-xl">
                  💕
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Reproducciones
                  </p>
                  <p className="text-2xl font-bold text-pink-700">
                    {totalBreedings}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-6 border">
              <div className="flex items-center">
                <div className="bg-yellow-500 rounded-lg p-3 text-white text-xl">
                  ⏰
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Recordatorios Activos
                  </p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {activeReminders}/{totalReminders}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Panel de Administración
            </h3>
            <p className="text-gray-600">
              Este es tu panel de administración donde puedes ver y gestionar
              todos los aspectos de la aplicación Mi Granja.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900">
                  ✅ Funcionalidades Activas
                </h4>
                <ul className="mt-2 text-sm text-gray-600">
                  <li>• Vista general de estadísticas</li>
                  <li>• Control de acceso por roles</li>
                  <li>• Datos en tiempo real</li>
                </ul>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900">🚧 En Desarrollo</h4>
                <ul className="mt-2 text-sm text-gray-600">
                  <li>• Gestión detallada de usuarios</li>
                  <li>• Administración de animales</li>
                  <li>• Log de actividades completo</li>
                  <li>• Reportes y analíticas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
