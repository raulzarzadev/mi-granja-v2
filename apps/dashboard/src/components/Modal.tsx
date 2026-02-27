'use client'

import React, { useEffect } from 'react'
import ButtonClose from './buttons/ButtonClose'
import { Icon, IconName } from './Icon/icon'

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
  /** Icono opcional junto al título */
  icon?: IconName
  /** Clase CSS adicional para el icono */
  iconClassName?: string
}

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  full: 'sm:max-w-[95vw]',
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
  className = '',
  icon,
  iconClassName,
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
      className="fixed inset-0 bg-black/70 z-50 animate-in fade-in duration-200"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* Contenedor centrado para desktop */}
      <div className="h-full w-full flex items-center justify-center p-0 sm:p-4">
        <div
          className={`
            bg-white w-full h-full rounded-none
            sm:rounded-lg sm:w-auto sm:h-auto sm:max-h-[90vh] sm:min-w-96 ${sizeClasses[size]} lg:max-w-4xl xl:max-w-5xl
            shadow-none sm:shadow-xl animate-in zoom-in-95 duration-200 
            flex flex-col max-w-none
            ${className}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header fijo */}

          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-3 py-3 border-b border-gray-200 bg-white flex-shrink-0">
              {title && (
                <div className="flex items-center gap-2">
                  {icon && <Icon icon={icon} className={iconClassName} />}
                  <h2
                    id="modal-title"
                    className="text-xl font-semibold text-gray-900 truncate pr-4"
                  >
                    {title}
                  </h2>
                </div>
              )}
              {showCloseButton && (
                <ButtonClose onClick={onClose} title="cerrar modal" className="text-gray-800" />
              )}
            </div>
          )}

          {/* Contenido scrolleable */}
          <div
            className="flex-1 overflow-y-scroll p-3 sm:p-4 "
            style={{
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
