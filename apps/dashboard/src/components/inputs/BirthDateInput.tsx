'use client'

import { DatePickerModal } from './DatePickerModal'

function computeAge(dateStr: string): string | null {
  if (!dateStr) return null
  const parts = dateStr.split('-').map(Number)
  const [y, m, d] = parts
  if (!y || !m) return null
  const now = new Date()
  const birth = new Date(y, m - 1, d || 1)
  const diffMs = now.getTime() - birth.getTime()
  if (diffMs < 0) {
    const totalNeg =
      (birth.getFullYear() - now.getFullYear()) * 12 + (birth.getMonth() - now.getMonth())
    const yrsN = Math.floor(totalNeg / 12)
    const mosN = totalNeg % 12
    if (totalNeg < 1) return '-0m'
    return yrsN > 0 ? `-${yrsN}a ${mosN}m` : `-${mosN}m`
  }
  const totalMonths =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (totalMonths < 1) {
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    return `${days}d`
  }
  const yrs = Math.floor(totalMonths / 12)
  const mos = totalMonths % 12
  return yrs > 0 ? `${yrs}a ${mos}m` : `${mos}m`
}

interface BirthDateInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  error?: string
}

export function BirthDateInput({
  value,
  onChange,
  label = 'Fecha de Nacimiento',
  placeholder = 'Opcional',
  disabled,
  error,
}: BirthDateInputProps) {
  const age = computeAge(value)
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="flex items-center gap-2">
        <DatePickerModal
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
        />
        {age && (
          <span className="font-bold text-sm text-green-700 bg-green-50 px-1.5 py-0.5 rounded whitespace-nowrap">
            Edad: {age}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

/** Helper to compute age in months from a date string (YYYY-MM-DD) */
BirthDateInput.computeAge = computeAge
