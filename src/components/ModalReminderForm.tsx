'use client'

import React from 'react'
import { Animal, Reminder } from '@/types'
import { Modal } from '@/components/Modal'
import { useModal } from '@/hooks/useModal'
import ReminderForm from '@/components/ReminderForm'

interface ModalReminderFormProps {
  animals: Animal[]
  onSubmit: (
    data: Omit<Reminder, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>
  isLoading?: boolean
  triggerButton?: React.ReactNode
  initialData?: Partial<Reminder>
}

/**
 * Modal que contiene el formulario de recordatorio
 * Incluye botón trigger y manejo del modal
 */
const ModalReminderForm: React.FC<ModalReminderFormProps> = ({
  animals,
  onSubmit,
  isLoading = false,
  triggerButton,
  initialData
}) => {
  const { isOpen, openModal, closeModal } = useModal()

  const handleSubmit = async (
    data: Omit<Reminder, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => {
    await onSubmit(data)
    closeModal()
  }

  const defaultTriggerButton = (
    <button
      onClick={openModal}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
    >
      Nuevo Recordatorio
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
        title={initialData ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}
        size="md"
      >
        <div className="p-6">
          <ReminderForm
            animals={animals}
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

export default ModalReminderForm
