'use client'

import {
  Animal,
  animal_icon,
  animal_stage_icons,
  gender_icon,
  animal_status_labels,
  animal_status_colors
} from '@/types/animals'
import React from 'react'
import AdminActionIndicator from './AdminActionIndicator'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'

interface AnimalCardProps {
  animal: Animal
  onClick?: () => void
}

/**
 * Tarjeta para mostrar información básica de un animal
 * Diseñado para ser responsive y fácil de usar en móviles
 */
const AnimalCard: React.FC<AnimalCardProps> = ({ animal, onClick }) => {
  const { markFound } = useAnimalCRUD()
  return (
    <div
      className={`bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow ${
        onClick ? 'cursor-pointer hover:bg-gray-50' : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <AnimalDetailRow animal={animal} />
      {/* Badge de estado si no está activo */}
      {animal.status && animal.status !== 'activo' && (
        <div className="mt-2 flex items-center justify-between">
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              animal_status_colors[animal.status]
            }`}
          >
            {animal_status_labels[animal.status]}
          </span>
          {animal.status === 'perdido' && (
            <button
              className="text-xs text-green-700 hover:text-green-900 underline"
              onClick={(e) => {
                e.stopPropagation()
                markFound(animal.id)
              }}
            >
              Marcar como encontrado
            </button>
          )}
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
        {animal.age && (
          <div>
            <span className="text-gray-500">Edad:</span>
            <span className="ml-1 font-medium">{animal.age} meses</span>
          </div>
        )}

        {animal.weight && (
          <div>
            <span className="text-gray-500">Peso:</span>
            <span className="ml-1 font-medium">{animal.weight} kg</span>
          </div>
        )}
      </div>
      {animal.notes && (
        <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
          {animal.notes.length > 60
            ? `${animal.notes.substring(0, 60)}...`
            : animal.notes}
        </div>
      )}
      {/* Indicador de acción de admin */}
      <AdminActionIndicator data={animal} className="mt-2" />
    </div>
  )
}

export default AnimalCard

export const AnimalDetailRow: React.FC<{
  animal?: Animal
}> = ({ animal }) => {
  if (!animal) {
    return <div className="text-gray-500">No hay información del animal</div>
  }

  return (
    <div className="w-full flex flex-col space-y-1">
      <div className="flex items-center justify-between ">
        <span className="font-bold text-xl">#{animal.animalNumber}</span>
        <div className="text-xs text-gray-500">
          {animal.type || 'Sin nombre'} {animal.gender} {animal.stage}
        </div>
        <div className="flex items-center space-x-3">
          <div>
            {animal_icon[animal.type]}
            {animal_stage_icons[animal.stage]}
            {gender_icon[animal.gender]}
          </div>
        </div>
      </div>
    </div>
  )
}
