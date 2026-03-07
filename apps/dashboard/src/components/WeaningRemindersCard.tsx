'use client'

import { addDays, differenceInCalendarDays } from 'date-fns'
import React from 'react'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { getWeaningDays } from '@/lib/animalBreedingConfig'
import { Animal } from '@/types/animals'
import AnimalBadges from './AnimalBadges'

const formatRelative = (diff: number) => {
  if (diff === 0) return 'Hoy'
  const abs = Math.abs(diff)
  if (abs < 30) return diff < 0 ? `${abs} días atrasado` : `En ${abs} días`
  const months = Math.floor(abs / 30)
  const days = abs % 30
  const monthLabel = months === 1 ? '1 mes' : `${months} meses`
  const dayLabel = days > 0 ? ` y ${days}d` : ''
  return diff < 0 ? `${monthLabel}${dayLabel} atrasado` : `En ${monthLabel}${dayLabel}`
}

interface WeaningItem {
  animal: Animal
  dueDate: Date
  daysUntil: number
}

const WeaningItemActions: React.FC<{
  animal: Animal
  onWean: (id: string, opts?: { stageDecision?: 'engorda' | 'reproductor' }) => void
}> = ({ animal, onWean }) => (
  <div className="flex items-center gap-1">
    <button
      onClick={(e) => {
        e.stopPropagation()
        onWean(animal.id, { stageDecision: 'engorda' })
      }}
      className="shrink-0 px-2 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700"
    >
      Engorda
    </button>
    <button
      onClick={(e) => {
        e.stopPropagation()
        onWean(animal.id, { stageDecision: 'reproductor' })
      }}
      className="shrink-0 px-2 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
    >
      Repro
    </button>
  </div>
)

const WeaningRemindersCard: React.FC = () => {
  const { animals, wean } = useAnimalCRUD()
  const today = new Date()
  const allPending = animals
    .filter((a) => a.status !== 'muerto' && a.status !== 'vendido')
    .filter((a) => !a.isWeaned && a.birthDate)
    .filter((a) => a.stage === 'cria')
    .map((a) => {
      const due = addDays(a.birthDate as Date, getWeaningDays(a))
      const daysUntil = differenceInCalendarDays(due, today)
      return { animal: a, dueDate: due, daysUntil }
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)

  const overdue = allPending.filter((x) => x.daysUntil <= 0)
  const upcoming = allPending.filter((x) => x.daysUntil > 0)

  const handleWean = async (
    animalId: string,
    options?: { stageDecision?: 'engorda' | 'reproductor' },
  ) => {
    try {
      await wean(animalId, options)
    } catch (e) {
      console.error('Error marcando destete:', e)
    }
  }

  const renderListItem = (item: WeaningItem, variant: 'red' | 'yellow') => {
    const borderColor = variant === 'red' ? 'border-red-100' : 'border-yellow-100'
    const bgColor = variant === 'red' ? 'bg-red-50 hover:bg-red-100' : 'bg-yellow-50 hover:bg-yellow-100'
    const textColor = variant === 'red' ? 'text-red-700' : 'text-yellow-700'

    return (
      <li
        key={item.animal.id}
        className={`flex items-center justify-between gap-2 p-2 rounded border ${borderColor} ${bgColor}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium shrink-0">
            {item.animal.animalNumber || `#${item.animal.id.slice(0, 6)}`}
          </span>
          <AnimalBadges animal={item.animal} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs ${textColor}`}>{formatRelative(item.daysUntil)}</span>
          <WeaningItemActions animal={item.animal} onWean={handleWean} />
        </div>
      </li>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section>
        <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-red-600">
          Atrasados
          <span className="px-2 py-0.5 rounded bg-red-100 text-xs">{overdue.length}</span>
        </h4>
        {overdue.length === 0 ? (
          <p className="text-xs text-gray-500">Sin destetes atrasados.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {overdue.map((item) => renderListItem(item, 'red'))}
          </ul>
        )}
      </section>
      <section>
        <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-yellow-600">
          Próximos
          <span className="px-2 py-0.5 rounded bg-yellow-100 text-xs">{upcoming.length}</span>
        </h4>
        {upcoming.length === 0 ? (
          <p className="text-xs text-gray-500">No hay destetes próximos.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {upcoming.map((item) => renderListItem(item, 'yellow'))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default WeaningRemindersCard
