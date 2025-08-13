'use client'

import React, { useState } from 'react'
import { Modal } from './Modal'
import { useModal } from '@/hooks/useModal'
import { FARM_AREA_TYPES } from '@/types/farm'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useFarmAreasCRUD } from '@/hooks/useFarmAreasCRUD'

/**
 * Modal para crear una nueva área de la granja
 */
const ModalCreateArea: React.FC = () => {
  const { isOpen, openModal, closeModal } = useModal()
  const { currentFarm } = useFarmCRUD()
  const { createArea } = useFarmAreasCRUD()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'other' as const,
    description: '',
    capacity: '',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      return
    }
    if (!currentFarm?.id) {
      console.error('No current farm selected')
      return
    }

    setIsLoading(true)
    try {
      await createArea(currentFarm?.id, {
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description.trim() || '',
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        isActive: true,
        notes: formData.notes.trim() || ''
      })

      // Limpiar formulario
      setFormData({
        name: '',
        type: 'other',
        description: '',
        capacity: '',
        notes: ''
      })

      closeModal()
    } catch (error) {
      console.error('Error creating area:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <>
      <button
        onClick={openModal}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
      >
        <span>➕</span>
        Nueva Área
      </button>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title="Crear Nueva Área"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre del área */}
          <div>
            <label
              htmlFor="areaName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nombre del Área *
            </label>
            <input
              id="areaName"
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ej: Pastizal Norte, Establo Principal"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Tipo de área */}
          <div>
            <label
              htmlFor="areaType"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Tipo de Área *
            </label>
            <select
              id="areaType"
              required
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {FARM_AREA_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label
              htmlFor="areaDescription"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Descripción (Opcional)
            </label>
            <textarea
              id="areaDescription"
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe el área y su propósito..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Capacidad */}
          <div>
            <label
              htmlFor="areaCapacity"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Capacidad (Opcional)
            </label>
            <input
              id="areaCapacity"
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(e) => handleChange('capacity', e.target.value)}
              placeholder="Número máximo de animales"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Especifica cuántos animales pueden alojarse en esta área
            </p>
          </div>

          {/* Notas */}
          <div>
            <label
              htmlFor="areaNotes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Notas (Opcional)
            </label>
            <textarea
              id="areaNotes"
              rows={2}
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Notas adicionales, características especiales..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
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
                  <span>🏗️</span>
                  Crear Área
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export default ModalCreateArea
