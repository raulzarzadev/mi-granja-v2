'use client'

import React from 'react'
import { Animal } from '@/types'

interface AnimalCardProps {
  animal: Animal
  onClick?: () => void
}

/**
 * Tarjeta para mostrar información básica de un animal
 * Diseñado para ser responsive y fácil de usar en móviles
 */
const AnimalCard: React.FC<AnimalCardProps> = ({ animal, onClick }) => {
  const getAnimalEmoji = (type: string) => {
    switch (type) {
      case 'oveja':
        return '🐑'
      case 'vaca_leche':
      case 'vaca_engorda':
        return '🐄'
      case 'cabra':
        return '🐐'
      case 'cerdo':
        return '🐷'
      default:
        return '🐾'
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'cria':
        return 'bg-blue-100 text-blue-800'
      case 'engorda':
        return 'bg-orange-100 text-orange-800'
      case 'lechera':
        return 'bg-purple-100 text-purple-800'
      case 'reproductor':
        return 'bg-green-100 text-green-800'
      case 'descarte':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatType = (type: string) => {
    switch (type) {
      case 'vaca_leche':
        return 'Vaca Lechera'
      case 'vaca_engorda':
        return 'Vaca de Engorda'
      default:
        return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  const formatStage = (stage: string) => {
    switch (stage) {
      case 'cria':
        return 'Cría'
      case 'lechera':
        return 'Lechera'
      default:
        return stage.charAt(0).toUpperCase() + stage.slice(1)
    }
  }

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
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getAnimalEmoji(animal.type)}</span>
          <div>
            <h3 className="font-semibold text-gray-900">#{animal.animalId}</h3>
            <p className="text-sm text-gray-600">{formatType(animal.type)}</p>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-1">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(
              animal.stage
            )}`}
          >
            {formatStage(animal.stage)}
          </span>
          <span className="text-xs text-gray-500 capitalize">
            {animal.gender}
          </span>
        </div>
      </div>

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
    </div>
  )
}

export default AnimalCard
