'use client'

import { useState } from 'react'
import {
  DatePickerButtons,
  type DatePickerButtonsProps,
} from '../buttons/date-picker-buttons'
import { Modal } from '../Modal'

interface DatePickerModalProps
  extends Omit<DatePickerButtonsProps, 'label'> {
  /** Label shown above the trigger button */
  label?: string
  /** Placeholder when no date is selected */
  placeholder?: string
  /** Disable the trigger */
  disabled?: boolean
  /** Extra className for the trigger button */
  className?: string
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatDisplay(value: string): string {
  if (!value) return ''
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return value
  return `${d} ${MONTHS[m - 1]} ${String(y).slice(-2)}`
}

export function DatePickerModal({
  value,
  onChange,
  label,
  placeholder = 'Seleccionar fecha',
  disabled,
  className,
  ...pickerProps
}: DatePickerModalProps) {
  const [open, setOpen] = useState(false)

  const display = formatDisplay(value)

  return (
    <>
      <div className={className}>
        {label && (
          <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm text-left whitespace-nowrap truncate hover:border-green-500 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {display || (
            <span style={{ color: '#d1d5db' }}>{placeholder}</span>
          )}
        </button>
      </div>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={label || 'Seleccionar fecha'}
        size="md"
        contentClassName="!overflow-visible"
      >
        <div className="py-2 space-y-4">
          <DatePickerButtons
            value={value}
            onChange={onChange}
            showToday
            {...pickerProps}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className="flex-1 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 px-3 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 cursor-pointer"
            >
              Aceptar
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
