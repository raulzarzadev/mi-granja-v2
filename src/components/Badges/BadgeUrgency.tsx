export type Urgency = 'none' | 'low' | 'medium' | 'high'

export const BadgeUrgency: React.FC<{
  level?: Urgency
  onChange?: (level: Urgency) => void
}> = ({ level = 'none', onChange }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${urgencyColor(
        level
      )}`}
    >
      {/* {urgencyLabels[level]} */}
      {onChange ? (
        <select
          value={level}
          onChange={(e) => onChange(e.target.value as Urgency)}
          className="ml-0 bg-transparent border-none text-xs font-semibold cursor-pointer focus:outline-none "
          aria-label="Cambiar nivel de urgencia"
        >
          {Object.entries(urgencyLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      ) : null}
    </span>
  )
}
const urgencyColor = (level: Urgency) => {
  switch (level) {
    case 'high':
      return 'bg-rose-100 border-rose-200 text-rose-700'
    case 'medium':
      return 'bg-amber-50 border-amber-200 text-amber-700'
    case 'low':
      return 'bg-sky-50 border-sky-100 text-sky-600'
    default:
      return 'bg-transparent border-transparent text-gray-400'
  }
}
const urgencyLabels: Record<Urgency, string> = {
  none: 'Sin urgencia',
  low: 'Baja',
  medium: 'Media',
  high: 'Alta'
}
