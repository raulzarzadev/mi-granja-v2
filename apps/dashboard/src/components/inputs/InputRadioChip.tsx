'use client'

import React from 'react'

export interface InputRadioChipOption<T extends string> {
  value: T
  label: React.ReactNode
  /** Tailwind bg class para estado seleccionado. Default: bg-green-600 */
  activeBg?: string
}

interface Props<T extends string> {
  name: string
  value: T
  onChange: (next: T) => void
  options: InputRadioChipOption<T>[]
  label?: string
  helpText?: string
  /** Layout del wrapper de chips. Default 'flex flex-wrap gap-2' */
  wrapperClassName?: string
  disabled?: boolean
}

/**
 * Grupo de radio buttons estilo chip.
 * - Accesible: input radio nativo oculto via sr-only, label envuelve.
 * - Color activo configurable por opción (sobreescribe activeBg default).
 */
function InputRadioChip<T extends string>({
  name,
  value,
  onChange,
  options,
  label,
  helpText,
  wrapperClassName = 'flex flex-wrap gap-2',
  disabled = false,
}: Props<T>) {
  return (
    <fieldset disabled={disabled}>
      {label && <legend className="block text-sm font-medium text-gray-700 mb-1">{label}</legend>}
      <div className={wrapperClassName}>
        {options.map((opt) => {
          const selected = value === opt.value
          const activeBg = opt.activeBg || 'bg-green-600'
          return (
            <label
              key={opt.value}
              className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              } ${
                selected
                  ? `${activeBg} border-transparent text-white`
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                disabled={disabled}
                className="sr-only"
              />
              {opt.label}
            </label>
          )
        })}
      </div>
      {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
    </fieldset>
  )
}

export default InputRadioChip
