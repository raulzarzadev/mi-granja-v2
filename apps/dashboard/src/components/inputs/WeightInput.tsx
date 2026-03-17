'use client'

import React from 'react'

// ── Helpers ──

const sanitizeDecimal = (raw: string, maxDecimals = 2): string | null => {
  const val = raw.replace(/[^0-9.]/g, '')
  const parts = val.split('.')
  if (parts.length > 2) return null
  if (parts[1] && parts[1].length > maxDecimals) return null
  return val
}

const formatFixed = (val: string, decimals = 2): string => {
  const num = Number.parseFloat(val)
  return Number.isNaN(num) ? '' : num.toFixed(decimals)
}

// ── Standalone (controlled) ──

export interface WeightInputProps {
  /** Peso en gramos */
  value: number | null | undefined
  /** Callback con peso en gramos */
  onChange: (grams: number | null) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  /** Tamaño visual */
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Input de peso: muestra kg, guarda gramos.
 * Convierte automáticamente kg ↔ gramos.
 */
export const WeightInput: React.FC<WeightInputProps> = ({
  value,
  onChange,
  label,
  placeholder = '0.00',
  disabled = false,
  size = 'md',
  className = '',
}) => {
  // Convertir gramos internos → string en kg para mostrar
  const [display, setDisplay] = React.useState(() =>
    value != null && value > 0 ? (value / 1000).toFixed(2) : '',
  )

  // Sincronizar cuando value cambia externamente
  React.useEffect(() => {
    const expected = value != null && value > 0 ? (value / 1000).toFixed(2) : ''
    const current = display ? Number.parseFloat(display) : 0
    const incoming = value != null ? value / 1000 : 0
    // Solo actualizar si difiere significativamente (evitar loop)
    if (Math.abs(current - incoming) > 0.001 || (display === '' && expected !== '')) {
      setDisplay(expected)
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeDecimal(e.target.value)
    if (sanitized === null) return
    setDisplay(sanitized)
    const num = Number.parseFloat(sanitized)
    onChange(!Number.isNaN(num) && num > 0 ? Math.round(num * 1000) : null)
  }

  const handleBlur = () => {
    if (display) setDisplay(formatFixed(display))
  }

  const py = size === 'sm' ? 'py-1' : 'py-2'

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="flex items-stretch border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500">
        <input
          type="text"
          inputMode="decimal"
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 ${py} text-sm text-right outline-none disabled:bg-gray-100`}
        />
        <span
          className={`flex items-center px-2 bg-gray-50 border-l border-gray-300 text-gray-400 text-xs select-none`}
        >
          kg
        </span>
      </div>
    </div>
  )
}

// ── react-hook-form version ──

import { FieldPath, FieldValues, useFormContext } from 'react-hook-form'

export interface WeightFieldProps<TFieldValues extends FieldValues> {
  /** Nombre del campo en el formulario (almacena string en kg, se convierte en submit) */
  name: FieldPath<TFieldValues>
  label?: string
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

/**
 * WeightField para react-hook-form.
 * El valor en el form es un string en kg (e.g. "32.50").
 * La conversión a gramos se hace al hacer submit (Math.round(Number(val) * 1000)).
 */
export function WeightField<TFieldValues extends FieldValues>({
  name,
  label,
  placeholder = '0.00',
  disabled,
  size = 'md',
}: WeightFieldProps<TFieldValues>) {
  const { register, setValue, watch, formState } = useFormContext<TFieldValues>()
  const val = watch(name) as string

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeDecimal(e.target.value)
    if (sanitized === null) return
    setValue(name, sanitized as any, { shouldValidate: true })
  }

  const handleBlur = () => {
    if (val) {
      const formatted = formatFixed(val)
      setValue(name, formatted as any)
    }
  }

  const py = size === 'sm' ? 'py-1' : 'py-2'
  const isDisabled = disabled ?? formState.isSubmitting
  const error = formState.errors[name]

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div
        className={`flex items-stretch border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        <input
          id={name}
          type="text"
          inputMode="decimal"
          {...register(name)}
          value={val || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={isDisabled}
          className={`w-full px-3 ${py} text-sm text-right outline-none disabled:bg-gray-100`}
        />
        <span className="flex items-center px-2 bg-gray-50 border-l border-gray-300 text-gray-400 text-xs select-none">
          kg
        </span>
      </div>
      {error?.message && <p className="text-xs text-red-600">{String(error.message)}</p>}
    </div>
  )
}

export default WeightInput
