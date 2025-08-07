'use client'

import React from 'react'
import { BreedingRecord } from '@/types/breedings'
import { Modal } from '@/components/Modal'
import { useModal } from '@/hooks/useModal'
import BreedingForm from '@/components/BreedingForm'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import Button from './buttons/Button'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'

/**
 * Modal que contiene el formulario de breeding
 * Incluye botón trigger y manejo del modal
 */
const ModalBreedingForm = ({}) => {
  const { animals } = useAnimalCRUD()
  const { createBreedingRecord, isSubmitting } = useBreedingCRUD()
  const { isOpen, openModal, closeModal } = useModal()

  const handleSubmit = async (
    data: Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => {
    await createBreedingRecord(data)
    closeModal()
  }

  return (
    <>
      <Button onClick={openModal} icon="add">
        Registrar Monta
      </Button>

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
