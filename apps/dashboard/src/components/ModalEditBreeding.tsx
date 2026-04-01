'use client'

import React from 'react'
import { Animal } from '@/types/animals'
import { BreedingRecord } from '@/types/breedings'
import BreedingForm from './BreedingForm'
import { Modal } from './Modal'

interface ModalEditBreedingProps {
  animals: Animal[]
  record: BreedingRecord | null
  onSubmit: (
    id: string,
    data: Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>,
  ) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onClose: () => void
  isLoading?: boolean
}

/**
 * Modal para editar un registro de empadre existente
 */
const ModalEditBreeding: React.FC<ModalEditBreedingProps> = ({
  animals,
  record,
  onSubmit,
  onDelete,
  onClose,
  isLoading = false,
}) => {
  const handleSubmit = async (
    data: Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>,
  ) => {
    if (!record) return

    try {
      await onSubmit(record.id, data)
      onClose()
    } catch (error) {
      console.error('Error updating breeding record:', error)
      throw error
    }
  }

  const handleDelete = async () => {
    if (!record || !onDelete) return
    if (
      !window.confirm('¿Estás seguro de eliminar este empadre? Esta acción no se puede deshacer.')
    )
      return
    try {
      await onDelete(record.id)
      onClose()
    } catch (error) {
      console.error('Error deleting breeding record:', error)
    }
  }

  if (!record) return null

  return (
    <Modal isOpen={!!record} onClose={onClose} title="Editar Empadre" size="lg">
      <BreedingForm
        animals={animals}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isLoading={isLoading}
        initialData={record}
      />
      {onDelete && (
        <div className="mt-4 pt-4 border-t">
          <button
            type="button"
            onClick={handleDelete}
            className="w-full px-4 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
          >
            Eliminar empadre
          </button>
        </div>
      )}
    </Modal>
  )
}

export default ModalEditBreeding
