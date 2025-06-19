'use client'

import React from 'react'
import { BreedingRecord } from '@/types'
import { Modal } from '@/components/Modal'
import { useModal } from '@/hooks/useModal'
import BreedingForm from '@/components/BreedingForm'
import { useBreeding } from '@/hooks/useBreeding'
import { useAnimals } from '@/hooks/useAnimals'

/**
 * Modal que contiene el formulario de breeding
 * Incluye botón trigger y manejo del modal
 */
const ModalBreedingForm = ({}) => {
  const { animals } = useAnimals()
  const { createBreedingRecord, isSubmitting } = useBreeding()
  const { isOpen, openModal, closeModal } = useModal()

  const handleSubmit = async (
    data: Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => {
    await createBreedingRecord(data)
    closeModal()
  }

  return (
    <>
      <button
        onClick={openModal}
        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
      >
        Registrar Monta
      </button>

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
            isLoading={isSubmitting}
          />
        </div>
      </Modal>
    </>
  )
}

export default ModalBreedingForm
