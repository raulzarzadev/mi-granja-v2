// Helper functions to handle dates without timezone issues
function formatDateForInput(date: Date, mode: 'date' | 'datetime'): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return mode === 'date' ? `${year}-${month}-${day}` : `${year}-${month}-${day}T${hours}:${minutes}`
}

function parseDateFromInput(value: string, mode: 'date' | 'datetime'): Date {
  // Create date in local timezone to avoid timezone shift
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  if (mode === 'date' || !timePart) {
    return new Date(year, month - 1, day)
  }
  const [hours, minutes] = timePart.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes)
}

export function InputDate({
  value,
  disabled,
  onChange,
  className,
  label,
  error,
  required,
  mode = 'datetime',
  helperText,
}: {
  value: Date | null | string | undefined
  disabled?: boolean
  onChange?: (date: Date | null) => void
  className?: string
  label?: string
  error?: string
  required?: boolean
  mode?: 'date' | 'datetime'
  helperText?: string
}) {
  // Convert value to Date if it's a string, handle null/undefined
  const getDateValue = () => {
    if (!value) return ''
    if (typeof value === 'string') {
      try {
        return formatDateForInput(new Date(value), mode)
      } catch {
        return ''
      }
    }
    if (value instanceof Date) {
      return formatDateForInput(value, mode)
    }
    return ''
  }

  return (
    <label className={`block ${className || ''} ${error ? 'text-red-600' : ''}`}>
      {label && (
        <span className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required ? ' *' : ''}
        </span>
      )}
      <input
        type={mode === 'date' ? 'date' : 'datetime-local'}
        value={getDateValue()}
        onChange={(e) => {
          const date = e.target.value ? parseDateFromInput(e.target.value, mode) : null
          if (onChange) {
            onChange(date)
          }
        }}
        className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 ${
          error ? 'border-red-600 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
        }`}
        placeholder={mode === 'date' ? 'Seleccionar fecha' : 'Seleccionar fecha y hora'}
        disabled={disabled}
        aria-invalid={!!error}
      />
      {error ? (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-gray-600 mt-1">{helperText}</p>
      ) : null}
    </label>
  )
}
