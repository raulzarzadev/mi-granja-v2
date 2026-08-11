'use client'

import { useState } from 'react'
import { DatePickerButtons, type DatePickerButtonsProps } from '../buttons/date-picker-buttons'
import { Modal } from '../Modal'

interface DatePickerModalProps extends Omit<DatePickerButtonsProps, 'label'> {
  /** Label shown above the trigger button */
  label?: string
  /** Placeholder when no date is selected */
  placeholder?: string
  /** Disable the trigger */
  disabled?: boolean
  /** Extra className for the trigger button */
  className?: string
  /** Accessible name when the visible label is rendered by a parent component */
  ariaLabel?: string
  /** Marks the date as required for assistive technology */
  required?: boolean
  /** Marks the trigger as invalid for assistive technology */
  invalid?: boolean
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
  ariaLabel,
  required = false,
  invalid = false,
  ...pickerProps
}: DatePickerModalProps) {
  const [open, setOpen] = useState(false)

  const display = formatDisplay(value)

  return (
    <>
      <div className={className}>
        {label && <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          aria-label={ariaLabel ?? label ?? placeholder}
          aria-required={required}
          aria-invalid={invalid}
          className={`group inline-flex min-h-11 items-center gap-2 rounded-md border bg-white px-3 py-2 text-left text-sm shadow-sm transition-[border-color,box-shadow,background-color] enabled:cursor-pointer enabled:hover:border-green-600 enabled:hover:bg-green-50/40 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 ${
            invalid
              ? 'border-red-500 focus-visible:ring-red-500'
              : 'border-gray-400 focus-visible:border-green-600 focus-visible:ring-green-600'
          }`}
        >
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="size-5 shrink-0 text-green-700 group-disabled:text-gray-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3.75 9h16.5"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.25 4.5h13.5a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5Z"
            />
          </svg>
          <span
            className={`truncate whitespace-nowrap ${display ? 'text-gray-900' : 'text-gray-600'}`}
          >
            {display || placeholder}
          </span>
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
          <DatePickerButtons value={value} onChange={onChange} showToday {...pickerProps} />
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
