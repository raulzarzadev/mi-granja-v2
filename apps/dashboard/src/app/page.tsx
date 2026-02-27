'use client'

import React from 'react'
import { useSelector } from 'react-redux'
import Dashboard from '@/components/Dashboard/Dashboard'
import AuthForm from '@/features/auth/components/AuthForm'
import { RootState } from '@/features/store'

export default function Home() {
  const { user } = useSelector((state: RootState) => state.auth)

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si el usuario no está autenticado, mostrar formulario de login
  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <AuthForm />
        </div>
      </div>
    )
  }

  // Si el usuario está autenticado, mostrar dashboard
  return <Dashboard />
}
