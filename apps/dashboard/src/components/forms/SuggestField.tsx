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
import {
  InputSelectSuggest,
  InputSelectSuggestProps,
  SelectSuggestOption,
} from '../inputs/InputSelectSuggest'

type BaseSuggestFieldProps<TOptionData> = Omit<
  InputSelectSuggestProps<TOptionData>,
  'selectedIds' | 'onSelect' | 'onRemove'
>

export interface SuggestFieldProps<TFieldValues extends FieldValues, TOptionData = string>
  extends BaseSuggestFieldProps<TOptionData> {
  name: FieldPath<TFieldValues>
  rules?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>
  onAddOption?: (option: SelectSuggestOption<TOptionData>) => void
  onRemoveOption?: (option: SelectSuggestOption<TOptionData>) => void
}

export function SuggestField<TFieldValues extends FieldValues, TOptionData = string>({
  name,
  rules,
  options,
  onAddOption,
  onRemoveOption,
  ...rest
}: SuggestFieldProps<TFieldValues, TOptionData>) {
  const { control } = useFormContext<TFieldValues>()

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
        const value = Array.isArray(field.value) ? (field.value as string[]) : []

        const handleSelect = (id: string) => {
          if (value.includes(id)) {
            return
          }
          const option = options.find((item) => item.id === id)
          field.onChange([...value, id])
          if (option && onAddOption) {
            onAddOption(option)
          }
        }

        const handleRemove = (id: string) => {
          if (!value.includes(id)) {
            return
          }
          const option = options.find((item) => item.id === id)
          field.onChange(value.filter((item) => item !== id))
          if (option && onRemoveOption) {
            onRemoveOption(option)
          }
        }

        return (
          <div className="space-y-1">
            <InputSelectSuggest
              {...rest}
              options={options}
              selectedIds={value}
              onSelect={handleSelect}
              onRemove={handleRemove}
            />
            {fieldState.error?.message ? (
              <p className="text-xs text-red-600">{String(fieldState.error.message)}</p>
            ) : null}
          </div>
        )
      }}
    />
  )
}
