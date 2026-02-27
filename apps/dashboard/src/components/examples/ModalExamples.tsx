/**
 * EJEMPLO DE USO DEL MODAL REUTILIZABLE
 *
 * Este archivo muestra diferentes formas de usar el componente Modal
 * y el hook useModal en la aplicación.
 */

'use client'

import React from 'react'
import { Modal } from '@/components/Modal'
import ModalAnimalForm from '@/components/ModalAnimalForm'
import ModalBreedingForm from '@/components/ModalBreedingForm'
import ModalReminderForm from '@/components/ModalReminderForm'
import { useModal } from '@/hooks/useModal'

// Ejemplo 1: Modal simple con hook
export const ExampleSimpleModal = () => {
  const { isOpen, openModal, closeModal } = useModal()

  return (
    <>
      <button
        onClick={openModal}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Abrir Modal Simple
      </button>

      <Modal isOpen={isOpen} onClose={closeModal} title="Modal Simple" size="md">
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Este es un ejemplo de modal simple con título y contenido básico.
          </p>
          <button
            onClick={closeModal}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>
      </Modal>
    </>
  )
}

// Ejemplo 2: Modal de confirmación
export const ExampleConfirmModal = () => {
  const { isOpen, openModal, closeModal } = useModal()

  const handleConfirm = () => {
    // Lógica de confirmación
    console.log('Confirmado!')
    closeModal()
  }

  return (
    <>
      <button
        onClick={openModal}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
      >
        Eliminar Item
      </button>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title="Confirmar Eliminación"
        size="sm"
        closeOnOverlayClick={false} // No cerrar al hacer click fuera
      >
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            ¿Estás seguro de que quieres eliminar este elemento? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={closeModal}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// Ejemplo 3: Modal de formulario
export const ExampleFormModal = () => {
  const { isOpen, openModal, closeModal } = useModal()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Lógica del formulario
    console.log('Formulario enviado!')
    closeModal()
  }

  return (
    <>
      <button
        onClick={openModal}
        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
      >
        Nuevo Usuario
      </button>

      <Modal isOpen={isOpen} onClose={closeModal} title="Crear Nuevo Usuario" size="lg">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Ingresa el nombre"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="ejemplo@email.com"
              />
            </div>
          </div>
          <div className="border-t border-gray-200 p-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Crear Usuario
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

// Ejemplo 4: Modal sin título y tamaño completo
export const ExampleFullModal = () => {
  const { isOpen, openModal, closeModal } = useModal()

  return (
    <>
      <button
        onClick={openModal}
        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
      >
        Vista Completa
      </button>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        size="full"
        showCloseButton={true}
        className="h-full" // Modal de altura completa
      >
        <div className="p-8 h-full flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Modal de Tamaño Completo</h3>
            <p className="text-gray-600 mb-6">
              Este modal ocupa casi toda la pantalla y es útil para vistas detalladas o formularios
              complejos.
            </p>
            <button
              onClick={closeModal}
              className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Cerrar Vista
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// Ejemplo 5: Modal de Breeding Form
export const ExampleModalBreedingForm = () => {
  return <ModalBreedingForm />
}

// Ejemplo 6: Modal de Animal Form
export const ExampleModalAnimalForm = () => {
  return (
    <div className="space-y-4">
      {/* Modal para crear animal */}
      <ModalAnimalForm />

      {/* Modal para editar animal con botón personalizado */}
      <ModalAnimalForm
        mode="edit"
        initialData={{
          id: '1',
          farmerId: 'farmer1',
          animalNumber: 'COW-001',
          type: 'vaca',
          stage: 'lechera',
          gender: 'hembra',
          birthDate: new Date('2021-01-15'),
          createdAt: new Date(),
          updatedAt: new Date(),
        }}
      />
    </div>
  )
}

// Ejemplo 7: Modal de Recordatorio (Reminder)
export const ExampleModalReminderForm = () => {
  return <ModalReminderForm />
}

/**
 * FORMAS DE USAR EL MODAL:
 *
 * 1. Importar el hook y el componente:
 *    import { Modal } from '@/components/Modal'
 *    import { useModal } from '@/hooks/useModal'
 *
 * 2. Usar el hook en tu componente:
 *    const { isOpen, openModal, closeModal } = useModal()
 *
 * 3. Usar el componente Modal:
 *    <Modal isOpen={isOpen} onClose={closeModal} title="Mi Modal">
 *      <div className="p-6">Contenido del modal</div>
 *    </Modal>
 *
 * PROPIEDADES DISPONIBLES:
 * - isOpen: boolean (requerido)
 * - onClose: () => void (requerido)
 * - title?: string
 * - size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
 * - closeOnOverlayClick?: boolean (default: true)
 * - closeOnEscape?: boolean (default: true)
 * - showCloseButton?: boolean (default: true)
 * - className?: string
 */
