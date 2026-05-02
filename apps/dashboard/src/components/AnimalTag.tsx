'use client'

import React from 'react'
import { animalAge, computeAnimalStage } from '@/lib/animal-utils'
import {
  Animal,
  AnimalStatus,
  animal_gender_config,
  animal_icon,
  animal_stage_config,
  animal_status_colors,
  animal_status_icons,
  animal_status_labels,
} from '@/types/animals'
import { Icon, IconName } from './Icon/icon'
import ModalAnimalDetails from './ModalAnimalDetails'

interface AnimalTagProps {
  animal: Animal
  onClick?: () => void
  active?: boolean // para destacar el tag (ej: en la ficha del animal, para mostrar que es el mismo)
  showAge?: boolean
  showModalOnClick?: boolean // si true, onClick abrirá el modal de detalles del animal
  variant?: 'chip' | 'header'
}

const AnimalTag: React.FC<AnimalTagProps> = ({
  animal,
  onClick,
  active,
  showAge = false,
  showModalOnClick = false,
  variant = 'chip',
}) => {
  const status = (animal.status || 'activo') as AnimalStatus
  const inactive = status !== 'activo'

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
  const speciesIcon = animal_icon[animal.type]
  const statusLabel = animal_status_labels[status]
  const statusColor = animal_status_colors[status]
  const statusEmoji = animal_status_icons[status]
  const Tag = onClick ? 'button' : 'span'

  const isHeader = variant === 'header'

  const tagEl = (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`whitespace-nowrap transition-all ${
        isHeader
          ? `inline-flex flex-col items-start gap-1 text-lg font-semibold ${
              active ? 'text-green-700' : inactive ? 'text-gray-500' : 'text-gray-900'
            }`
          : `inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
              active
                ? 'bg-green-600 text-white shadow'
                : inactive
                  ? 'bg-gray-100 text-gray-500 border border-gray-200'
                  : 'bg-white text-gray-800 border border-gray-200'
            }`
      } ${onClick || showModalOnClick ? 'cursor-pointer hover:shadow-sm' : ''} ${
        (onClick || showModalOnClick) && !active && !inactive && !isHeader
          ? 'hover:border-green-400'
          : ''
      }`}
    >
      <span className="inline-flex items-center gap-2">
        {isHeader && (
          <span className="text-2xl" title={animal.type}>
            {speciesIcon}
          </span>
        )}
        {!isHeader && (
          <span className="text-sm" title={animal.type}>
            {speciesIcon}
          </span>
        )}
        <span className="font-bold">#{animal.animalNumber}</span>
        <span
          className={`inline-flex items-center justify-center rounded-full font-bold ${
            animal.gender === 'macho' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
          } ${isHeader ? 'w-7 h-7' : 'w-4 h-4'}`}
          title={genderCfg.label}
        >
          <Icon icon={genderCfg.iconName as IconName} size={isHeader ? 5 : 3} />
        </span>
        {!isHeader && (
          <span title={statusLabel} className="text-sm">
            {statusEmoji}
          </span>
        )}
        {age && age !== 'No registrado' && (
          <span
            className={`${isHeader ? 'text-sm' : 'text-[10px]'} ${active ? 'text-green-100' : 'text-gray-400'}`}
          >
            {age}
          </span>
        )}
      </span>
      {isHeader && (
        <span className="inline-flex items-center gap-2">
          {stageCfg && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stageCfg.color}`}
            >
              <span>{stageCfg.icon}</span>
              <span>{stageCfg.label}</span>
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
          >
            <span>{statusEmoji}</span>
            <span>{statusLabel}</span>
          </span>
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
