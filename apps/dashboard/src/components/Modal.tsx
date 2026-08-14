'use client'

import React, { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
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
  /** Clase CSS adicional para el contenido scrolleable */
  contentClassName?: string
}

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl lg:max-w-4xl xl:max-w-5xl',
  full: 'sm:max-w-[95vw] lg:max-w-4xl xl:max-w-5xl',
}

const openModalStack: string[] = []
let bodyScrollLockCount = 0
let bodyOverflowBeforeModal = ''

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
  contentClassName,
}) => {
  const modalId = useId()
  const titleId = `${modalId}-title`

  useEffect(() => {
    if (!isOpen) return
    openModalStack.push(modalId)

    return () => {
      const index = openModalStack.lastIndexOf(modalId)
      if (index >= 0) openModalStack.splice(index, 1)
    }
  }, [isOpen, modalId])

  // Manejar tecla Escape
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openModalStack.at(-1) === modalId) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, closeOnEscape, modalId])

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      if (bodyScrollLockCount === 0) {
        bodyOverflowBeforeModal = document.body.style.overflow
      }
      bodyScrollLockCount += 1
      document.body.style.overflow = 'hidden'

      return () => {
        bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1)
        if (bodyScrollLockCount === 0) {
          document.body.style.overflow = bodyOverflowBeforeModal
          bodyOverflowBeforeModal = ''
        }
      }
    }
  }, [isOpen])

  // Manejar click en el overlay
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 bg-black/70 z-50 animate-in fade-in duration-200"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
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
            bg-white w-full h-full min-w-0 max-w-full rounded-none
            sm:rounded-lg sm:w-full sm:h-auto sm:max-h-[90vh] sm:min-w-96
            shadow-none sm:shadow-xl animate-in zoom-in-95 duration-200 
            flex flex-col ${sizeClasses[size]}
            ${className}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header fijo */}

          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-3 py-3 border-b border-gray-200 bg-white shrink-0">
              {title && (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {icon && <Icon icon={icon} className={iconClassName} />}
                  <h2
                    id={titleId}
                    className="min-w-0 truncate pr-2 text-xl font-semibold text-gray-900"
                  >
                    {title}
                  </h2>
                </div>
              )}
              {showCloseButton && (
                <ButtonClose
                  onClick={onClose}
                  title="cerrar modal"
                  className="shrink-0 text-gray-800"
                />
              )}
            </div>
          )}

          {/* Contenido scrolleable */}
          <div
            className={`min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 ${contentClassName || ''}`}
            style={{
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
