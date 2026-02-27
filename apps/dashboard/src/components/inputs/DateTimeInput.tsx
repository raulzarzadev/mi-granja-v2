'use client'

import React from 'react'

interface DateTimeInputProps {
  value?: Date | null
  onChange: (date: Date | null) => void
  type?: 'date' | 'datetime'
  label?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

const DateTimeInput: React.FC<DateTimeInputProps> = ({
  value,
  onChange,
  type = 'date',
  label,
  required = false,
  disabled = false,
  className = '',
}) => {
  // Extraer valores actuales o usar valores por defecto
  const currentDate = value || new Date()
  const day = currentDate.getDate()
  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()
  const hour = currentDate.getHours()
  const minute = currentDate.getMinutes()

  // Función para crear nueva fecha con cambios
  const updateDate = (
    newDay: number,
    newMonth: number,
    newYear: number,
    newHour?: number,
    newMinute?: number,
  ) => {
    const newDate = new Date(
      newYear,
      newMonth - 1, // mes en Date es 0-based
      newDay,
      newHour ?? 0,
      newMinute ?? 0,
    )
    onChange(newDate)
  }

  // Opciones para los selects
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ]
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 26 }, (_, i) => currentYear - 20 + i)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  const selectClass =
    'border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100'

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="flex flex-wrap gap-2">
        {/* Día */}
        <select
          value={day}
          onChange={(e) => updateDate(Number(e.target.value), month, year, hour, minute)}
          disabled={disabled}
          className={selectClass}
        >
          {days.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Mes */}
        <select
          value={month}
          onChange={(e) => updateDate(day, Number(e.target.value), year, hour, minute)}
          disabled={disabled}
          className={selectClass}
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Año */}
        <select
          value={year}
          onChange={(e) => updateDate(day, month, Number(e.target.value), hour, minute)}
          disabled={disabled}
          className={selectClass}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {/* Hora y minutos solo en modo datetime */}
        {type === 'datetime' && (
          <>
            <select
              value={hour}
              onChange={(e) => updateDate(day, month, year, Number(e.target.value), minute)}
              disabled={disabled}
              className={selectClass}
            >
              {hours.map((h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, '0')}
                </option>
              ))}
            </select>

            <select
              value={minute}
              onChange={(e) => updateDate(day, month, year, hour, Number(e.target.value))}
              disabled={disabled}
              className={selectClass}
            >
              {minutes.map((m) => (
                <option key={m} value={m}>
                  {m.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </div>
  )
}

export default DateTimeInput
