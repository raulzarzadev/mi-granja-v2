'use client'

import React from 'react'
import { Provider } from 'react-redux'
import { store } from '@/features/store'
import { AuthProvider } from '@/features/auth/AuthContext'

interface ProvidersProps {
  children: React.ReactNode
}

/**
 * Componente que envuelve la aplicación con todos los providers necesarios
 * Redux Store Provider y Authentication Provider
 */
export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <Provider store={store}>
      <AuthProvider>{children}</AuthProvider>
    </Provider>
  )
}
