import React from 'react'
import { Icon } from '../Icon/icon'

type ButtonCloseProps = {
  className?: string
  title?: string
  disabled?: boolean
  showTitle?: string | boolean
} & React.HTMLProps<HTMLButtonElement>

/**
 * Botón de cerrar/eliminar reutilizable con icono X
 * Incluye estilos de hover y estados accesibles
 */
export function ButtonClose({
  onClick,
  className = '',
  title = 'Cerrar',
  disabled = false,
  showTitle = false,
}: ButtonCloseProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`ml-2 text-red-400 hover:text-red-600 focus:outline-none font-bold text-lg leading-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className} flex items-center`}
    >
      {showTitle && <span className="text-sm mr-1">{showTitle || title} </span>}
      <Icon icon="close" />
    </button>
  )
}

export default ButtonClose
