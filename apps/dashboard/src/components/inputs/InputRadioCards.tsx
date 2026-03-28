'use client'

import React from 'react'

export interface RadioCardOption<T extends string = string> {
  value: T
  label: string
  icon?: string
}

interface InputRadioCardsProps<T extends string = string> {
  label?: string
  options: RadioCardOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  columns?: 2 | 3 | 4 | 5 | 6
}

export function InputRadioCards<T extends string = string>({
  label,
  options,
  value,
  onChange,
  disabled,
  columns,
}: InputRadioCardsProps<T>) {
  const cols = columns ?? Math.min(options.length, 4)
  const GRID: Record<number, string> = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6' }
  const gridClass = GRID[cols] ?? 'grid-cols-4'

  return (
    <div>
      {label && <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>}
      <div className={`grid ${gridClass} gap-1.5`}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`px-2 py-2 rounded-lg text-xs font-medium transition-all border-2 cursor-pointer text-center ${
              value === opt.value
                ? 'border-green-600 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {opt.icon && <span className="mr-1">{opt.icon}</span>}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
