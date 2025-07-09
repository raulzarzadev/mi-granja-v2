'use client'

import React from 'react'
import { Animal } from '@/types'
import { Modal } from '@/components/Modal'
import { useModal } from '@/hooks/useModal'
import AnimalForm from '@/components/AnimalForm'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'

interface ModalAnimalFormProps {
  initialData?: Animal
  mode?: 'create' | 'edit'
  openLabel?: React.ReactNode
}

/**
 * Modal que contiene el formulario de animales
 * Incluye botón trigger y manejo del modal
 */
const ModalAnimalForm: React.FC<ModalAnimalFormProps> = ({
  initialData,
  mode = 'create'
}) => {
  const { create: createAnimal } = useAnimalCRUD()
  const [isLoading, setIsLoading] = React.useState(false)
  const { isOpen, openModal, closeModal } = useModal()

  const handleCreateAnimal = async (
    animalData: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => {
    setIsLoading(true)
    try {
      await createAnimal(animalData)
    } catch (error) {
      console.error('Error creating animal:', error)
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
      >
        {mode === 'create' ? '➕ Registrar Animal' : '✏️ Editar Animal'}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={mode === 'create' ? 'Registrar Nuevo Animal' : 'Editar Animal'}
        size="lg"
      >
        <div className="p-6">
          <AnimalForm
            onSubmit={handleCreateAnimal}
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
