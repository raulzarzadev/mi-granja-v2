'use client'

import React, { useState } from 'react'
import { Modal } from './Modal'
import { useModal } from '@/hooks/useModal'
import { Farm } from '@/types/farm'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'

/**
 * Modal para crear una nueva granja
 */
type ModalCreateFarmProps = {
  // Control externo del modal (opcional). Si se pasa, el modal será controlado.
  open?: boolean
  onClose?: () => void
  // Muestra el botón de trigger interno. Por defecto true para compatibilidad.
  showTrigger?: boolean
  // Callback cuando se crea la granja exitosamente
  onCreated?: (farm: Farm) => void
}

const ModalCreateFarm: React.FC<ModalCreateFarmProps> = ({
  open,
  onClose,
  showTrigger = true,
  onCreated
}) => {
  const modal = useModal()
  // Resolver modo controlado vs. no controlado
  const isOpen = open ?? modal.isOpen
  const openModal = modal.openModal
  const closeModal = onClose ?? modal.closeModal
  const { createFarm } = useFarmCRUD()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: {
      address: '',
      city: '',
      state: '',
      country: 'México'
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      return
    }

    setIsLoading(true)
    try {
      const farmData: Omit<Farm, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> =
        {
          name: formData.name.trim(),
          description: formData.description.trim() || '',
          location: {
            address: formData.location.address.trim() || '',
            city: formData.location.city.trim() || '',
            state: formData.location.state.trim() || '',
            country: formData.location.country.trim() || ''
          }
        }

      const created = await createFarm(farmData)
      // Notificar a quien controla (si aplica)
      onCreated?.(created)

      // Limpiar formulario
      setFormData({
        name: '',
        description: '',
        location: {
          address: '',
          city: '',
          state: '',
          country: 'México'
        }
      })

      closeModal()
    } catch (error) {
      console.error('Error creating farm:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    if (field.startsWith('location.')) {
      const locationField = field.split('.')[1]
      setFormData((prev) => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: value
        }
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value
      }))
    }
  }

  return (
    <>
      {showTrigger && (
        <button
          onClick={openModal}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <span>🚜</span>
          Crear Mi Granja
        </button>
      )}

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title="Crear Nueva Granja"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre de la granja */}
          <div>
            <label
              htmlFor="farmName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nombre de la Granja *
            </label>
            <input
              id="farmName"
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ej: Granja San José"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Descripción */}
          <div>
            <label
              htmlFor="farmDescription"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Descripción (Opcional)
            </label>
            <textarea
              id="farmDescription"
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe brevemente tu granja..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Ubicación */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">
              Ubicación (Opcional)
            </h3>

            <div>
              <label
                htmlFor="farmAddress"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Dirección
              </label>
              <input
                id="farmAddress"
                type="text"
                value={formData.location.address}
                onChange={(e) =>
                  handleChange('location.address', e.target.value)
                }
                placeholder="Dirección completa"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="farmCity"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Ciudad
                </label>
                <input
                  id="farmCity"
                  type="text"
                  value={formData.location.city}
                  onChange={(e) =>
                    handleChange('location.city', e.target.value)
                  }
                  placeholder="Ciudad"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="farmState"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Estado
                </label>
                <input
                  id="farmState"
                  type="text"
                  value={formData.location.state}
                  onChange={(e) =>
                    handleChange('location.state', e.target.value)
                  }
                  placeholder="Estado"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={closeModal}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creando...
                </>
              ) : (
                <>
                  <span>🚜</span>
                  Crear Granja
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export default ModalCreateFarm
