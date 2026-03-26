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

export interface MoneyInputProps {
  /** Valor en centavos */
  value: number | null | undefined
  /** Callback con valor en centavos */
  onChange: (centavos: number | null) => void
  label?: string
  /** Texto a la derecha del input (e.g. "/kg", "MXN") */
  suffix?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * Input de dinero: muestra pesos MXN ($), guarda centavos.
 * Convierte automáticamente pesos ↔ centavos.
 */
export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChange,
  label,
  suffix,
  placeholder = '0.00',
  disabled = false,
  className = '',
}) => {
  const [display, setDisplay] = React.useState(() =>
    value != null && value > 0 ? (value / 100).toFixed(2) : '',
  )

  React.useEffect(() => {
    const expected = value != null && value > 0 ? (value / 100).toFixed(2) : ''
    const current = display ? Number.parseFloat(display) : 0
    const incoming = value != null ? value / 100 : 0
    if (Math.abs(current - incoming) > 0.001 || (display === '' && expected !== '')) {
      setDisplay(expected)
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeDecimal(e.target.value)
    if (sanitized === null) return
    setDisplay(sanitized)
    const num = Number.parseFloat(sanitized)
    onChange(!Number.isNaN(num) && num > 0 ? Math.round(num * 100) : null)
  }

  const handleBlur = () => {
    if (display) setDisplay(formatFixed(display))
  }

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="flex items-stretch border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500">
        <span className="flex items-center px-3 bg-gray-50 border-r border-gray-300 text-gray-500 text-sm select-none">
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm outline-none disabled:bg-gray-100"
        />
        {suffix && (
          <span className="flex items-center px-3 bg-gray-50 border-l border-gray-300 text-gray-400 text-xs whitespace-nowrap select-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

// ── react-hook-form version ──

import { FieldPath, FieldValues, useFormContext } from 'react-hook-form'

export interface MoneyFieldProps<TFieldValues extends FieldValues> {
  /** Nombre del campo en el formulario (almacena string en pesos, se convierte en submit) */
  name: FieldPath<TFieldValues>
  label?: string
  suffix?: string
  placeholder?: string
  disabled?: boolean
}

/**
 * MoneyField para react-hook-form.
 * El valor en el form es un string en pesos (e.g. "150.00").
 * La conversión a centavos se hace al hacer submit (Math.round(Number(val) * 100)).
 */
export function MoneyField<TFieldValues extends FieldValues>({
  name,
  label,
  suffix,
  placeholder = '0.00',
  disabled,
}: MoneyFieldProps<TFieldValues>) {
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
        <span className="flex items-center px-3 bg-gray-50 border-r border-gray-300 text-gray-500 text-sm select-none">
          $
        </span>
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
          className="w-full px-3 py-2 text-sm outline-none disabled:bg-gray-100"
        />
        {suffix && (
          <span className="flex items-center px-3 bg-gray-50 border-l border-gray-300 text-gray-400 text-xs whitespace-nowrap select-none">
            {suffix}
          </span>
        )}
      </div>
      {error?.message && <p className="text-xs text-red-600">{String(error.message)}</p>}
    </div>
  )
}

export default MoneyInput
