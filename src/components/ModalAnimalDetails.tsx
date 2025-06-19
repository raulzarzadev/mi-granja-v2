'use client'

import React from 'react'
import { Animal } from '@/types'
import { Modal } from '@/components/Modal'
import { useModal } from '@/hooks/useModal'
import AnimalDetailView from './AnimalDetailView'

interface ModalAnimalDetailsProps {
  animal: Animal
  triggerComponent?: React.ReactNode
}

/**
 * Modal que contiene el formulario de animales
 * Incluye botón trigger y manejo del modal
 */
const ModalAnimalDetails: React.FC<ModalAnimalDetailsProps> = ({
  animal,
  triggerComponent
}) => {
  const { isOpen, openModal, closeModal } = useModal()

  return (
    <>
      {triggerComponent ? (
        <div onClick={openModal} className="cursor-pointer">
          {triggerComponent}
        </div>
      ) : (
        <button
          onClick={openModal}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          Información
        </button>
      )}
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={'Detalles del Animal'}
        size="lg"
      >
        {animal && <AnimalDetailView animal={animal} />}
        {!animal && (
          <div className="text-center text-gray-500">
            No se encontró información del animal.
          </div>
        )}
      </Modal>
    </>
  )
}

export default ModalAnimalDetails
