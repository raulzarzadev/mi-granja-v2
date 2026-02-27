'use client'

import React, { forwardRef, MutableRefObject } from 'react'
import { FieldPath, FieldValues, RegisterOptions, useFormContext } from 'react-hook-form'

interface SharedTextFieldProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>
  label?: string
  helperText?: string
  rules?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>
}

interface TextFieldInputProps<TFieldValues extends FieldValues>
  extends SharedTextFieldProps<TFieldValues>,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> {
  multiline?: false
}

interface TextFieldTextareaProps<TFieldValues extends FieldValues>
  extends SharedTextFieldProps<TFieldValues>,
    Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> {
  multiline: true
}

export type TextFieldProps<TFieldValues extends FieldValues> =
  | TextFieldInputProps<TFieldValues>
  | TextFieldTextareaProps<TFieldValues>

function TextFieldComponent<TFieldValues extends FieldValues>(
  {
    name,
    label,
    helperText,
    rules,
    multiline,
    className,
    disabled,
    ...rest
  }: TextFieldProps<TFieldValues>,
  ref: React.ForwardedRef<HTMLInputElement | HTMLTextAreaElement>,
) {
  const { register, getFieldState, formState } = useFormContext<TFieldValues>()

  const { error } = getFieldState(name, formState)
  const { ref: registerRef, ...fieldProps } = register(name, rules)

  const baseClassName = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder:text-gray-500  resize-none ${
    error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
  }`
  const finalClassName = className ? `${baseClassName} ${className}`.trim() : baseClassName

  const handleRef = (element: HTMLInputElement | HTMLTextAreaElement | null) => {
    registerRef(element)
    if (typeof ref === 'function') {
      ref(element)
    } else if (ref) {
      ;(ref as MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>).current = element
    }
  }

  const sharedProps = {
    id: name,
    ...fieldProps,
    'aria-invalid': !!error,
    'aria-describedby': helperText ? `${name}-helper` : undefined,
    className: finalClassName,
    disabled: disabled ?? formState.isSubmitting,
  }

  return (
    <div className="space-y-1">
      {label ? (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      ) : null}
      {multiline ? (
        <textarea
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          {...sharedProps}
          ref={handleRef}
          rows={(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>).rows ?? 3}
        />
      ) : (
        <input
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
          {...sharedProps}
          ref={handleRef}
        />
      )}
      {helperText ? (
        <p id={`${name}-helper`} className="text-xs text-gray-500">
          {helperText}
        </p>
      ) : null}
      {error?.message ? <p className="text-xs text-red-600">{String(error.message)}</p> : null}
    </div>
  )
}

const TextField = forwardRef(TextFieldComponent) as <
  TFieldValues extends FieldValues = FieldValues,
>(
  props: TextFieldProps<TFieldValues> & {
    ref?: React.Ref<HTMLInputElement | HTMLTextAreaElement>
  },
) => ReturnType<typeof TextFieldComponent>

export { TextField }
