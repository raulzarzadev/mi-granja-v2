'use client'

import React, { MutableRefObject } from 'react'
import { FieldValues, useFormContext } from 'react-hook-form'
import type { SelectFieldProps } from './SelectField'

export function SelectFieldComponent<TFieldValues extends FieldValues>(
  { name, label, helperText, options, rules, ...selectProps }: SelectFieldProps<TFieldValues>,
  ref: React.ForwardedRef<HTMLSelectElement>,
) {
  const { register, getFieldState, formState } = useFormContext<TFieldValues>()

  const { ref: registerRef, ...fieldProps } = register(name, rules)
  const { error } = getFieldState(name, formState)
  const { className, disabled, children, ...rest } = selectProps
  const baseClassName = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
    error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
  }`
  const finalClassName = className ? `${baseClassName} ${className}`.trim() : baseClassName

  const handleRef = (element: HTMLSelectElement | null) => {
    registerRef(element)
    if (typeof ref === 'function') {
      ref(element)
    } else if (ref) {
      ;(ref as MutableRefObject<HTMLSelectElement | null>).current = element
    }
  }

  return (
    <div className="space-y-1">
      {label ? (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      ) : null}
      <select
        id={name}
        {...fieldProps}
        {...rest}
        ref={handleRef}
        className={finalClassName}
        disabled={disabled ?? formState.isSubmitting}
      >
        {children}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? <p className="text-xs text-gray-500">{helperText}</p> : null}
      {error?.message ? <p className="text-xs text-red-600">{String(error.message)}</p> : null}
    </div>
  )
}
