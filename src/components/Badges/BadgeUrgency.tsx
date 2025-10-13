export type Urgency = 'none' | 'low' | 'medium' | 'high'

export const BadgeUrgency: React.FC<{ level?: Urgency }> = ({
  level = 'none'
}) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${urgencyColor(
        level
      )}`}
    >
      {urgencyLabels[level]}
    </span>
  )
}
const urgencyColor = (level: Urgency) => {
  if (level === 'high') return 'bg-red-50 border-red-200 text-red-800'
  if (level === 'medium')
    return 'bg-orange-50 border-orange-200 text-orange-800'
  if (level === 'low') return 'bg-yellow-50 border-yellow-200 text-yellow-800'
  return 'bg-amber-50 border-amber-200 text-amber-800'
}
const urgencyLabels: Record<Urgency, string> = {
  none: 'Sin urgencia',
  low: 'Baja',
  medium: 'Media',
  high: 'Alta'
}
