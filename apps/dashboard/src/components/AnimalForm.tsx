'use client'

import { toDate } from 'date-fns'
import React, { useMemo } from 'react'
import { Controller, UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { useZodForm } from '@/hooks/useZodForm'
import { getWeaningDays } from '@/lib/animalBreedingConfig'
import {
  Animal,
  animal_icon,
  animal_stage_icons,
  animal_statuses,
  animals_genders,
  animals_stages,
  animals_stages_labels,
  animals_types,
  breeding_animal_status,
  POST_WEAN_STAGES,
} from '@/types/animals'
import { DatePickerButtons } from './buttons/date-picker-buttons'
import { Form } from './forms/Form'
import { TextField } from './forms/TextField'
import { Icon } from './Icon/icon'
import AnimalSelector from './inputs/AnimalSelector'
import { BirthDateInput } from './inputs/BirthDateInput'
import { InputRadioCards } from './inputs/InputRadioCards'
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
    pregnantAt: z.string().optional(),
    pregnantBy: z.string().optional(),
    birthedAt: z.string().optional(),
    weanedMotherAt: z.string().optional(),
    weanedAt: z.string().optional(),
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

type ReproductiveState = 'embarazada' | 'parida' | 'destetada' | ''

const reproOptions: {
  value: ReproductiveState
  label: string
  icon: string
  field: keyof FormSchema
}[] = [
  { value: 'embarazada', label: 'Embarazada', icon: '🤰', field: 'pregnantAt' },
  { value: 'parida', label: 'Parida', icon: '🍼', field: 'birthedAt' },
  { value: 'destetada', label: 'Destetó', icon: '✂️', field: 'weanedMotherAt' },
]

const ReproductiveStatusField: React.FC<{
  form: UseFormReturn<FormSchema>
  isLoading?: boolean
  existingAnimals?: Animal[]
  currentAnimalId?: string
  animalType?: Animal['type']
}> = ({ form, isLoading, existingAnimals = [], currentAnimalId, animalType }) => {
  const pregnantAt = form.watch('pregnantAt')
  const pregnantBy = form.watch('pregnantBy')
  const birthedAt = form.watch('birthedAt')
  const weanedMotherAt = form.watch('weanedMotherAt')

  const selected: ReproductiveState = weanedMotherAt
    ? 'destetada'
    : birthedAt
      ? 'parida'
      : pregnantAt
        ? 'embarazada'
        : ''

  const activeOption = reproOptions.find((o) => o.value === selected)
  const activeField = activeOption?.field

  const handleSelect = (state: ReproductiveState) => {
    // Limpiar todos
    form.setValue('pregnantAt', '')
    form.setValue('pregnantBy', '')
    form.setValue('birthedAt', '')
    form.setValue('weanedMotherAt', '')

    // Si deselecciona el mismo, queda sin estado
    if (state === selected) return

    // Poner fecha de hoy en el campo correspondiente
    const today = new Date().toISOString().split('T')[0]
    const opt = reproOptions.find((o) => o.value === state)
    if (opt) form.setValue(opt.field, today)
  }

  return (
    <div className="space-y-3">
      <InputRadioCards
        label="Estado reproductivo"
        value={selected}
        onChange={handleSelect}
        disabled={isLoading}
        columns={3}
        options={reproOptions.map((o) => ({ value: o.value, label: o.label, icon: o.icon }))}
      />
      {activeField && (
        <Controller
          control={form.control}
          name={activeField}
          render={({ field }) => (
            <DatePickerButtons
              value={field.value ?? ''}
              onChange={field.onChange}
              label={activeOption!.label}
              showToday
            />
          )}
        />
      )}
      {selected === 'embarazada' && (
        <div>
          <AnimalSelector
            label="Padre (macho que la embarazó)"
            animals={existingAnimals}
            selectedIds={pregnantBy ? [pregnantBy] : []}
            onAdd={(id) => form.setValue('pregnantBy', id)}
            onRemove={() => form.setValue('pregnantBy', '')}
            mode="single"
            placeholder="Buscar macho..."
            filterFn={(a) =>
              a.gender === 'macho' &&
              a.id !== currentAnimalId &&
              (!animalType || a.type === animalType)
            }
          />
          <p className="text-xs text-gray-400 mt-1">
            Opcional. Recomendado para rastrear la genealogía de las crías.
          </p>
        </div>
      )}
      {!selected && (
        <p className="text-xs text-gray-400">
          Sin estado reproductivo activo. Selecciona uno si aplica.
        </p>
      )}
    </div>
  )
}

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
      pregnantAt: initialData?.pregnantAt
        ? (() => {
            const d = toDate(initialData.pregnantAt)
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          })()
        : '',
      pregnantBy: initialData?.pregnantBy ?? '',
      birthedAt: initialData?.birthedAt
        ? (() => {
            const d = toDate(initialData.birthedAt)
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          })()
        : '',
      weanedMotherAt: initialData?.weanedMotherAt
        ? (() => {
            const d = toDate(initialData.weanedMotherAt)
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          })()
        : '',
      weanedAt: initialData?.weanedAt
        ? (() => {
            const d = toDate(initialData.weanedAt)
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          })()
        : '',
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

    // Solo marcar isWeaned=true si el animal ya superó la edad de destete de su especie.
    // Evita falsos destetes para bebés creados con stage='juvenil' desde este form.
    const weaningDays = getWeaningDays(values.type)
    const birthDateForAge = values.birthDate
      ? (() => {
          const [y, m, d] = values.birthDate.split('-').map(Number)
          return new Date(y, m - 1, d)
        })()
      : null
    const ageDays = birthDateForAge
      ? Math.floor((Date.now() - birthDateForAge.getTime()) / (1000 * 60 * 60 * 24))
      : values.age
        ? Number(values.age) * 30
        : Number.POSITIVE_INFINITY
    const isPostWean = POST_WEAN_STAGES.includes(values.stage) && ageDays >= weaningDays

    // Calcular weanedAt: usar el valor explícito del form, o estimar como birthDate + weaningDays
    const explicitWeanedAt = values.weanedAt
      ? (() => {
          const [y, m, d] = values.weanedAt.split('-').map(Number)
          return new Date(y, m - 1, d)
        })()
      : null
    const estimatedWeanedAt =
      isPostWean && !explicitWeanedAt
        ? birthDateForAge
          ? new Date(birthDateForAge.getTime() + weaningDays * 24 * 60 * 60 * 1000)
          : new Date()
        : null
    const weanedAtDate = explicitWeanedAt ?? estimatedWeanedAt

    const transformed: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'> = {
      animalNumber: trimmedAnimalNumber,
      ...(values.name?.trim() ? { name: values.name.trim() } : {}),
      type: values.type,
      stage: values.stage,
      gender: values.gender,
      ...(isPostWean ? { isWeaned: true, weanedAt: weanedAtDate ?? undefined } : {}),
      ...(explicitWeanedAt && !isPostWean ? { weanedAt: explicitWeanedAt } : {}),
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
      ...(values.gender === 'hembra'
        ? {
            pregnantAt: values.pregnantAt
              ? (() => {
                  const [y, m, d] = values.pregnantAt.split('-').map(Number)
                  return new Date(y, m - 1, d)
                })()
              : null,
            pregnantBy: values.pregnantAt ? values.pregnantBy?.trim() || null : null,
            birthedAt: values.birthedAt
              ? (() => {
                  const [y, m, d] = values.birthedAt.split('-').map(Number)
                  return new Date(y, m - 1, d)
                })()
              : null,
            weanedMotherAt: values.weanedMotherAt
              ? (() => {
                  const [y, m, d] = values.weanedMotherAt.split('-').map(Number)
                  return new Date(y, m - 1, d)
                })()
              : null,
          }
        : {}),
    }

    onSubmit(transformed)
  }

  const selectedType = form.watch('type')
  const selectedGender = form.watch('gender')
  return (
    <Form form={form} onSubmit={handleSubmit} className="space-y-4">
      {/* Especie */}
      <InputRadioCards
        label="Especie *"
        value={selectedType}
        onChange={(v) => form.setValue('type', v)}
        disabled={isLoading}
        columns={5}
        options={animals_types.map((type) => ({
          value: type,
          label: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
          icon: animal_icon[type],
        }))}
      />

      {/* Estado */}
      <InputRadioCards
        label="Estado"
        value={form.watch('status')}
        onChange={(v) => form.setValue('status', v)}
        disabled={isLoading}
        columns={4}
        options={[
          { value: 'activo', label: 'Activo', icon: '✅' },
          { value: 'muerto', label: 'Muerto', icon: '💀' },
          { value: 'vendido', label: 'Vendido', icon: '💰' },
          { value: 'perdido', label: 'Perdido', icon: '🔍' },
        ]}
      />

      {/* ID + Nombre */}
      <div className="grid grid-cols-2 gap-4">
        <TextField
          name="animalNumber"
          label="ID del Animal *"
          placeholder="Ej: A001, OV123"
          disabled={isLoading}
          autoFocus
        />
        <TextField
          name="name"
          label="Nombre"
          placeholder="Ej: Luna, Manchas"
          disabled={isLoading}
        />
      </div>

      {/* Fila 3: Raza + Género */}
      <div className="grid grid-cols-2 gap-4">
        <TextField
          name="breed"
          label="Raza"
          placeholder="Ej: Dorper, Katahdin"
          disabled={isLoading}
        />
        <InputRadioCards
          label="Género *"
          value={selectedGender}
          onChange={(v) => form.setValue('gender', v)}
          disabled={isLoading}
          columns={2}
          options={[
            {
              value: 'macho',
              label: 'Macho',
              icon: <Icon icon="male" className="w-4 h-4 inline" />,
            },
            {
              value: 'hembra',
              label: 'Hembra',
              icon: <Icon icon="female" className="w-4 h-4 inline" />,
            },
          ]}
        />
      </div>

      {/* Fila 4: Peso + Fecha nac / Edad */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          control={form.control}
          name="birthDate"
          render={({ field, fieldState }) => (
            <BirthDateInput
              label="Fecha de nacimiento"
              value={field.value ?? ''}
              onChange={(val) => {
                field.onChange(val)
                if (val) {
                  const [y2, m2] = val.split('-').map(Number)
                  const now = new Date()
                  const diff = (now.getFullYear() - y2) * 12 + (now.getMonth() + 1 - m2)
                  form.setValue('age', Math.max(0, diff).toString())
                }
              }}
              disabled={isLoading}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="weanedAt"
          render={({ field, fieldState }) => (
            <BirthDateInput
              showAge={false}
              label="Fecha de destete"
              value={field.value ?? ''}
              onChange={(val) => {
                field.onChange(val)
                if (val) {
                  const [y2, m2] = val.split('-').map(Number)
                  const now = new Date()
                  const diff = (now.getFullYear() - y2) * 12 + (now.getMonth() + 1 - m2)
                  form.setValue('age', Math.max(0, diff).toString())
                }
              }}
              disabled={isLoading}
              error={fieldState.error?.message}
            />
          )}
        />
      </div>

      {/* Fila 5: Etapa */}
      <InputRadioCards
        label="Etapa *"
        value={form.watch('stage')}
        onChange={(v) => form.setValue('stage', v)}
        disabled={isLoading}
        columns={3}
        options={animals_stages.map((s) => ({
          value: s,
          label: animals_stages_labels[s],
          icon: animal_stage_icons[s],
        }))}
      />

      {/* Fila 6: Estado reproductivo (solo hembras) */}
      {selectedGender === 'hembra' && (
        <ReproductiveStatusField
          form={form}
          isLoading={isLoading}
          existingAnimals={existingAnimals}
          currentAnimalId={initialData?.id}
          animalType={selectedType}
        />
      )}

      {/* Campos secundarios colapsados */}
      <div className="border-t border-gray-100 pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField name="motherId" label="ID Madre" placeholder="Opcional" disabled={isLoading} />
          <TextField name="fatherId" label="ID Padre" placeholder="Opcional" disabled={isLoading} />
        </div>

        <TextField name="batch" label="Lote" placeholder="Ej: L001" disabled={isLoading} />

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

        <TextField
          name="notes"
          label="Notas"
          placeholder="Observaciones adicionales..."
          multiline
          rows={2}
          disabled={isLoading}
        />
      </div>

      {Object.keys(form.formState.errors).length > 0 && form.formState.isSubmitted && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <p className="font-medium mb-1">Corrige los siguientes errores:</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            {Object.entries(form.formState.errors).map(([key, error]) => (
              <li key={key}>
                {(error as { message?: string })?.message || `Campo "${key}" inválido`}
              </li>
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
