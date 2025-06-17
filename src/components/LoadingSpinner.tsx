'use client'

import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

/**
 * Componente de loading spinner reutilizable
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text = 'Cargando...'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className="flex items-center justify-center space-x-2">
      <div
        className={`animate-spin rounded-full border-b-2 border-green-600 ${sizeClasses[size]}`}
      ></div>
      {text && <span className="text-gray-600">{text}</span>}
    </div>
  )
}

export default LoadingSpinner
