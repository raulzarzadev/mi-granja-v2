'use client'

import React from 'react'
import {
  Controller,
  ControllerRenderProps,
  FieldPath,
  FieldValues,
  RegisterOptions,
  useFormContext,
} from 'react-hook-form'
import DateTimeInput from '../inputs/DateTimeInput'

type DateFieldBaseProps = {
  label?: string
  helperText?: string
  type?: 'date' | 'datetime'
  onDateChange?: (date: Date | null) => void
} & Pick<React.ComponentProps<typeof DateTimeInput>, 'required' | 'disabled' | 'className'>

export interface DateFieldProps<TFieldValues extends FieldValues> extends DateFieldBaseProps {
  name: FieldPath<TFieldValues>
  rules?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>
}

export function DateField<TFieldValues extends FieldValues>({
  name,
  label,
  helperText,
  type = 'date',
  rules,
  ...rest
}: DateFieldProps<TFieldValues>) {
  const { control } = useFormContext<TFieldValues>()
  const { onDateChange, ...dateInputProps } = rest

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({
        field,
        fieldState,
      }: {
        field: ControllerRenderProps<TFieldValues, FieldPath<TFieldValues>>
        fieldState: { error?: { message?: string } }
      }) => {
        return (
          <div className="space-y-1">
            {label ? (
              <label htmlFor={name} className="block text-sm font-medium text-gray-700">
                {label}
              </label>
            ) : null}
            <DateTimeInput
              {...dateInputProps}
              type={type}
              value={(field.value as Date | null | undefined) ?? null}
              onChange={(date) => {
                field.onChange(date)
                onDateChange?.(date)
              }}
            />
            {helperText ? <p className="text-xs text-gray-500">{helperText}</p> : null}
            {fieldState.error?.message ? (
              <p className="text-xs text-red-600">{String(fieldState.error.message)}</p>
            ) : null}
          </div>
        )
      }}
    />
  )
}
