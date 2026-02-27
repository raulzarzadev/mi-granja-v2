'use client'

import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useModal } from '@/hooks/useModal'
import { Farm } from '@/types/farm'
import { Modal } from './Modal'

interface ModalEditFarmProps {
  open?: boolean
  onClose?: () => void
  showTrigger?: boolean
  farm?: Farm | null
  onUpdated?: (farm: Partial<Farm>) => void
}

const ModalEditFarm: React.FC<ModalEditFarmProps> = ({
  open,
  onClose,
  showTrigger = true,
  farm,
  onUpdated,
}) => {
  const modal = useModal()
  const isOpen = open ?? modal.isOpen
  const openModal = modal.openModal
  const closeModal = () => {
    onClose?.()
    modal.closeModal()
  }
  const { updateFarm } = useFarmCRUD()
  const { user } = useSelector((s: RootState) => s.auth)
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

  useEffect(() => {
    if (farm) {
      setFormData({
        name: farm.name || '',
        description: farm.description || '',
        location: {
          address: farm.location?.address || '',
          city: farm.location?.city || '',
          state: farm.location?.state || '',
          country: farm.location?.country || 'México',
        },
      })
    }
  }, [farm])

  const handleChange = (field: string, value: string) => {
    if (field.startsWith('location.')) {
      const lf = field.split('.')[1]
      setFormData((prev) => ({
        ...prev,
        location: { ...prev.location, [lf]: value },
      }))
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!farm?.id) return
    if (!formData.name.trim()) return

    // Permitir sólo owner (por ahora)
    if (user?.id && farm.ownerId !== user.id) {
      alert('Solo el propietario puede editar esta granja (por ahora).')
      return
    }

    setIsLoading(true)
    try {
      const updates: Partial<Farm> = {
        name: formData.name.trim(),
        description: formData.description.trim() || '',
        location: {
          address: formData.location.address.trim() || '',
          city: formData.location.city.trim() || '',
          state: formData.location.state.trim() || '',
          country: formData.location.country.trim() || '',
        },
      }
      await updateFarm(farm.id, updates)
      onUpdated?.(updates)
      closeModal()
    } catch (e) {
      console.error('Error actualizando granja', e)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {showTrigger && (
        <button
          onClick={openModal}
          disabled={!farm}
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
        >
          ✏️ Editar
        </button>
      )}
      <Modal isOpen={isOpen} onClose={closeModal} title="Editar Granja" size="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="editFarmName">
              Nombre *
            </label>
            <input
              id="editFarmName"
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="editFarmDesc">
              Descripción
            </label>
            <textarea
              id="editFarmDesc"
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">Ubicación</h3>
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="editFarmAddress"
              >
                Dirección
              </label>
              <input
                id="editFarmAddress"
                type="text"
                value={formData.location.address}
                onChange={(e) => handleChange('location.address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="editFarmCity"
                >
                  Ciudad
                </label>
                <input
                  id="editFarmCity"
                  type="text"
                  value={formData.location.city}
                  onChange={(e) => handleChange('location.city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="editFarmState"
                >
                  Estado
                </label>
                <input
                  id="editFarmState"
                  type="text"
                  value={formData.location.state}
                  onChange={(e) => handleChange('location.state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="editFarmCountry"
                >
                  País
                </label>
                <input
                  id="editFarmCountry"
                  type="text"
                  value={formData.location.country}
                  onChange={(e) => handleChange('location.country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export default ModalEditFarm
