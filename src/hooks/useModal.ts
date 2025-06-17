import { useState, useCallback } from 'react'

export interface UseModalReturn {
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
  toggleModal: () => void
}

/**
 * Hook personalizado para manejar el estado de modales
 * @param initialState - Estado inicial del modal (por defecto false)
 * @returns Objeto con estado y funciones para controlar el modal
 */
export const useModal = (initialState = false): UseModalReturn => {
  const [isOpen, setIsOpen] = useState(initialState)

  const openModal = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggleModal = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal
  }
}
