'use client'

import React, { useState } from 'react'
import { Modal } from '@/components/Modal'
import ReminderForm from '@/components/ReminderForm'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useReminders } from '@/hooks/useReminders'
import { Reminder } from '@/types'

interface ModalReminderFormProps {
  isOpen: boolean
  onClose: () => void
  editingReminder?: Reminder | null
  /** Animales preseleccionados al crear (se ignora al editar) */
  initialAnimalIds?: string[]
}

const ModalReminderForm: React.FC<ModalReminderFormProps> = ({
  isOpen,
  onClose,
  editingReminder,
  initialAnimalIds,
}) => {
  const { animals } = useAnimalCRUD()
  const { createReminder, updateReminder } = useReminders()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (
    data: Omit<Reminder, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>,
  ) => {
    if (editingReminder) {
      await updateReminder(editingReminder.id, data)
    } else {
      await createReminder(data)
    }
  }

  const handleFormSubmit: typeof handleSubmit = async (data) => {
    setSubmitting(true)
    try {
      await handleSubmit(data)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingReminder ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}
      size="md"
    >
      <div className="p-6">
        <ReminderForm
          animals={animals}
          onSubmit={handleFormSubmit}
          onCancel={onClose}
          onSuccess={onClose}
          isLoading={submitting}
          initialData={editingReminder ?? undefined}
          initialAnimalIds={editingReminder ? undefined : initialAnimalIds}
        />
      </div>
    </Modal>
  )
}

export default ModalReminderForm
