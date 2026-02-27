'use client'

import React from 'react'
import { Modal } from '@/components/Modal'
import ReminderForm from '@/components/ReminderForm'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useModal } from '@/hooks/useModal'
import { useReminders } from '@/hooks/useReminders'
import { Reminder } from '@/types'

interface ModalReminderFormProps {
  initialData?: Partial<Reminder>
}

/**
 * Modal que contiene el formulario de recordatorio
 * Incluye botón trigger y manejo del modal
 */
const ModalReminderForm: React.FC<ModalReminderFormProps> = ({ initialData }) => {
  const { animals } = useAnimalCRUD()
  const { createReminder } = useReminders()
  const { isOpen, openModal, closeModal } = useModal()

  const handleSubmit = async (
    data: Omit<Reminder, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>,
  ) => {
    await createReminder(data)
    closeModal()
  }

  return (
    <>
      <button
        onClick={openModal}
        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
      >
        Nuevo Recordatorio
      </button>

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
            initialData={initialData}
          />
        </div>
      </Modal>
    </>
  )
}

export default ModalReminderForm
