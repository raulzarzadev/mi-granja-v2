'use client'

import React from 'react'
import { Animal } from '@/types'
import { Modal } from '@/components/Modal'
import { useModal } from '@/hooks/useModal'
import AnimalForm from '@/components/AnimalForm'

interface ModalAnimalFormProps {
  onSubmit: (
    data: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>
  isLoading?: boolean
  triggerButton?: React.ReactNode
  initialData?: Animal
  mode?: 'create' | 'edit'
}

/**
 * Modal que contiene el formulario de animales
 * Incluye botón trigger y manejo del modal
 */
const ModalAnimalForm: React.FC<ModalAnimalFormProps> = ({
  onSubmit,
  isLoading = false,
  triggerButton,
  initialData,
  mode = 'create'
}) => {
  const { isOpen, openModal, closeModal } = useModal()

  const handleSubmit = async (
    data: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => {
    await onSubmit(data)
    closeModal()
  }

  const defaultTriggerButton = (
    <button
      onClick={openModal}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
    >
      {mode === 'create' ? 'Registrar Animal' : 'Editar Animal'}
    </button>
  )

  return (
    <>
      {triggerButton ? (
        <div onClick={openModal}>{triggerButton}</div>
      ) : (
        defaultTriggerButton
      )}

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={mode === 'create' ? 'Registrar Nuevo Animal' : 'Editar Animal'}
        size="lg"
      >
        <div className="p-6">
          <AnimalForm
            onSubmit={handleSubmit}
            onCancel={closeModal}
            isLoading={isLoading}
            initialData={initialData}
          />
        </div>
      </Modal>
    </>
  )
}

export default ModalAnimalForm
