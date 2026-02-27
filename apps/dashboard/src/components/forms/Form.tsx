'use client'

import {
  FormProvider,
  UseFormReturn,
  FieldValues,
  SubmitHandler
} from 'react-hook-form'
import React from 'react'

interface FormProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  form: UseFormReturn<TFieldValues>
  onSubmit?: SubmitHandler<TFieldValues>
}

/**
 * Wrapper to bind react-hook-form context to standard <form> usage.
 */
export function Form<TFieldValues extends FieldValues = FieldValues>({
  form,
  onSubmit,
  children,
  ...rest
}: FormProps<TFieldValues>) {
  return (
    <FormProvider {...form}>
      <form
        onSubmit={onSubmit ? form.handleSubmit(onSubmit) : undefined}
        {...rest}
      >
        {children}
      </form>
    </FormProvider>
  )
}

export type { FormProps }
