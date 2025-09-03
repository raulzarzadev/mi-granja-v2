'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  formatDateDisplay,
  toLocalDateString,
  parseLocalDateString,
  toLocalDateTimeString,
  formatDateTimeDisplay
} from '@/lib/dateUtils'

interface DateTimeInputProps {
  /** Valor actual de la fecha */
  value?: Date | string | null
  /** Callback cuando cambia la fecha */
  onChange: (date: Date | null) => void
  /** Tipo de input: solo fecha o fecha + hora */
  type?: 'date' | 'datetime'
  /** Etiqueta del campo */
  label?: string
  /** Placeholder del input */
  placeholder?: string
  /** Si el campo es requerido */
  required?: boolean
  /** Si el campo está deshabilitado */
  disabled?: boolean
  /** Clase CSS adicional */
  className?: string
  /** Mostrar formato de ayuda */
  showHelp?: boolean
  /** Valor mínimo permitido */
  min?: Date | string
  /** Valor máximo permitido */
  max?: Date | string
}

/**
 * Input de fecha/hora optimizado para móvil y escritorio
 * Permite escribir fecha manualmente o usar el picker nativo
 */
const DateTimeInput: React.FC<DateTimeInputProps> = ({
  value,
  onChange,
  type = 'date',
  label,
  placeholder,
  required = false,
  disabled = false,
  className = '',
  showHelp = false,
  min,
  max
}) => {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const hiddenInputRef = useRef<HTMLInputElement>(null)

  // Sincronizar valor externo con estado interno
  useEffect(() => {
    if (value) {
      const date =
        value instanceof Date ? value : parseLocalDateString(String(value))
      if (type === 'datetime') {
        setInputValue(formatDateTimeDisplay(date))
      } else {
        setInputValue(formatDateDisplay(date))
      }
    } else {
      setInputValue('')
    }
    setError('')
  }, [value, type])

  // Parsear texto ingresado manualmente
  const parseManualInput = (text: string): Date | null => {
    if (!text.trim()) return null

    try {
      // Formato dd/MM/yyyy o dd/MM/yyyy HH:mm
      const datePattern =
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?$/
      const match = text.match(datePattern)

      if (match) {
        const [, day, month, year, hours = '0', minutes = '0'] = match
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1, // month es 0-indexed
          parseInt(day),
          parseInt(hours),
          parseInt(minutes)
        )

        // Validar que la fecha sea válida
        if (
          date.getDate() === parseInt(day) &&
          date.getMonth() === parseInt(month) - 1 &&
          date.getFullYear() === parseInt(year)
        ) {
          return date
        }
      }

      // Intentar parsear con Date constructor como fallback
      const fallback = new Date(text)
      return isNaN(fallback.getTime()) ? null : fallback
    } catch {
      return null
    }
  }

  // Validar límites de fecha
  const isDateInRange = (date: Date): boolean => {
    if (min) {
      const minDate =
        min instanceof Date ? min : parseLocalDateString(String(min))
      if (date < minDate) return false
    }
    if (max) {
      const maxDate =
        max instanceof Date ? max : parseLocalDateString(String(max))
      if (date > maxDate) return false
    }
    return true
  }

  // Manejar cambio en el input de texto
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setInputValue(text)
    setError('')

    if (!text.trim()) {
      onChange(null)
      return
    }

    const parsedDate = parseManualInput(text)
    if (parsedDate && isDateInRange(parsedDate)) {
      onChange(parsedDate)
    } else if (text.length > 5) {
      // Solo mostrar error si hay suficiente texto
      setError(
        'Formato inválido. Use dd/MM/yyyy' +
          (type === 'datetime' ? ' HH:mm' : '')
      )
    }
  }

  // Manejar cambio en el picker nativo
  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (!value) {
      onChange(null)
      return
    }

    try {
      let date: Date
      if (type === 'datetime') {
        // valor es yyyy-MM-ddTHH:mm
        date = new Date(value)
      } else {
        // valor es yyyy-MM-dd
        date = parseLocalDateString(value)
      }

      if (isDateInRange(date)) {
        onChange(date)
        setError('')
      } else {
        setError('Fecha fuera del rango permitido')
      }
    } catch {
      setError('Fecha inválida')
    }
  }

  // Abrir picker nativo
  const openPicker = () => {
    if (disabled) return
    hiddenInputRef.current?.focus()
    hiddenInputRef.current?.showPicker?.()
  }

  // Valor para el picker nativo
  const pickerValue = (() => {
    if (!value) return ''
    const date =
      value instanceof Date ? value : parseLocalDateString(String(value))
    return type === 'datetime'
      ? toLocalDateTimeString(date)
      : toLocalDateString(date)
  })()

  // Props para límites
  const limitProps = {
    ...(min && {
      min: min instanceof Date ? toLocalDateString(min) : String(min)
    }),
    ...(max && {
      max: max instanceof Date ? toLocalDateString(max) : String(max)
    })
  }

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Input de texto visible */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleTextChange}
          placeholder={
            placeholder ||
            (type === 'datetime' ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy')
          }
          disabled={disabled}
          className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />

        {/* Botón para abrir picker */}
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
        >
          📅
        </button>

        {/* Input picker oculto */}
        <input
          ref={hiddenInputRef}
          type={type === 'datetime' ? 'datetime-local' : 'date'}
          value={pickerValue}
          onChange={handlePickerChange}
          {...limitProps}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          tabIndex={-1}
        />
      </div>

      {/* Mensaje de error */}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {/* Ayuda de formato */}
      {showHelp && !error && (
        <p className="text-gray-500 text-xs mt-1">
          Formato: {type === 'datetime' ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy'} o
          use el calendario 📅
        </p>
      )}
    </div>
  )
}

export default DateTimeInput
