'use client'

import React from 'react'
import { animalAge, computeAnimalStage } from '@/lib/animal-utils'
import { Animal, AnimalStatus, animal_gender_config, animal_stage_config } from '@/types/animals'
import { Icon, IconName } from './Icon/icon'
import ModalAnimalDetails from './ModalAnimalDetails'

const statusIcon: Record<string, string> = {
  muerto: '💀',
  vendido: '$',
  perdido: '❓',
}

interface AnimalTagProps {
  animal: Animal
  onClick?: () => void
  active?: boolean // para destacar el tag (ej: en la ficha del animal, para mostrar que es el mismo)
  showAge?: boolean
  showModalOnClick?: boolean // si true, onClick abrirá el modal de detalles del animal
}

const AnimalTag: React.FC<AnimalTagProps> = ({
  animal,
  onClick,
  active,
  showAge = false,
  showModalOnClick = false,
}) => {
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

  const stageCfg = animal_stage_config[animal.computedStage ?? computeAnimalStage(animal)]
  const genderCfg = animal_gender_config[animal.gender]
  const Tag = onClick ? 'button' : 'span'

  const tagEl = (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
        active
          ? 'bg-green-600 text-white shadow'
          : inactive
            ? 'bg-gray-100 text-gray-500 border border-gray-200'
            : 'bg-white text-gray-800 border border-gray-200'
      } ${onClick || showModalOnClick ? 'cursor-pointer hover:shadow-sm' : ''} ${
        (onClick || showModalOnClick) && !active && !inactive ? 'hover:border-green-400' : ''
      }`}
    >
      <span className="font-bold">#{animal.animalNumber}</span>
      <span className={`font-bold ${active ? '' : genderCfg.color}`} title={genderCfg.label}>
        <Icon icon={genderCfg.iconName as IconName} size={3} />
      </span>
      {sIcon ? <span>{sIcon}</span> : <span className="text-[10px]">{stageCfg?.icon || ''}</span>}
      {age && age !== 'No registrado' && (
        <span className={`text-[10px] ${active ? 'text-green-100' : 'text-gray-400'}`}>
          {age}
          {status === 'muerto' && '💀'}
        </span>
      )}
    </Tag>
  )

  if (showModalOnClick) {
    return <ModalAnimalDetails animal={animal} triggerComponent={tagEl} />
  }

  return tagEl
}

export default AnimalTag
