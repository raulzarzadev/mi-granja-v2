'use client'

import React from 'react'
import { Animal } from '@/types'
import { Modal } from '@/components/Modal'
import { useModal } from '@/hooks/useModal'
import AnimalForm from './AnimalForm'
import { useAnimals } from '@/hooks/useAnimals'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'

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
    animalId: string,
    animalData: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => {
    updateAnimal(animalId, animalData)
    closeModal()
  }
  return (
    <>
      <div onClick={openModal} className="cursor-pointer">
        editar
      </div>

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
