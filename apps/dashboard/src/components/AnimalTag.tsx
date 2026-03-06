'use client'

import React from 'react'
import { animalAge } from '@/lib/animal-utils'
import {
  Animal,
  AnimalStage,
  AnimalStatus,
  animal_stage_icons,
  gender_colors,
  gender_icon,
} from '@/types/animals'

const statusIcon: Record<string, string> = {
  muerto: '💀',
  vendido: '$',
  perdido: '❓',
}

interface AnimalTagProps {
  animal: Animal
  onClick?: () => void
  active?: boolean
  showAge?: boolean
}

const AnimalTag: React.FC<AnimalTagProps> = ({ animal, onClick, active, showAge = false }) => {
  const status = (animal.status || 'activo') as AnimalStatus
  const inactive = status !== 'activo'
  const sIcon = statusIcon[status]

  // Edad: si muerto/vendido con statusAt, calcular a esa fecha
  const age = (() => {
    if (!showAge) return null
    if ((status === 'muerto' || status === 'vendido') && animal.statusAt) {
      const end = new Date(animal.statusAt as any)
      return animalAge(animal, { format: 'short', endDate: end })
    }
    return animalAge(animal, { format: 'short' })
  })()

  const Tag = onClick ? 'button' : 'span'

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
        active
          ? 'bg-green-600 text-white shadow'
          : inactive
            ? 'bg-gray-100 text-gray-500 border border-gray-200'
            : 'bg-white text-gray-800 border border-gray-200'
      } ${onClick ? 'cursor-pointer hover:shadow-sm' : ''} ${
        onClick && !active && !inactive ? 'hover:border-green-400' : ''
      }`}
    >
      <span className="font-bold">#{animal.animalNumber}</span>
      <span className={`font-bold ${active ? '' : gender_colors[animal.gender]}`}>
        {gender_icon[animal.gender]}
      </span>
      {sIcon ? (
        <span>{sIcon}</span>
      ) : (
        <span className="text-[10px]">{animal_stage_icons[animal.stage as AnimalStage] || ''}</span>
      )}
      {age && age !== 'No registrado' && (
        <span className={`text-[10px] ${active ? 'text-green-100' : 'text-gray-400'}`}>
          {age}
          {status === 'muerto' && '💀'}
        </span>
      )}
    </Tag>
  )
}

export default AnimalTag
