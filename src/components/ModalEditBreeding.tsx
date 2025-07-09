'use client'

import React from 'react'
import { Animal, BreedingRecord } from '@/types'
import { Modal } from './Modal'
import BreedingForm from './BreedingForm'

interface ModalEditBreedingProps {
  animals: Animal[]
  record: BreedingRecord | null
  onSubmit: (
    id: string,
    data: Omit<
      BreedingRecord,
      'id' | 'farmerId' | 'createdAt' | 'updatedAt'
    > & { femaleIds: string[] }
  ) => Promise<void>
  onClose: () => void
  isLoading?: boolean
}

/**
 * Modal para editar un registro de monta existente
 */
const ModalEditBreeding: React.FC<ModalEditBreedingProps> = ({
  animals,
  record,
  onSubmit,
  onClose,
  isLoading = false
}) => {
  const handleSubmit = async (
    data: Omit<
      BreedingRecord,
      'id' | 'farmerId' | 'createdAt' | 'updatedAt'
    > & { femaleIds: string[] }
  ) => {
    if (!record) return

    console.log({ data })

    try {
      await onSubmit(record.id, data)
      onClose()
    } catch (error) {
      console.error('Error updating breeding record:', error)
      throw error
    }
  }

  if (!record) return null

  return (
    <Modal isOpen={!!record} onClose={onClose} title="Editar Monta" size="lg">
      <BreedingForm
        animals={animals}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isLoading={isLoading}
        initialData={record}
      />
    </Modal>
  )
}

export default ModalEditBreeding
