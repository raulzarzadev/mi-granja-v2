import { differenceInCalendarDays } from 'date-fns'
import React from 'react'
import { computeAnimalStage } from '@/lib/animal-utils'
import {
  Animal,
  animal_gender_config,
  animal_icon,
  animal_stage_config,
  animal_status_icons,
  animal_status_labels,
} from '@/types/animals'
import { Icon, IconName } from './Icon/icon'

type AgeLabelFormat = 'full' | 'rounded'

const getAgeLabel = (animal: Animal, format: AgeLabelFormat = 'full') => {
  if (!animal.birthDate) return null
  const bd =
    animal.birthDate instanceof Date
      ? animal.birthDate
      : new Date(animal.birthDate as string | number)
  if (Number.isNaN(bd.getTime())) return null
  const days = differenceInCalendarDays(new Date(), bd)

  if (format === 'rounded') {
    const years = Math.floor(days / 365)
    return years > 0 ? `${years}a` : days >= 30 ? `${Math.floor(days / 30)}m` : `${days}d`
  }

  // full: Xa Ym Zd
  const years = Math.floor(days / 365)
  const remainingDaysAfterYears = days % 365
  const months = Math.floor(remainingDaysAfterYears / 30)
  const remainingDays = remainingDaysAfterYears % 30

  const parts: string[] = []
  if (years > 0) parts.push(`${years}a`)
  if (months > 0) parts.push(`${months}m`)
  if (remainingDays > 0 && years === 0) parts.push(`${remainingDays}d`)

  return parts.join('') || `${days}d`
}

interface AnimalBadgesProps {
  animal: Animal
  ageFormat?: AgeLabelFormat
  variant?: 'row' | 'tag'
  compact?: boolean
  showSpecies?: boolean
  showStateLabel?: boolean
}

const AnimalBadges: React.FC<AnimalBadgesProps> = ({
  animal,
  ageFormat = 'full',
  variant = 'row',
  compact = false,
  showSpecies = true,
  showStateLabel = true,
}) => {
  const age = getAgeLabel(animal, ageFormat)
  const stage = animal.computedStage ?? computeAnimalStage(animal)

  if (variant === 'tag') {
    const hasInactiveStatus = Boolean(animal.status && animal.status !== 'activo')
    const stateIcon = hasInactiveStatus
      ? animal_status_icons[animal.status!]
      : animal_stage_config[stage].icon
    const stateLabel = hasInactiveStatus
      ? animal_status_labels[animal.status!]
      : animal_stage_config[stage].label

    return (
      <span
        className={`inline-flex max-w-full items-center rounded-md border border-gray-200 bg-white text-gray-700 ${
          compact
            ? 'gap-1 px-1.5 py-0.5 text-[11px] leading-4'
            : 'min-h-9 gap-1.5 px-2 py-1 text-xs'
        }`}
        title={`${animal.animalNumber} · ${animal_gender_config[animal.gender].label} · ${stateLabel}${age ? ` · ${age}` : ''}`}
      >
        {showSpecies ? (
          <span aria-hidden="true" className={compact ? 'text-xs' : undefined}>
            {animal_icon[animal.type]}
          </span>
        ) : null}
        <span className="max-w-28 truncate font-bold text-gray-900">{animal.animalNumber}</span>
        <span
          className={animal_gender_config[animal.gender].color}
          title={animal_gender_config[animal.gender].label}
        >
          <Icon icon={animal_gender_config[animal.gender].iconName as IconName} size={3} />
        </span>
        <span className="inline-flex items-center gap-1 text-gray-600" title={stateLabel}>
          <span aria-hidden="true">{stateIcon}</span>
          {showStateLabel ? <span className="hidden sm:inline">{stateLabel}</span> : null}
        </span>
        <span className="shrink-0 tabular-nums text-gray-500">{age ?? '--'}</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm ">
      <div className="w-12 text-left">
        <span className="font-bold text-xs truncate text-gray-900 shrink-0 ">
          {animal.animalNumber}
        </span>
      </div>
      <span title={animal.type}>{animal_icon[animal.type]}</span>
      <span
        className={`${animal_gender_config[animal.gender].color}`}
        title={animal_gender_config[animal.gender].label}
      >
        <Icon icon={animal_gender_config[animal.gender].iconName as IconName} size={4} />
      </span>
      {animal.status && animal.status !== 'activo' ? (
        <span title={animal.status}>{animal_status_icons[animal.status]}</span>
      ) : (
        <span title={stage}>{animal_stage_config[stage].icon}</span>
      )}
      <span className="text-xs text-gray-500 w-10 text-left tabular-nums" title="Edad">
        {age ?? '--'}
      </span>
    </span>
  )
}

export default AnimalBadges
