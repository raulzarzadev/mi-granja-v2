import { differenceInCalendarDays } from 'date-fns'
import React from 'react'
import {
  Animal,
  animal_gender_config,
  animal_icon,
  animal_stage_icons,
  animal_status_icons,
} from '@/types/animals'
import { Icon, IconName } from './Icon/icon'

type AgeLabelFormat = 'full' | 'rounded'

const getAgeLabel = (animal: Animal, format: AgeLabelFormat = 'full') => {
  if (!animal.birthDate) return null
  const bd = animal.birthDate instanceof Date ? animal.birthDate : new Date(animal.birthDate as string | number)
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
}

const AnimalBadges: React.FC<AnimalBadgesProps> = ({ animal, ageFormat = 'full' }) => {
  const age = getAgeLabel(animal, ageFormat)

  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <div className="w-12 text-right">
        <span className="font-bold text-xs truncate text-gray-900 shrink-0">
          {animal.animalNumber}
        </span>
      </div>
      <span title={animal.type}>{animal_icon[animal.type]}</span>
      <span className={`${animal_gender_config[animal.gender].color}`} title={animal_gender_config[animal.gender].label}>
        <Icon icon={animal_gender_config[animal.gender].iconName as IconName} size={4} />
      </span>
      {animal.status && animal.status !== 'activo' ? (
        <span title={animal.status}>{animal_status_icons[animal.status]}</span>
      ) : (
        <span title={animal.stage}>{animal_stage_icons[animal.stage]}</span>
      )}
      <span className="text-xs text-gray-500 w-10 text-left tabular-nums" title="Edad">
        {age ?? '--'}
      </span>
    </span>
  )
}

export default AnimalBadges
