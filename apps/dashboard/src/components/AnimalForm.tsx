'use client'

import { toDate } from 'date-fns'
import React, { useMemo } from 'react'
import { Controller, ControllerRenderProps } from 'react-hook-form'
import { z } from 'zod'
import { useZodForm } from '@/hooks/useZodForm'
import {
  Animal,
  AnimalType,
  animal_icon,
  animal_statuses,
  animals_genders,
  animals_stages,
  animals_types,
  breeding_animal_status,
} from '@/types/animals'
import { DatePickerButtons } from './buttons/date-picker-buttons'
import { Form } from './forms/Form'
import { SelectField } from './forms/SelectField'
import { StageSelector } from './forms/StageSelector'
import { TextField } from './forms/TextField'
import { WeightField } from './inputs/WeightInput'

interface AnimalFormProps {
  onSubmit: (animalData: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  initialData?: Partial<Animal>
  isLoading?: boolean
  existingAnimals?: Animal[] // Lista de animales existentes para validar duplicados
}

/**
 * Formulario para registrar o editar animales
 * Optimizado para uso móvil con validación integrada
 */
const schema = z
  .object({
    animalNumber: z.string().trim().min(1, 'El ID del animal es requerido'),
    name: z.string().optional(),
    type: z.enum(animals_types, {
      required_error: 'Selecciona una especie',
    }),
    stage: z.enum(animals_stages, {
      required_error: 'Selecciona una etapa',
    }),
    gender: z.enum(animals_genders),
    weight: z
      .string()
      .optional()
      .refine(
        (value: string | undefined) =>
          !value || (!Number.isNaN(Number(value)) && Number(value) >= 0),
        {
          message: 'El peso debe ser un número válido',
        },
      ),
    age: z
      .string()
      .optional()
      .refine(
        (value: string | undefined) =>
          !value || (!Number.isNaN(Number(value)) && Number(value) >= 0),
        {
          message: 'La edad debe ser un número válido mayor o igual a 0',
        },
      ),
    breed: z.string().optional(),
    birthDate: z.string().optional(),
    customWeaningDays: z
      .string()
      .optional()
      .refine(
        (value: string | undefined) =>
          !value || (!Number.isNaN(Number(value)) && Number(value) > 0),
        {
          message: 'Debe ser un número válido mayor a 0 (o vacío)',
        },
      ),
    motherId: z.string().optional(),
    fatherId: z.string().optional(),
    batch: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum([...animal_statuses, ...breeding_animal_status] as const).default('activo'),
  })
  .superRefine((data, ctx) => {
    if (data.birthDate) {
      const [y, m, d] = data.birthDate.split('-').map(Number)
      const parsed = new Date(y, m - 1, d)
      if (parsed > new Date()) {
        ctx.addIssue({
          path: ['birthDate'],
          code: z.ZodIssueCode.custom,
          message: 'La fecha no puede ser en el futuro',
        })
      }
    }
  })

type FormSchema = z.infer<typeof schema>

const AnimalForm: React.FC<AnimalFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  existingAnimals = [],
}) => {
  const defaultValues = useMemo<FormSchema>(() => {
    return {
      animalNumber: initialData?.animalNumber ?? '',
      name: initialData?.name ?? '',
      type: initialData?.type ?? animals_types[0],
      stage: initialData?.stage ?? animals_stages[0],
      gender: initialData?.gender ?? animals_genders[0],
      weight:
        typeof initialData?.weight === 'number'
          ? (initialData.weight / 1000).toString()
          : initialData?.weight
            ? (Number(initialData.weight) / 1000).toString()
            : '',
      age:
        typeof initialData?.age === 'number'
          ? initialData.age.toString()
          : initialData?.age !== undefined && initialData?.age !== null
            ? String(initialData.age)
            : '',
      breed: initialData?.breed ?? '',
      birthDate: initialData?.birthDate
        ? (() => {
            const d = toDate(initialData.birthDate)
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          })()
        : '',
      customWeaningDays:
        typeof initialData?.customWeaningDays === 'number'
          ? initialData.customWeaningDays.toString()
          : '',
      motherId: initialData?.motherId ?? '',
      fatherId: initialData?.fatherId ?? '',
      batch: initialData?.batch ?? '',
      notes: initialData?.notes ?? '',
      status: initialData?.status ?? 'activo',
    }
  }, [initialData])

  const form = useZodForm({
    schema,
    defaultValues,
    mode: 'onBlur',
  })

  const handleSubmit = (values: FormSchema) => {
    const trimmedAnimalNumber = values.animalNumber.trim()

    const isDuplicate = existingAnimals.some((animal) => {
      const currentNumber = animal.animalNumber.trim().toLowerCase()
      const submittedNumber = trimmedAnimalNumber.toLowerCase()
      return currentNumber === submittedNumber && animal.id !== initialData?.id
    })

    if (isDuplicate) {
      form.setError('animalNumber', {
        type: 'validate',
        message: `Ya existe un animal con el número "${trimmedAnimalNumber}"`,
      })
      return
    }

    const transformed: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'> = {
      animalNumber: trimmedAnimalNumber,
      ...(values.name?.trim() ? { name: values.name.trim() } : {}),
      type: values.type,
      stage: values.stage,
      gender: values.gender,
      breed: values.breed?.trim() ?? '',
      status: values.status as Animal['status'],
      ...(values.weight ? { weight: Math.round(Number(values.weight) * 1000) } : {}),
      ...(values.age ? { age: Number(values.age) } : {}),
      ...(values.birthDate
        ? {
            birthDate: (() => {
              const [y, m, d] = values.birthDate.split('-').map(Number)
              return new Date(y, m - 1, d)
            })(),
          }
        : {}),
      ...(values.customWeaningDays ? { customWeaningDays: Number(values.customWeaningDays) } : {}),
      ...(values.motherId?.trim() ? { motherId: values.motherId.trim() } : {}),
      ...(values.fatherId?.trim() ? { fatherId: values.fatherId.trim() } : {}),
      ...(values.batch?.trim() ? { batch: values.batch.trim() } : {}),
      ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
    }

    onSubmit(transformed)
  }

  const animalTypeOptions: { value: AnimalType; label: string }[] = animals_types.map((type) => ({
    value: type,
    label: `${animal_icon[type]} ${type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}`,
  }))

  const selectedType = form.watch('type')
  return (
    <Form form={form} onSubmit={handleSubmit} className="space-y-4">
      <TextField
        name="animalNumber"
        label="ID del Animal *"
        placeholder="Ej: A001, OV123"
        disabled={isLoading}
      />

      <TextField
        name="name"
        label="Nombre"
        placeholder="Ej: Luna, Manchas (opcional)"
        disabled={isLoading}
      />

      <SelectField
        name="type"
        label="Especie *"
        options={animalTypeOptions.map((type) => ({
          value: type.value,
          label: type.label,
        }))}
        disabled={isLoading}
      />
      {/* Raza */}
      <TextField
        name="breed"
        label="Raza"
        placeholder="Ej: Holstein, Angus, Dorper"
        disabled={isLoading}
      />

      {/* Etapa */}
      <StageSelector name="stage" animalType={selectedType} disabled={isLoading} />

      {/* Status */}

      <SelectField
        name="status"
        label="Estado *"
        options={[...animal_statuses, ...breeding_animal_status].map((status) => ({
          value: status,
          label: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
        }))}
        disabled={isLoading}
      />

      {/* Género */}

      <SelectField
        name="gender"
        label="Género *"
        options={animals_genders.map((gender) => ({
          value: gender,
          label: gender.charAt(0).toUpperCase() + gender.slice(1),
        }))}
        disabled={isLoading}
      />

      <div className="grid grid-cols-2 gap-4">
        <WeightField name="weight" label="Peso" disabled={isLoading} />

        <TextField
          name="age"
          type="number"
          label="Edad (meses)"
          placeholder="0"
          min="0"
          disabled={isLoading}
        />
      </div>

      <Controller
        control={form.control}
        name="birthDate"
        render={({
          field,
          fieldState,
        }: {
          field: ControllerRenderProps<FormSchema, 'birthDate'>
          fieldState: { error?: { message?: string } }
        }) => (
          <div className="space-y-1">
            <DatePickerButtons
              value={field.value ?? ''}
              onChange={(val) => {
                field.onChange(val)
                if (val) {
                  const [y, m] = val.split('-').map(Number)
                  const today = new Date()
                  const monthsDiff = (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m)
                  form.setValue('age', Math.max(0, monthsDiff).toString())
                }
              }}
              label="Fecha de Nacimiento"
              showToday
            />
            {fieldState.error?.message ? (
              <p className="text-xs text-red-600">{fieldState.error.message}</p>
            ) : null}
          </div>
        )}
      />

      <div>
        <TextField
          name="customWeaningDays"
          type="number"
          label="Días de destete (opcional)"
          placeholder="Ej: 60"
          min="1"
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 mt-1">
          Si lo dejas vacío, se usará el valor por defecto según la especie.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField name="motherId" label="ID Madre" placeholder="Opcional" disabled={isLoading} />
        <TextField name="fatherId" label="ID Padre" placeholder="Opcional" disabled={isLoading} />
      </div>

      <TextField
        name="batch"
        label="Lote"
        placeholder="Ej: L001, Lote-Marzo-2026"
        disabled={isLoading}
      />

      <TextField
        name="notes"
        label="Notas"
        placeholder="Observaciones adicionales..."
        multiline
        rows={3}
        disabled={isLoading}
      />

      {Object.keys(form.formState.errors).length > 0 && form.formState.isSubmitted && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <p className="font-medium mb-1">Corrige los siguientes errores:</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            {Object.entries(form.formState.errors).map(([key, error]) => (
              <li key={key}>{(error as { message?: string })?.message || `Campo "${key}" inválido`}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
          disabled={isLoading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? 'Guardando...' : initialData ? 'Actualizar' : 'Registrar'}
        </button>
      </div>
    </Form>
  )
}

export default AnimalForm
