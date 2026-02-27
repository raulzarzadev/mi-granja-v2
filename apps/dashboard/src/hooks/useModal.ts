import { useCallback, useState } from 'react'

export interface UseModalReturn {
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
  toggleModal: () => void
  onClose: () => void // Alias for consistency with other hooks
  title?: string // Optional title for the modal
}

/**
 * Custom hook for managing modal state
 * @param {Object} options - Configuration options
 * @param {boolean} [options.initialState=false] - Initial state of the modal (default false)
 * @param {string} [options.title='Modal'] - Optional title for the modal
 * @returns {Object} Object with state and functions to control the modal
 */
export const useModal = ({
  initialState = false,
  title = 'Modal',
}: {
  initialState?: boolean
  title?: string
} = {}): UseModalReturn => {
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
    toggleModal,
    onClose: closeModal, // Alias for consistency with other hooks
    title, // Optional title
  }
}
