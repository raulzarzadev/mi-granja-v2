'use client'

import React from 'react'
import { formatWeight } from '@/lib/animal-utils'
import {
  Animal,
  animal_gender_config,
  animal_icon,
  animal_stage_config,
  animal_status_colors,
  animal_status_icons,
  animal_status_labels,
} from '@/types/animals'
import AnimalBadges from './AnimalBadges'
import { Icon, IconName } from './Icon/icon'

interface AnimalCardProps {
  animal: Animal
  onClick?: () => void
}

/** Accent colors derived from stage config — maps the Tailwind bg class to a left-border color */
const stageAccentBorder: Record<string, string> = {
  'bg-blue-100': 'border-l-blue-400',
  'bg-cyan-100': 'border-l-cyan-400',
  'bg-orange-100': 'border-l-orange-400',
  'bg-purple-100': 'border-l-purple-400',
  'bg-green-100': 'border-l-green-500',
  'bg-red-100': 'border-l-red-400',
  'bg-amber-100': 'border-l-amber-400',
}

/** Extracts the bg-* portion from a combined color string like "bg-orange-100 text-orange-800" */
const getBgClass = (colorStr: string) => colorStr.split(' ')[0]

const AnimalCard: React.FC<AnimalCardProps> = ({ animal, onClick }) => {
  const weight = formatWeight(animal.weight)
  const stageCfg = animal_stage_config[animal.stage]
  const genderCfg = animal_gender_config[animal.gender]
  const isActive = !animal.status || animal.status === 'activo'
  const accentBorder = stageAccentBorder[getBgClass(stageCfg.color)] ?? 'border-l-gray-300'

  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 border-l-4 ${accentBorder} p-3 transition-all duration-200 ${
        onClick
          ? 'cursor-pointer hover:shadow-md hover:border-gray-200 hover:-translate-y-px active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
          : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Ver detalle del animal ${animal.animalNumber}` : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Row 1: number + species + gender + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Species emoji */}
          <span className="text-xl leading-none" aria-hidden="true">
            {animal_icon[animal.type]}
          </span>

          {/* Number + optional name */}
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-tight truncate">
              {animal.animalNumber}
            </p>
            {animal.name && (
              <p className="text-[11px] text-gray-400 leading-tight truncate">{animal.name}</p>
            )}
          </div>
        </div>

        {/* Gender pill + status badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${genderCfg.bgColor}`}
            title={genderCfg.label}
            aria-label={genderCfg.label}
          >
            <Icon icon={genderCfg.iconName as IconName} size={3} />
          </span>

          {!isActive && (
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${animal_status_colors[animal.status!]}`}
            >
              <span aria-hidden="true">{animal_status_icons[animal.status!]}</span>
              <span>{animal_status_labels[animal.status!]}</span>
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="my-2 border-t border-gray-50" />

      {/* Row 2: stage badge + weight + breed */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${stageCfg.color}`}
        >
          <span aria-hidden="true">{stageCfg.icon}</span>
          {stageCfg.label}
        </span>

        {weight && (
          <span className="text-[11px] text-gray-500 tabular-nums">
            {weight} <span className="text-gray-400">kg</span>
          </span>
        )}

        {animal.breed && (
          <span className="text-[11px] text-gray-400 truncate max-w-[80px]">{animal.breed}</span>
        )}
      </div>
    </div>
  )
}

export default AnimalCard

/** Compact inline row used in selectors and breeding cards — keeps AnimalBadges layout */
export const AnimalDetailRow: React.FC<{
  animal?: Animal
}> = ({ animal }) => {
  if (!animal) {
    return <div className="text-gray-500">No hay información del animal</div>
  }

  return (
    <div className="w-full flex items-center gap-2 min-w-0">
      <AnimalBadges animal={animal} />
    </div>
  )
}
