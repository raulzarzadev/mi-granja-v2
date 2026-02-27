'use client'

import React from 'react'
import AnimalForm from '@/components/AnimalForm'
import { Modal } from '@/components/Modal'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useModal } from '@/hooks/useModal'
import { Animal } from '@/types/animals'

interface ModalAnimalFormProps {
  initialData?: Animal
  mode?: 'create' | 'edit'
  openLabel?: React.ReactNode
  compact?: boolean
}

/**
 * Modal que contiene el formulario de animales
 * Incluye botón trigger y manejo del modal
 */
const ModalAnimalForm: React.FC<ModalAnimalFormProps> = ({
  initialData,
  mode = 'create',
  compact = false,
}) => {
  const { create: createAnimal, isLoading, animals } = useAnimalCRUD()
  const { isOpen, openModal, closeModal } = useModal()

  const handleCreateAnimal = async (
    animalData: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>,
  ) => {
    try {
      await createAnimal(animalData)
      closeModal() // Cerrar modal después de crear
    } catch (error) {
      console.error('Error creating animal:', error)
    }
  }

  return (
    <>
      {compact ? (
        <button
          onClick={openModal}
          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          title="Registrar Animal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
        </button>
      ) : (
        <button
          onClick={openModal}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          {mode === 'create' ? '+ Registrar Animal' : 'Editar Animal'}
        </button>
      )}

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
            existingAnimals={animals}
          />
        </div>
      </Modal>
    </>
  )
}

export default ModalAnimalForm
