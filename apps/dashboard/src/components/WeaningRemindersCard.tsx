'use client'

import React from 'react'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useRecordMovements } from '@/hooks/useRecordMovements'
import { getWeaningDueDate, getWeaningStatus, isActiveCalf } from '@/lib/animal-utils'
import { createMovementId } from '@/lib/record-movements'
import { Animal } from '@/types/animals'
import AnimalBadges from './AnimalBadges'

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
  const { animals } = useAnimalCRUD()
  const { wean } = useRecordMovements(animals)
  const allPending = animals
    .filter(isActiveCalf)
    .flatMap((a) => {
      const due = getWeaningDueDate(a)
      const daysUntil = getWeaningStatus(a).daysUntilDue
      if (!due || daysUntil === null) return []
      return [{ animal: a, dueDate: due, daysUntil }]
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)

  const overdue = allPending.filter((x) => x.daysUntil < 0)
  const upcoming = allPending.filter((x) => x.daysUntil >= 0)

  const handleWean = async (
    animalId: string,
    options?: { stageDecision?: 'engorda' | 'reproductor' },
  ) => {
    try {
      await wean(
        createMovementId(),
        [animalId],
        new Date(),
        options?.stageDecision ?? 'reproductor',
        '',
      )
    } catch (e) {
      console.error('Error marcando destete:', e)
    }
  }

  const renderListItem = (item: WeaningItem) => {
    const status = getWeaningStatus(item.animal)
    const borderColor =
      status.tone === 'danger'
        ? 'border-red-100'
        : status.tone === 'warning'
          ? 'border-yellow-100'
          : 'border-gray-200'
    const bgColor =
      status.tone === 'danger'
        ? 'bg-red-50 hover:bg-red-100'
        : status.tone === 'warning'
          ? 'bg-yellow-50 hover:bg-yellow-100'
          : 'bg-gray-50 hover:bg-gray-100'
    const textColor =
      status.tone === 'danger'
        ? 'text-red-700'
        : status.tone === 'warning'
          ? 'text-yellow-700'
          : 'text-gray-600'

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
          <span className={`text-xs ${textColor}`} title={status.description}>
            {status.label}
          </span>
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
          <ul className="space-y-1 text-sm">{overdue.map(renderListItem)}</ul>
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
          <ul className="space-y-1 text-sm">{upcoming.map(renderListItem)}</ul>
        )}
      </section>
    </div>
  )
}

export default WeaningRemindersCard
