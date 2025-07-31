'use client'

import React from 'react'
import { Animal } from '@/types/animals'
import { Modal } from '@/components/Modal'
import { useModal } from '@/hooks/useModal'
import AnimalForm from './AnimalForm'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import Button from './buttons/Button'

interface ModalEditAnimalProps {
  animal: Animal
}

/**
 * Modal que contiene el formulario de animales
 * Incluye botón trigger y manejo del modal
 */
const ModalEditAnimal: React.FC<ModalEditAnimalProps> = ({ animal }) => {
  const { isOpen, openModal, closeModal } = useModal()
  const { update: updateAnimal } = useAnimalCRUD()
  const handleEditAnimal = (
    animalNumber: string,
    animalData: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => {
    updateAnimal(animalNumber, animalData)
    closeModal()
  }
  return (
    <>
      <Button
        onClick={openModal}
        className="cursor-pointer"
        icon="edit"
        color="primary"
        size="sm"
      >
        editar
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={'Detalles del Animal'}
        size="lg"
      >
        <div className="p-2">
          <AnimalForm
            initialData={animal}
            onSubmit={(data) => {
              handleEditAnimal(animal.id, data)
            }}
            onCancel={closeModal}
          />
        </div>
      </Modal>
    </>
  )
}

export default ModalEditAnimal
