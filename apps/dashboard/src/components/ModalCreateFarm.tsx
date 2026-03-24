'use client'

import React, { useState } from 'react'
import { useBilling } from '@/hooks/useBilling'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useModal } from '@/hooks/useModal'
import { Farm } from '@/types/farm'
import Button from './buttons/Button'
import { Modal } from './Modal'

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
  onCreated,
}) => {
  const modal = useModal()
  // Resolver modo controlado vs. no controlado
  const isOpen = open ?? modal.isOpen
  const openModal = modal.openModal
  const closeModal = onClose ?? modal.closeModal
  const { createFarm } = useFarmCRUD()
  const { canCreateFarm, usage } = useBilling()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: {
      address: '',
      city: '',
      state: '',
      country: 'México',
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      return
    }

    setIsLoading(true)
    try {
      const farmData: Omit<Farm, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> = {
        name: formData.name.trim(),
        description: formData.description.trim() || '',
        location: {
          address: formData.location.address.trim() || '',
          city: formData.location.city.trim() || '',
          state: formData.location.state.trim() || '',
          country: formData.location.country.trim() || '',
        },
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
          country: 'México',
        },
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
          [locationField]: value,
        },
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }))
    }
  }

  const hasPlaces = canCreateFarm()

  return (
    <>
      {showTrigger && (
        <Button size="md" variant="filled" color="success" icon="add" onClick={openModal}>
          Crear Mi Granja
        </Button>
      )}

      <Modal isOpen={isOpen} onClose={closeModal} title="Crear Nueva Granja" size="lg">
        {!hasPlaces ? (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <span className="text-4xl">🚜</span>
              <h3 className="text-lg font-semibold text-gray-900 mt-2">
                No tienes lugares disponibles
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Tu plan actual solo incluye{' '}
                <strong>
                  {usage?.totalPlaces ?? 0} {(usage?.totalPlaces ?? 0) === 1 ? 'lugar' : 'lugares'}
                </strong>{' '}
                y {usage?.usedPlaces === 1 ? 'esta usando' : 'estan usando'}{' '}
                <strong>{usage?.usedPlaces ?? 0}</strong>.
              </p>
              {usage && (
                <p className="text-xs text-gray-400 mt-1">
                  ({usage.farmCount} {usage.farmCount === 1 ? 'granja' : 'granjas'} +{' '}
                  {usage.collaboratorCount}{' '}
                  {usage.collaboratorCount === 1 ? 'colaborador' : 'colaboradores'})
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">Necesitas mas lugares?</p>
              <p>
                Cada lugar extra te permite agregar una granja o un colaborador. Solicita mas
                lugares enviando un correo a{' '}
                <a
                  href="mailto:admin@migranja.app"
                  className="font-semibold underline hover:text-blue-900"
                >
                  admin@migranja.app
                </a>
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="ghost" color="neutral" size="sm" onClick={closeModal}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre de la granja */}
            <div>
              <label htmlFor="farmName" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Granja *
              </label>
              <input
                id="farmName"
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ej: Granja San Jose"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Descripción */}
            <div>
              <label
                htmlFor="farmDescription"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Descripcion (Opcional)
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
              <h3 className="text-md font-medium text-gray-900">Ubicacion (Opcional)</h3>

              <div>
                <label
                  htmlFor="farmAddress"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Direccion
                </label>
                <input
                  id="farmAddress"
                  type="text"
                  value={formData.location.address}
                  onChange={(e) => handleChange('location.address', e.target.value)}
                  placeholder="Direccion completa"
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
                    onChange={(e) => handleChange('location.city', e.target.value)}
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
                    onChange={(e) => handleChange('location.state', e.target.value)}
                    placeholder="Estado"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="ghost"
                color="neutral"
                size="sm"
                onClick={closeModal}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="filled"
                color="success"
                size="sm"
                disabled={isLoading || !formData.name.trim()}
              >
                {isLoading ? 'Creando...' : 'Crear Granja'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}

export default ModalCreateFarm
