'use client'

import React from 'react'
import AnimalForm from '@/components/AnimalForm'
import { Modal } from '@/components/Modal'
import SimpleAnimalForm from '@/components/SimpleAnimalForm'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useModal } from '@/hooks/useModal'
import { Animal } from '@/types/animals'

interface ModalAnimalFormProps {
  initialData?: Animal
  mode?: 'create' | 'edit'
  formVariant?: 'classic' | 'simple'
  openLabel?: React.ReactNode
  triggerClassName?: string
  compact?: boolean
}

/**
 * Modal que contiene el formulario de animales
 * Incluye botón trigger y manejo del modal
 */
const ModalAnimalForm: React.FC<ModalAnimalFormProps> = ({
  initialData,
  mode = 'create',
  formVariant = 'classic',
  openLabel,
  triggerClassName,
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
          type="button"
          onClick={openModal}
          className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-green-700 bg-green-600 text-white shadow-sm transition-[background-color,box-shadow,transform] hover:bg-green-700 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 motion-reduce:transform-none md:w-auto md:gap-2 md:rounded-xl md:px-4"
          title="Registrar Animal"
          aria-label="Registrar animal"
        >
          <span className="hidden whitespace-nowrap text-sm font-semibold md:inline">
            Nuevo animal
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-6 transition-transform group-hover:rotate-90 motion-reduce:transform-none"
          >
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className={
            triggerClassName ??
            'min-h-11 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2'
          }
        >
          {openLabel ?? (mode === 'create' ? '+ Registrar Animal' : 'Editar Animal')}
        </button>
      )}

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={mode === 'create' ? 'Registrar Nuevo Animal' : 'Editar Animal'}
        size="lg"
      >
        <div className={formVariant === 'simple' ? 'p-0' : 'p-2 sm:p-4'}>
          {mode === 'create' && formVariant === 'simple' ? (
            <SimpleAnimalForm
              onSubmit={handleCreateAnimal}
              onCancel={closeModal}
              isLoading={isLoading}
              initialData={initialData}
              existingAnimals={animals}
            />
          ) : (
            <AnimalForm
              onSubmit={handleCreateAnimal}
              onCancel={closeModal}
              isLoading={isLoading}
              initialData={initialData}
              existingAnimals={animals}
            />
          )}
        </div>
      </Modal>
    </>
  )
}

export default ModalAnimalForm
