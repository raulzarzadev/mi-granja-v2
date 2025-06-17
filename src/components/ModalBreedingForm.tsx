'use client'

import React from 'react'
import { Animal, BreedingRecord } from '@/types'
import { Modal } from '@/components/Modal'
import { useModal } from '@/hooks/useModal'
import BreedingForm from '@/components/BreedingForm'

interface ModalBreedingFormProps {
  animals: Animal[]
  onSubmit: (
    data: Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>
  isLoading?: boolean
  triggerButton?: React.ReactNode
}

/**
 * Modal que contiene el formulario de breeding
 * Incluye botón trigger y manejo del modal
 */
const ModalBreedingForm: React.FC<ModalBreedingFormProps> = ({
  animals,
  onSubmit,
  isLoading = false,
  triggerButton
}) => {
  const { isOpen, openModal, closeModal } = useModal()

  const handleSubmit = async (
    data: Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => {
    await onSubmit(data)
    closeModal()
  }

  const defaultTriggerButton = (
    <button
      onClick={openModal}
      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
    >
      Registrar Monta
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
        title="Registrar Monta"
        size="md"
      >
        <div className="p-6">
          <BreedingForm
            animals={animals}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            isLoading={isLoading}
          />
        </div>
      </Modal>
    </>
  )
}

export default ModalBreedingForm
