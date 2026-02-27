import React from 'react'
import { BreedingRecord } from '@/types/breedings'

interface BirthItem {
  record: BreedingRecord
  info: {
    femaleId: string
    expectedBirthDate?: Date | null
    actualBirthDate?: Date | null
    pregnancyConfirmedDate?: Date | null
  }
  daysDiff: number
}

export interface BirthsWindowSummaryProps {
  pastDue: BirthItem[]
  upcoming: BirthItem[]
  days: number
  onSelectRecord?: (record: BreedingRecord) => void
}

const formatRelative = (diff: number) => {
  if (diff === 0) return 'Hoy'
  const abs = Math.abs(diff)
  return diff < 0 ? `Hace ${abs}d` : `En ${abs}d`
}

const BirthsWindowSummary: React.FC<BirthsWindowSummaryProps> = ({
  pastDue,
  upcoming,
  days,
  onSelectRecord,
}) => {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section>
        <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-red-600">
          Atrasados
          <span className="px-2 py-0.5 rounded bg-red-100 text-xs">{pastDue.length}</span>
        </h4>
        {pastDue.length === 0 ? (
          <p className="text-xs text-gray-500">Sin partos atrasados (últimos {days} días).</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {pastDue.map((item) => (
              <li
                key={item.record.id + item.info.femaleId}
                className="flex items-center justify-between p-2 rounded border border-red-100 bg-red-50 hover:bg-red-100 cursor-pointer"
                onClick={() => onSelectRecord?.(item.record)}
              >
                <span className="font-medium">Hembra {item.info.femaleId}</span>
                <span className="text-xs text-red-700">{formatRelative(item.daysDiff)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-yellow-600">
          Próximos
          <span className="px-2 py-0.5 rounded bg-yellow-100 text-xs">{upcoming.length}</span>
        </h4>
        {upcoming.length === 0 ? (
          <p className="text-xs text-gray-500">No hay partos en los próximos {days} días.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {upcoming.map((item) => (
              <li
                key={item.record.id + item.info.femaleId}
                className="flex items-center justify-between p-2 rounded border border-yellow-100 bg-yellow-50 hover:bg-yellow-100 cursor-pointer"
                onClick={() => onSelectRecord?.(item.record)}
              >
                <span className="font-medium">Hembra {item.info.femaleId}</span>
                <span className="text-xs text-yellow-700">{formatRelative(item.daysDiff)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default BirthsWindowSummary
