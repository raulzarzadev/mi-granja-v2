import React from 'react'
import {
  Animal,
  animal_icon,
  animal_stage_icons,
  gender_colors,
  gender_icon,
} from '@/types/animals'
import { differenceInCalendarDays } from 'date-fns'

const ageLabel = (animal: Animal) => {
  if (!animal.birthDate) return null
  const days = differenceInCalendarDays(new Date(), animal.birthDate as Date)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  return `${months}m`
}

const AnimalBadges: React.FC<{ animal: Animal }> = ({ animal }) => {
  const age = ageLabel(animal)

  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span title={animal.type}>{animal_icon[animal.type]}</span>
      <span className={`font-bold ${gender_colors[animal.gender]}`} title={animal.gender}>
        {gender_icon[animal.gender]}
      </span>
      {age && <span className="text-xs text-gray-500" title="Edad">{age}</span>}
      <span title={animal.stage}>{animal_stage_icons[animal.stage]}</span>
    </span>
  )
}

export default AnimalBadges
