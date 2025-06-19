'use client'

import React from 'react'
import { Provider } from 'react-redux'
import { store } from '@/features/store'

interface ProvidersProps {
  children: React.ReactNode
}

/**
 * Componente que envuelve la aplicación con todos los providers necesarios
 * Redux Store Provider y Authentication Initializer
 */
export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return <Provider store={store}>{children}</Provider>
}
