'use client'

import React, { useEffect } from 'react'

export interface ModalProps {
  /** Si el modal está abierto o cerrado */
  isOpen: boolean
  /** Función para cerrar el modal */
  onClose: () => void
  /** Título del modal */
  title?: string
  /** Contenido del modal */
  children: React.ReactNode
  /** Tamaño del modal */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Si se puede cerrar haciendo click fuera */
  closeOnOverlayClick?: boolean
  /** Si se puede cerrar con la tecla Escape */
  closeOnEscape?: boolean
  /** Si mostrar el botón X para cerrar */
  showCloseButton?: boolean
  /** Clase CSS adicional para el contenido */
  className?: string
}

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  full: 'sm:max-w-[95vw]'
}

/**
 * Componente Modal reutilizable
 * Proporciona una ventana modal con backdrop, animaciones y accesibilidad
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = ''
}) => {
  // Manejar tecla Escape
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, closeOnEscape])

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  // Manejar click en el overlay
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/70  flex items-stretch sm:items-center sm:justify-center p-0 sm:p-4 sm:py-2 z-50 animate-in fade-in duration-200 "
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className={`
          bg-white w-screen h-[100svh] max-w-none rounded-none 
          sm:rounded-lg sm:w-full ${sizeClasses[size]} md:max-w-3xl sm:h-auto sm:max-h-[90vh]
          overflow-hidden shadow-none sm:shadow-xl animate-in zoom-in-95 duration-200 
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)'
        }}
      >
        {/* Layout column to allow content to scroll under a fixed header on mobile/fullscreen */}
        <div className="flex h-full w-full flex-col">
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-3 py-2 border-b border-gray-200">
              {title && (
                <h2
                  id="modal-title"
                  className="text-xl font-semibold text-gray-900 truncate pr-4"
                >
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                  aria-label="Cerrar modal"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto sm:max-h-[calc(90vh-120px)] py-4 px-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
