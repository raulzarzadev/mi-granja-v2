'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, UseFormProps } from 'react-hook-form'
import { z } from 'zod'

type UseZodFormProps<TSchema extends z.ZodTypeAny> = {
  schema: TSchema
} & Omit<UseFormProps<z.infer<TSchema>>, 'resolver'>

/**
 * Typed helper around useForm that wires zodResolver automatically.
 */
export function useZodForm<TSchema extends z.ZodTypeAny>({
  schema,
  ...formProps
}: UseZodFormProps<TSchema>) {
  return useForm<z.infer<TSchema>>({
    ...formProps,
    resolver: zodResolver(schema)
  })
}
