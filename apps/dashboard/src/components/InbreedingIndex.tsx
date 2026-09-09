import { useId } from 'react'
import type { InbreedingEstimate } from '@/lib/inbreeding'

interface InbreedingIndexProps {
  estimate: InbreedingEstimate
  compact?: boolean
}

const levels = {
  0: 'border-transparent bg-transparent text-gray-400',
  3: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  5: 'border-yellow-400 bg-yellow-100 text-yellow-800',
  7: 'border-orange-400 bg-orange-100 text-orange-800',
  9: 'border-red-400 bg-red-100 text-red-700',
  10: 'border-red-600 bg-red-200 text-red-800',
} as const

export function InbreedingIndex({ estimate, compact = false }: InbreedingIndexProps) {
  const tooltipId = useId()
  const percentage = estimate.percentage.toLocaleString('es-MX', {
    maximumFractionDigits: 2,
  })

  return (
    <span className="group relative inline-flex shrink-0">
      <button
        type="button"
        onClick={(event) => event.stopPropagation()}
        aria-describedby={tooltipId}
        aria-label={`Índice de consanguinidad ${estimate.index} de 10; coeficiente estimado ${percentage} por ciento`}
        className={`relative inline-flex items-center justify-center gap-1 rounded-full border text-xs font-semibold transition-colors before:absolute focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 ${
          compact
            ? 'h-8 min-w-9 px-1.5 before:-inset-x-1 before:-inset-y-1.5'
            : 'min-h-11 min-w-11 px-2 before:inset-0'
        } ${levels[estimate.index as keyof typeof levels] ?? levels[10]}`}
      >
        <span aria-hidden="true" className="text-sm leading-none">
          🩸
        </span>
        <span>{estimate.index}</span>
        <span className="sr-only">de 10</span>
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-normal text-white shadow-lg group-hover:block group-focus-within:block"
      >
        {estimate.index}/10
      </span>
    </span>
  )
}
