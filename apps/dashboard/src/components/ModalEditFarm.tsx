'use client'

import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useModal } from '@/hooks/useModal'
import { Farm } from '@/types/farm'
import Button from './buttons/Button'
import FarmAvatar from './FarmAvatar'
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
  const { updateFarm, softDeleteFarm } = useFarmCRUD()
  const { user } = useSelector((s: RootState) => s.auth)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: {
      address: '',
      city: '',
      state: '',
      country: 'Mexico',
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
          country: farm.location?.country || 'Mexico',
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
          Editar
        </button>
      )}
      <Modal isOpen={isOpen} onClose={closeModal} title="Editar Granja" size="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar de la granja */}
          <div className="flex items-center gap-4">
            <FarmAvatar name={formData.name || 'G'} size="lg" />
            <p className="text-xs text-gray-500">
              El avatar se genera con las iniciales del nombre
            </p>
          </div>

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
              Descripcion
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
            <h3 className="text-md font-medium text-gray-900">Ubicacion</h3>
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="editFarmAddress"
              >
                Direccion
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
                  Pais
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

          {/* Zona de peligro — solo para el propietario */}
          {user?.id === farm?.ownerId && (
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h4 className="text-sm font-semibold text-red-800 mb-1">Zona de peligro</h4>
              {!showDeleteConfirm ? (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-red-600">
                    Eliminar esta granja y todos sus datos asociados.
                  </p>
                  <Button
                    size="xs"
                    variant="outline"
                    color="error"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isLoading}
                  >
                    Eliminar granja
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white border border-red-300 rounded-md p-3 text-sm text-red-800">
                    <p className="font-medium mb-1">Estas seguro?</p>
                    <p className="text-xs text-red-600">
                      Se marcara la granja para eliminacion. Tendras <strong>15 dias</strong> para
                      recuperarla. Despues de ese plazo, se eliminaran permanentemente todos los
                      datos: animales, reproducciones, ventas, gastos y colaboradores.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="xs"
                      variant="filled"
                      color="error"
                      disabled={isDeleting}
                      onClick={async () => {
                        if (!farm?.id) return
                        setIsDeleting(true)
                        try {
                          await softDeleteFarm(farm.id)
                          closeModal()
                        } catch (e) {
                          console.error('Error eliminando granja:', e)
                        } finally {
                          setIsDeleting(false)
                        }
                      }}
                    >
                      {isDeleting ? 'Eliminando...' : 'Si, eliminar granja'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
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
              color="primary"
              size="sm"
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export default ModalEditFarm
