'use client'

import React, { forwardRef } from 'react'
import { FieldPath, FieldValues, RegisterOptions } from 'react-hook-form'
import { SelectFieldComponent } from './SelectFieldComponent'

interface Option {
  label: string
  value: string | number
}

interface SelectFieldBaseProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  label?: string
  helperText?: string
  options: Option[]
  rules?: RegisterOptions<FieldValues, string>
}

export interface SelectFieldProps<TFieldValues extends FieldValues>
  extends Omit<SelectFieldBaseProps, 'rules'> {
  name: FieldPath<TFieldValues>
  rules?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>
}

const SelectField = forwardRef(SelectFieldComponent) as <
  TFieldValues extends FieldValues = FieldValues,
>(
  props: SelectFieldProps<TFieldValues> & { ref?: React.Ref<HTMLSelectElement> },
) => ReturnType<typeof SelectFieldComponent>

export { SelectField }
