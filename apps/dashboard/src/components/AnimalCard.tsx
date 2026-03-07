'use client'

import React from 'react'
import { formatWeight } from '@/lib/animal-utils'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { Animal } from '@/types/animals'
import AdminActionIndicator from './AdminActionIndicator'
import AnimalBadges from './AnimalBadges'
import { BadgeAnimalStatus } from './Badges/BadgeAnimalStatus'
import { WeanedAnimal } from './WeanedAnimal'

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
      {animal.status === 'perdido' && (
        <div className="mt-2 flex justify-end">
          <button
            className="text-xs text-green-700 hover:text-green-900 underline"
            onClick={(e) => {
              e.stopPropagation()
              markFound(animal.id)
            }}
          >
            Marcar como encontrado
          </button>
        </div>
      )}
      {formatWeight(animal.weight) && (
        <div className="mt-3 text-sm">
          <span className="text-gray-500">Peso:</span>
          <span className="ml-1 font-medium">{formatWeight(animal.weight)} kg</span>
        </div>
      )}
      {/* Destete objetivo */}

      <WeanedAnimal animal={animal} />
      {animal.notes && (
        <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
          {animal.notes.length > 60 ? `${animal.notes.substring(0, 60)}...` : animal.notes}
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
    <div className="w-full flex items-center justify-between gap-2">
      <span className="font-bold text-xl text-nowrap p-0.5">
        #{animal.animalNumber}
        {animal.name && <span className="ml-1 text-sm font-medium text-gray-500">{animal.name}</span>}
      </span>
      <AnimalBadges animal={animal} />
      <BadgeAnimalStatus status={animal.status || 'activo'} />
    </div>
  )
}
