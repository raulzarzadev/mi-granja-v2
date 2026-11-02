'use client'

import { intervalToDuration, subDays, subMonths } from 'date-fns'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { EmojiIcon } from '@/components/Icon/emoji-icons'
import InputIconSelect from '@/components/inputs/InputIconSelect'
import { Modal } from '@/components/Modal'
import { useZodForm } from '@/hooks/useZodForm'
import { registrationStages } from '@/lib/animal-registration-stages'
import { normalizeAnimalSearch } from '@/lib/animal-search'
import { ANIMAL_BREEDING_CONFIGS } from '@/lib/animalBreedingConfig'
import { auth, storage } from '@/lib/firebase'
import {
  type Animal,
  type AnimalStage,
  animal_icon,
  animal_stage_icons,
  animal_status_icons,
  animal_status_labels,
  animal_statuses,
  animals_genders,
  animals_genders_labels,
  animals_stages_labels,
  animals_types,
  animals_types_labels,
} from '@/types/animals'
import { DatePickerButtons } from './buttons/date-picker-buttons'
import { Form } from './forms/Form'
import { TextField } from './forms/TextField'
import AnimalSelector from './inputs/AnimalSelector'

// "juvenil" es una etapa interna calculada por edad. Para el usuario, la
// decisión al destetar es el destino productivo: engorda o reproducción.
const lifecycleOptions = [
  'cria',
  'engorda',
  'reproductor',
  'descarte',
  'embarazada',
  'lechera',
] as const

const schema = z
  .object({
    registrationMode: z.enum(['nuevo', 'parto']),
    animalNumber: z.string().trim(),
    type: z.enum(animals_types),
    status: z.enum(animal_statuses),
    gender: z.enum(animals_genders),
    isBreedingMale: z.boolean(),
    lifecycle: z.enum(lifecycleOptions),
    birthDate: z.string().min(1, 'Selecciona la fecha de nacimiento (puede ser estimada)'),
    weanedAt: z.string().optional(),
    pregnantAt: z.string().optional(),
    pregnantBy: z.string().optional(),
    birthedAt: z.string().optional(),
    lactationPurpose: z.enum(['offspring', 'dairy', 'dual']),
    name: z.string().optional(),
    motherId: z.string().optional(),
    fatherId: z.string().optional(),
    batch: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, context) => {
    if (data.registrationMode === 'parto' && !data.motherId) {
      context.addIssue({
        path: ['motherId'],
        code: z.ZodIssueCode.custom,
        message: 'Selecciona la madre para registrar un parto',
      })
    }
    const today = new Date()
    if (
      data.birthDate &&
      !registrationStages(data.type, data.gender, data.birthDate, today).includes(data.lifecycle)
    ) {
      context.addIssue({
        path: ['lifecycle'],
        code: z.ZodIssueCode.custom,
        message: 'Selecciona una etapa compatible con el género y la edad.',
      })
    }
    for (const field of ['birthDate', 'weanedAt', 'pregnantAt', 'birthedAt'] as const) {
      const value = data[field]
      if (!value) continue
      const [year, month, day] = value.split('-').map(Number)
      if (new Date(year, month - 1, day) > today) {
        context.addIssue({
          path: [field],
          code: z.ZodIssueCode.custom,
          message: 'La fecha no puede estar en el futuro',
        })
      }
    }
    if (data.lifecycle === 'embarazada' && data.gender !== 'hembra') {
      context.addIssue({
        path: ['lifecycle'],
        code: z.ZodIssueCode.custom,
        message: 'El estado Gestante sólo aplica a hembras',
      })
    }
    if (data.lifecycle === 'lechera' && data.gender !== 'hembra') {
      context.addIssue({
        path: ['lifecycle'],
        code: z.ZodIssueCode.custom,
        message: 'La condición Lechera sólo aplica a hembras',
      })
    }
    if (data.lifecycle === 'lechera' && !data.birthedAt) {
      context.addIssue({
        path: ['birthedAt'],
        code: z.ZodIssueCode.custom,
        message: 'La fecha del último parto es requerida para una hembra lechera',
      })
    }
    if (data.lifecycle === 'lechera' && !data.birthDate) {
      context.addIssue({
        path: ['birthDate'],
        code: z.ZodIssueCode.custom,
        message: 'La fecha de nacimiento es necesaria para registrar una madre o lechera',
      })
    }
    if (data.lifecycle === 'lechera' && data.birthDate && data.birthedAt) {
      const birthDate = inputToDate(data.birthDate)
      const lastBirthDate = inputToDate(data.birthedAt)
      if (birthDate && lastBirthDate) {
        if (birthDate >= lastBirthDate) {
          context.addIssue({
            path: ['birthedAt'],
            code: z.ZodIssueCode.custom,
            message: 'El último parto debe ser posterior al nacimiento de la madre',
          })
        } else {
          const monthsAtParturition =
            (lastBirthDate.getFullYear() - birthDate.getFullYear()) * 12 +
            lastBirthDate.getMonth() -
            birthDate.getMonth()
          const minBreedingAge = ANIMAL_BREEDING_CONFIGS[data.type]?.minBreedingAge ?? 12
          if (monthsAtParturition < minBreedingAge) {
            context.addIssue({
              path: ['birthDate'],
              code: z.ZodIssueCode.custom,
              message: `Revisa las fechas: el parto ocurrió antes de la edad reproductiva (${minBreedingAge} meses)`,
            })
          }
        }
      }
    }
    if (data.lifecycle === 'reproductor' && !data.birthDate) {
      context.addIssue({
        path: ['birthDate'],
        code: z.ZodIssueCode.custom,
        message: 'La fecha de nacimiento es necesaria para calcular la edad reproductiva',
      })
    }
  })

type FormSchema = z.infer<typeof schema>

interface SimpleAnimalFormProps {
  onSubmit: (
    animalData: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>,
  ) => void | Promise<void>
  onCancel: () => void
  onCreateMother?: (
    data: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>,
  ) => Promise<Animal>
  isMotherForm?: boolean
  initialData?: Partial<Animal>
  isLoading?: boolean
  existingAnimals?: Animal[]
}

function dateToInput(value: unknown): string {
  if (!value) return ''
  const date =
    value instanceof Date
      ? value
      : typeof (value as { toDate?: () => Date }).toDate === 'function'
        ? (value as { toDate: () => Date }).toDate()
        : new Date(value as string | number)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function inputToDate(value?: string): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export default function SimpleAnimalForm({
  onSubmit,
  onCancel,
  onCreateMother,
  isMotherForm = false,
  initialData,
  isLoading = false,
  existingAnimals = [],
}: SimpleAnimalFormProps) {
  const suggestedAnimalNumber = useMemo(() => {
    if (initialData?.animalNumber?.trim()) return initialData.animalNumber.trim()
    const used = new Set(
      existingAnimals.map((animal) => normalizeAnimalSearch(animal.animalNumber)),
    )
    let number = 1
    while (used.has(normalizeAnimalSearch(`A${number}`))) number += 1
    return `A${number}`
  }, [existingAnimals, initialData?.animalNumber])

  const initialIsLactating =
    initialData?.lactationStatus === 'active' ||
    (initialData?.lactationStatus === undefined && !!initialData?.birthedAt)
  const initialLifecycle = initialIsLactating
    ? 'lechera'
    : initialData?.pregnantAt
      ? 'embarazada'
      : initialData?.stage === 'juvenil' || initialData?.weaningDestination === 'reproductor'
        ? 'reproductor'
        : (initialData?.stage ?? 'cria')
  const defaultValues = useMemo<FormSchema>(
    () => ({
      registrationMode: 'nuevo',
      animalNumber: initialData?.animalNumber ?? '',
      type: initialData?.type ?? 'vaca',
      status: animal_statuses.includes(initialData?.status as (typeof animal_statuses)[number])
        ? (initialData?.status as (typeof animal_statuses)[number])
        : 'activo',
      gender: initialData?.gender ?? 'hembra',
      isBreedingMale: initialData?.isBreedingMale ?? false,
      lifecycle: initialLifecycle,
      birthDate: dateToInput(initialData?.birthDate),
      weanedAt: dateToInput(initialData?.weanedAt),
      pregnantAt: dateToInput(initialData?.pregnantAt),
      pregnantBy: initialData?.pregnantBy ?? '',
      birthedAt: dateToInput(initialData?.birthedAt),
      lactationPurpose: initialData?.lactationPurpose ?? 'dual',
      name: initialData?.name ?? '',
      motherId: initialData?.motherId ?? '',
      fatherId: initialData?.fatherId ?? '',
      batch: initialData?.batch ?? '',
      notes: initialData?.notes ?? '',
    }),
    [initialData, initialLifecycle],
  )
  const form = useZodForm({ schema, defaultValues, mode: 'onBlur' })
  const speciesPreferenceKey = `mi-granja:last-animal-species:${auth.currentUser?.uid ?? 'local'}`
  useEffect(() => {
    if (initialData?.type) return
    try {
      const saved = localStorage.getItem(speciesPreferenceKey)
      if (saved && animals_types.includes(saved as Animal['type'])) {
        form.setValue('type', saved as Animal['type'])
      }
    } catch {
      /* El formulario funciona aunque el almacenamiento no esté disponible. */
    }
  }, [speciesPreferenceKey])

  const [creatingMother, setCreatingMother] = useState(false)
  const [motherSearch, setMotherSearch] = useState('')
  const [createdMothers, setCreatedMothers] = useState<Animal[]>([])
  const selectableAnimals = useMemo(
    () => [
      ...existingAnimals,
      ...createdMothers.filter(
        (mother) => !existingAnimals.some((animal) => animal.id === mother.id),
      ),
    ],
    [existingAnimals, createdMothers],
  )
  const registrationMode = form.watch('registrationMode')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState(initialData?.imageUrl ?? '')
  const [photoError, setPhotoError] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const selectedType = form.watch('type')
  const selectedGender = form.watch('gender')
  const selectedBirthDate = form.watch('birthDate')
  const motherDefaults = useMemo<Partial<Animal>>(() => {
    const config = ANIMAL_BREEDING_CONFIGS[selectedType]
    const birthedAt = inputToDate(selectedBirthDate) ?? new Date()
    return {
      animalNumber: motherSearch,
      type: selectedType,
      gender: 'hembra',
      stage: 'reproductor',
      birthDate: subMonths(subDays(birthedAt, config.gestationDays), config.minBreedingAge),
      birthedAt,
      lactationStatus: 'active',
      lactationPurpose: 'offspring',
    }
  }, [selectedType, selectedBirthDate, motherSearch])

  const approximateAge = useMemo(() => {
    const birth = inputToDate(selectedBirthDate)
    const today = new Date()
    if (!birth || Number.isNaN(birth.getTime()) || birth > today) return null
    const { years = 0, months = 0, days = 0 } = intervalToDuration({ start: birth, end: today })
    const parts = []
    if (years) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`)
    if (months) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`)
    if (!parts.length) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`)
    return parts.join(' y ')
  }, [selectedBirthDate])
  const availableStages = useMemo(
    () => registrationStages(selectedType, selectedGender, selectedBirthDate),
    [selectedType, selectedGender, selectedBirthDate],
  )
  const selectedLifecycle = form.watch('lifecycle')
  const selectedPregnantBy = form.watch('pregnantBy')
  const selectedMotherId = form.watch('motherId')
  const selectedFatherId = form.watch('fatherId')
  const isBusy = isLoading || isUploading
  const canBeStud =
    selectedGender === 'macho' &&
    selectedLifecycle === 'reproductor' &&
    (() => {
      const birth = inputToDate(selectedBirthDate)
      if (!birth) return false
      const eligibleAt = new Date(
        birth.getFullYear(),
        birth.getMonth() + ANIMAL_BREEDING_CONFIGS[selectedType].minBreedingAge,
        birth.getDate(),
      )
      return new Date() >= eligibleAt
    })()
  useEffect(() => {
    if (!canBeStud) form.setValue('isBreedingMale', false)
  }, [canBeStud, form])

  useEffect(() => {
    if (availableStages.length && !availableStages.includes(selectedLifecycle)) {
      form.setValue('lifecycle', availableStages[0], { shouldValidate: form.formState.isSubmitted })
      form.setValue('pregnantAt', '')
      form.setValue('pregnantBy', '')
      form.setValue('birthedAt', '')
    }
  }, [form, availableStages, selectedLifecycle])

  useEffect(() => {
    if (!photoFile) return
    const objectUrl = URL.createObjectURL(photoFile)
    setPhotoPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [photoFile])

  const uploadPhoto = async (): Promise<string | undefined> => {
    if (!photoFile) return initialData?.imageUrl
    const ownerId = auth.currentUser?.uid
    if (!ownerId) throw new Error('Debes iniciar sesión para subir una imagen')
    const extension = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const photoRef = ref(
      storage,
      `users/${ownerId}/animal-photos/${crypto.randomUUID()}.${extension}`,
    )
    await uploadBytes(photoRef, photoFile, { contentType: photoFile.type })
    return getDownloadURL(photoRef)
  }

  const handleSubmit = async (values: FormSchema) => {
    const animalNumber = values.animalNumber.trim() || suggestedAnimalNumber
    const duplicate = existingAnimals.some(
      (animal) =>
        animal.id !== initialData?.id &&
        normalizeAnimalSearch(animal.animalNumber) === normalizeAnimalSearch(animalNumber),
    )
    if (duplicate) {
      form.setError('animalNumber', {
        type: 'validate',
        message: `Ya existe un animal con el ID “${animalNumber}”`,
      })
      return
    }

    if (values.registrationMode === 'parto') {
      const mother = selectableAnimals.find((animal) => animal.id === values.motherId)
      if (!mother || mother.type !== values.type || mother.gender !== 'hembra') {
        form.setError('motherId', { message: 'Selecciona una madre de la misma especie' })
        return
      }
      if (mother.birthDate && dateToInput(mother.birthDate) >= values.birthDate) {
        form.setError('birthDate', {
          message: 'El nacimiento debe ser posterior al nacimiento de la madre',
        })
        return
      }
    }
    setIsUploading(true)
    setPhotoError('')
    try {
      const imageUrl = await uploadPhoto()
      const isPregnant = values.lifecycle === 'embarazada' && values.gender === 'hembra'
      const isLactating = values.lifecycle === 'lechera' && values.gender === 'hembra'
      const preservesExistingPregnancy = isLactating && !!initialData?.pregnantAt
      const isBreedingDestination = values.lifecycle === 'reproductor'
      const weaningDestination =
        values.lifecycle === 'engorda' || values.lifecycle === 'reproductor'
          ? values.lifecycle
          : undefined
      const stage: AnimalStage =
        isPregnant || isLactating
          ? 'reproductor'
          : isBreedingDestination
            ? 'juvenil'
            : (values.lifecycle as AnimalStage)
      const birthDate = inputToDate(values.birthDate)
      const weanedAt = inputToDate(values.weanedAt)

      await onSubmit({
        animalNumber,
        type: values.type,
        status: values.status,
        gender: values.gender,
        isBreedingMale: canBeStud && values.isBreedingMale,
        stage,
        breed: initialData?.breed ?? '',
        ...(birthDate ? { birthDate } : {}),
        ...(weaningDestination && weanedAt
          ? {
              isWeaned: true,
              weanedAt,
              weaningDestination,
            }
          : {}),
        ...(values.name?.trim() ? { name: values.name.trim() } : {}),
        ...(values.motherId ? { motherId: values.motherId } : {}),
        ...(values.fatherId ? { fatherId: values.fatherId } : {}),
        ...(values.batch?.trim() ? { batch: values.batch.trim() } : {}),
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        ...(values.gender === 'hembra'
          ? {
              pregnantAt: isPregnant
                ? (inputToDate(values.pregnantAt) ?? new Date())
                : preservesExistingPregnancy
                  ? initialData.pregnantAt
                  : null,
              pregnantBy: isPregnant
                ? values.pregnantBy || null
                : preservesExistingPregnancy
                  ? (initialData.pregnantBy ?? null)
                  : null,
              birthedAt: isLactating ? (inputToDate(values.birthedAt) ?? null) : null,
              weanedMotherAt: null,
              ...(isLactating
                ? {
                    lactationStatus: 'active' as const,
                    lactationPurpose: values.lactationPurpose,
                    driedAt: null,
                  }
                : {
                    lactationStatus: 'dry' as const,
                    driedAt: initialData?.driedAt ?? null,
                  }),
              ...(preservesExistingPregnancy
                ? {
                    pregnantBreedingRecordId: initialData?.pregnantBreedingRecordId ?? null,
                    pregnantBreedingId: initialData?.pregnantBreedingId ?? null,
                  }
                : { pregnantBreedingRecordId: null, pregnantBreedingId: null }),
            }
          : {}),
      })
    } catch (error) {
      console.error('Error registrando animal:', error)
      setPhotoError(
        error instanceof Error
          ? error.message
          : 'No se pudo registrar el animal. Inténtalo de nuevo.',
      )
    } finally {
      setIsUploading(false)
    }
  }

  const fieldLabels: Record<string, string> = {
    animalNumber: 'ID del animal',
    type: 'Especie',
    status: 'Estado',
    gender: 'Género',
    lifecycle: 'Etapa o condición',
    birthDate: 'Fecha de nacimiento',
    weanedAt: 'Fecha de destete',
    pregnantAt: 'Fecha de gestación',
    pregnantBy: 'Macho',
    birthedAt: 'Último parto',
    lactationPurpose: 'Uso de la lactancia',
    name: 'Nombre',
    motherId: 'Madre',
    fatherId: 'Padre',
    batch: 'Lote',
    notes: 'Notas',
  }
  const goToField = (field: string, source: HTMLElement) => {
    const container = source.closest('form')
    const target = container?.querySelector<HTMLElement>(
      `[data-field="${field}"], [name="${field}"], [id="${field}"]`,
    )
    if (!target) return
    const details = target.closest('details')
    if (details) details.open = true
    target.scrollIntoView({
      block: 'center',
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
    const control = target.matches('input, button, select, textarea')
      ? target
      : target.querySelector<HTMLElement>('button, input, select, textarea')
    control?.focus({ preventScroll: true })
  }

  const errorEntries = Object.entries(form.formState.errors)

  return (
    <>
      <Form form={form} onSubmit={handleSubmit} className="space-y-6">
        {!initialData && (
          <div className="space-y-4">
            <div
              role="radiogroup"
              aria-label="Tipo de registro"
              className="grid grid-cols-2 gap-1 rounded-full border border-slate-200 bg-slate-100 p-1"
            >
              {(['nuevo', 'parto'] as const).map((mode) => (
                <label key={mode} className="relative cursor-pointer">
                  <input
                    type="radio"
                    value={mode}
                    {...form.register('registrationMode')}
                    disabled={isBusy}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-slate-600 peer-checked:bg-green-700 peer-checked:text-white peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-green-700 peer-disabled:opacity-50">
                    {mode === 'nuevo' ? 'Nuevo' : 'Parto'}
                  </span>
                </label>
              ))}
            </div>
            {registrationMode === 'parto' && (
              <div data-field="motherId" className="space-y-2">
                <AnimalSelector
                  label="Madre *"
                  animals={selectableAnimals}
                  selectedIds={selectedMotherId ? [selectedMotherId] : []}
                  onAdd={(id) => {
                    const mother = selectableAnimals.find((animal) => animal.id === id)
                    form.setValue('motherId', id, { shouldValidate: true })
                    if (mother) form.setValue('type', mother.type)
                  }}
                  onRemove={() => form.setValue('motherId', '', { shouldValidate: true })}
                  mode="single"
                  placeholder="Buscar madre..."
                  createLabel="Crear y seleccionar madre"
                  onCreate={
                    onCreateMother && !isBusy
                      ? (query) => {
                          setMotherSearch(query)
                          setCreatingMother(true)
                        }
                      : undefined
                  }
                  filterFn={(animal) => animal.gender === 'hembra' && animal.status === 'activo'}
                />
                {form.formState.errors.motherId && (
                  <p role="alert" className="text-sm text-red-600">
                    {form.formState.errors.motherId.message}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        <section aria-labelledby="animal-essential-data" className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">
              Información esencial
            </p>
            <h3 id="animal-essential-data" className="mt-1 text-lg font-bold text-slate-900">
              Identifica y clasifica al animal
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <span
                data-field="type"
                id="animal-type-label"
                className="block text-sm font-semibold text-slate-700"
              >
                Especie *
              </span>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <InputIconSelect
                    aria-labelledby="animal-type-label"
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value)
                      try {
                        localStorage.setItem(speciesPreferenceKey, value)
                      } catch {
                        /* Preferencia opcional. */
                      }
                    }}
                    onBlur={field.onBlur}
                    disabled={isBusy}
                    className="min-h-12 rounded-xl border-slate-300"
                    options={[
                      field.value,
                      ...animals_types.filter((type) => type !== field.value),
                    ].map((type) => ({
                      value: type,
                      label: animals_types_labels[type],
                      icon: animal_icon[type],
                    }))}
                  />
                )}
              />
            </div>
            <TextField
              name="animalNumber"
              label="ID del animal"
              placeholder={suggestedAnimalNumber}
              helperText={`Si lo dejas vacío, se usará ${suggestedAnimalNumber} como ID.`}
              autoFocus
              disabled={isBusy}
              className="min-h-12 rounded-xl text-base"
            />
            <div className="space-y-1.5">
              <span
                data-field="gender"
                id="animal-gender-label"
                className="block text-sm font-semibold text-slate-700"
              >
                Género *
              </span>
              <div
                role="radiogroup"
                aria-labelledby="animal-gender-label"
                className="grid grid-cols-2 gap-1 rounded-full border border-slate-200 bg-slate-100 p-1"
              >
                {animals_genders.map((gender) => (
                  <label key={gender} className="relative min-w-0 cursor-pointer">
                    <input
                      type="radio"
                      value={gender}
                      {...form.register('gender')}
                      disabled={isBusy || isMotherForm}
                      className="peer sr-only"
                    />
                    <span className="flex min-h-11 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition-colors peer-checked:bg-green-700 peer-checked:text-white peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-green-700 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 motion-reduce:transition-none">
                      <EmojiIcon emoji={gender === 'hembra' ? '♀' : '♂'} />
                      {animals_genders_labels[gender]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <Controller
            control={form.control}
            name="birthDate"
            render={({ field, fieldState }) => (
              <div data-field="birthDate" className="space-y-1">
                <DatePickerButtons
                  label="Fecha de nacimiento (estimada) *"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isBusy}
                  showToday
                  inline
                  helperText={
                    approximateAge
                      ? `Edad aproximada: ${approximateAge}.`
                      : 'Puedes usar una fecha estimada si no conoces la exacta.'
                  }
                />
                {fieldState.error && (
                  <p className="text-xs text-red-600">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
          {availableStages.length === 0 && (
            <p className="text-sm text-slate-500">
              Selecciona la fecha de nacimiento para ver las etapas disponibles.
            </p>
          )}
          {availableStages.length > 0 && (
            <>
              <div className="space-y-1.5">
                <span
                  data-field="lifecycle"
                  id="animal-lifecycle-label"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Etapa o condición *
                </span>
                <Controller
                  control={form.control}
                  name="lifecycle"
                  render={({ field, fieldState }) => (
                    <InputIconSelect
                      aria-labelledby="animal-lifecycle-label"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      disabled={isBusy}
                      invalid={!!fieldState.error}
                      className="min-h-12 rounded-xl border-slate-300"
                      options={availableStages.map((stage) => ({
                        value: stage,
                        label:
                          stage === 'embarazada'
                            ? 'Gestante'
                            : stage === 'lechera'
                              ? 'Madre / Lechera'
                              : stage === 'reproductor' &&
                                  selectedBirthDate &&
                                  (() => {
                                    const birth = inputToDate(selectedBirthDate)!
                                    const threshold = new Date(
                                      birth.getFullYear(),
                                      birth.getMonth() +
                                        ANIMAL_BREEDING_CONFIGS[selectedType].minBreedingAge,
                                      birth.getDate(),
                                    )
                                    return new Date() < threshold
                                  })()
                                ? 'Juvenil (para reproducción)'
                                : animals_stages_labels[stage],
                        icon:
                          stage === 'embarazada'
                            ? '🤰'
                            : stage === 'lechera'
                              ? '🍼'
                              : animal_stage_icons[stage],
                      }))}
                    />
                  )}
                />
                {form.formState.errors.lifecycle && (
                  <p className="text-xs text-red-600">{form.formState.errors.lifecycle.message}</p>
                )}
              </div>

              {canBeStud && (
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
                  <input
                    type="checkbox"
                    {...form.register('isBreedingMale')}
                    disabled={isBusy}
                    className="h-5 w-5 accent-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                  />
                  Marcar como semental
                </label>
              )}

              <div className="space-y-4">
                {(selectedLifecycle === 'engorda' || selectedLifecycle === 'reproductor') && (
                  <div className="space-y-4">
                    <div
                      className={
                        selectedLifecycle === 'reproductor' ? 'grid gap-4 sm:grid-cols-2' : ''
                      }
                    >
                      <Controller
                        control={form.control}
                        name="weanedAt"
                        render={({ field, fieldState }) => (
                          <div data-field="weanedAt" className="space-y-1">
                            <DatePickerButtons
                              label="Fecha de destete"
                              helperText="Opcional. Déjala vacía si no conoces la fecha."
                              value={field.value ?? ''}
                              onChange={field.onChange}
                              disabled={isBusy}
                              showToday
                              inline
                            />
                            <p className="text-xs text-red-600">
                              {form.formState.isSubmitted ? fieldState.error?.message : undefined}
                            </p>
                          </div>
                        )}
                      />
                    </div>
                    <p className="text-sm leading-6 text-green-900">
                      {selectedLifecycle === 'engorda'
                        ? 'Al guardar, el animal quedará en Engorda.'
                        : 'Si aún no tiene la edad reproductiva de su especie, la app lo mostrará como Juvenil hasta alcanzarla.'}
                    </p>
                  </div>
                )}
                {selectedLifecycle === 'embarazada' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Controller
                      control={form.control}
                      name="pregnantAt"
                      render={({ field, fieldState }) => (
                        <div data-field="pregnantAt" className="space-y-1">
                          <DatePickerButtons
                            label="Fecha de gestación"
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            disabled={isBusy}
                            showToday
                            inline
                            helperText={!field.value ? 'Opcional' : undefined}
                          />
                          <p className="text-xs text-red-600">{fieldState.error?.message}</p>
                        </div>
                      )}
                    />
                    <AnimalSelector
                      label="Macho"
                      animals={existingAnimals}
                      selectedIds={selectedPregnantBy ? [selectedPregnantBy] : []}
                      onAdd={(id) => form.setValue('pregnantBy', id)}
                      onRemove={() => form.setValue('pregnantBy', '')}
                      mode="single"
                      placeholder="Buscar macho..."
                      filterFn={(animal) =>
                        animal.gender === 'macho' &&
                        animal.id !== initialData?.id &&
                        animal.type === selectedType
                      }
                    />
                  </div>
                )}
                {selectedLifecycle === 'lechera' && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Controller
                        control={form.control}
                        name="birthedAt"
                        render={({ field, fieldState }) => (
                          <div data-field="birthedAt" className="space-y-1">
                            <DatePickerButtons
                              label="Último parto *"
                              value={field.value ?? ''}
                              onChange={field.onChange}
                              disabled={isBusy}
                              showToday
                              inline
                            />
                            <p className="text-xs text-red-600">
                              {form.formState.isSubmitted ? fieldState.error?.message : undefined}
                            </p>
                          </div>
                        )}
                      />
                    </div>
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-semibold text-slate-700">
                        Uso de la lactancia
                      </legend>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            ['offspring', 'Crías'],
                            ['dairy', 'Leche'],
                            ['dual', 'Ambos'],
                          ] as const
                        ).map(([value, label]) => (
                          <label
                            key={value}
                            className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-green-200 bg-white px-2 text-center text-sm font-semibold text-slate-700 has-[:checked]:border-green-700 has-[:checked]:bg-green-100 has-[:checked]:text-green-900"
                          >
                            <input
                              type="radio"
                              value={value}
                              {...form.register('lactationPurpose')}
                              disabled={isBusy}
                              className="sr-only"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <p className="text-sm leading-6 text-green-900">
                      Lactancia y gestación pueden coexistir. Destetar una cría sólo termina la
                      lactancia cuando su uso es exclusivamente para crías.
                    </p>
                  </div>
                )}
                {!['cria', 'engorda', 'reproductor', 'embarazada', 'lechera'].includes(
                  selectedLifecycle,
                ) && (
                  <p className="text-sm leading-6 text-green-900">
                    Esta etapa no requiere una fecha adicional. Podrás cambiarla después desde la
                    ficha del animal.
                  </p>
                )}
              </div>
            </>
          )}
        </section>

        <details className="group rounded-2xl border border-slate-200 bg-slate-50/70">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            <span>
              Datos opcionales
              <span className="ml-2 text-sm font-normal text-slate-500">
                Nombre, familia, lote, imagen y notas
              </span>
            </span>
            <span aria-hidden="true" className="text-xl text-green-700 group-open:rotate-45">
              +
            </span>
          </summary>

          <div className="space-y-5 border-t border-slate-200 p-4 sm:p-5">
            <div className="space-y-1.5">
              <span
                data-field="status"
                id="animal-status-label"
                className="block text-sm font-semibold text-slate-700"
              >
                Estado *
              </span>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <InputIconSelect
                    aria-labelledby="animal-status-label"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isBusy}
                    className="min-h-12 rounded-xl border-slate-300"
                    options={animal_statuses.map((status) => ({
                      value: status,
                      label: animal_status_labels[status],
                      icon: animal_status_icons[status],
                    }))}
                  />
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                name="name"
                label="Nombre"
                placeholder="Ej. Luna"
                disabled={isBusy}
                className="min-h-12 rounded-xl text-base"
              />
              <TextField
                name="batch"
                label="Lote"
                placeholder="Ej. Lote 2026-A"
                disabled={isBusy}
                className="min-h-12 rounded-xl text-base"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {registrationMode !== 'parto' && (
                <AnimalSelector
                  label="Madre"
                  animals={selectableAnimals}
                  selectedIds={selectedMotherId ? [selectedMotherId] : []}
                  onAdd={(id) => form.setValue('motherId', id)}
                  onRemove={() => form.setValue('motherId', '')}
                  mode="single"
                  placeholder="Buscar madre..."
                  filterFn={(animal) =>
                    animal.gender === 'hembra' &&
                    animal.id !== initialData?.id &&
                    animal.type === selectedType
                  }
                />
              )}
              <AnimalSelector
                label="Padre"
                animals={existingAnimals}
                selectedIds={selectedFatherId ? [selectedFatherId] : []}
                onAdd={(id) => form.setValue('fatherId', id)}
                onRemove={() => form.setValue('fatherId', '')}
                mode="single"
                placeholder="Buscar padre..."
                filterFn={(animal) =>
                  animal.gender === 'macho' &&
                  animal.id !== initialData?.id &&
                  animal.type === selectedType
                }
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="animal-photo" className="block text-sm font-semibold text-slate-700">
                Imagen
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {photoPreview ? (
                  <Image
                    src={photoPreview}
                    alt="Vista previa del animal"
                    width={96}
                    height={96}
                    unoptimized
                    className="h-24 w-24 rounded-2xl border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-3xl">
                    <span aria-hidden="true">
                      <EmojiIcon emoji={animal_icon[selectedType]} />
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    id="animal-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={isBusy}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      setPhotoError('')
                      if (!file) return
                      if (file.size > 5 * 1024 * 1024) {
                        setPhotoError('La imagen debe pesar menos de 5 MB')
                        event.target.value = ''
                        return
                      }
                      setPhotoFile(file)
                    }}
                    aria-describedby="animal-photo-help"
                    className="block min-h-11 w-full cursor-pointer rounded-xl border border-slate-300 bg-white text-sm text-slate-600 file:mr-3 file:min-h-11 file:border-0 file:bg-green-100 file:px-4 file:font-semibold file:text-green-800 hover:file:bg-green-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                  />
                  <p id="animal-photo-help" className="mt-1.5 text-xs text-slate-500">
                    JPG, PNG o WebP. Máximo 5 MB.
                  </p>
                </div>
              </div>
            </div>

            <TextField
              name="notes"
              label="Notas"
              placeholder="Observaciones, señas particulares o información importante..."
              multiline
              rows={3}
              disabled={isBusy}
              className="rounded-xl text-base"
            />
          </div>
        </details>

        {(photoError || (errorEntries.length > 0 && form.formState.isSubmitted)) && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {photoError && <p>{photoError}</p>}
            {errorEntries.length > 0 && form.formState.isSubmitted && (
              <>
                <p className="font-semibold">Revisa estos campos antes de registrar el animal:</p>
                <ul className="mt-2 space-y-2">
                  {errorEntries.map(([field, error]) => (
                    <li key={field}>
                      <button
                        type="button"
                        className="min-h-11 text-left underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                        onClick={(event) => goToField(field, event.currentTarget)}
                      >
                        <strong>{fieldLabels[field] ?? field}:</strong>{' '}
                        {error?.message ? String(error.message) : 'Revisa el valor ingresado.'}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="sticky bottom-0 z-10 -mx-6 flex gap-3 border-t border-slate-200 bg-white/95 px-6 pb-1 pt-4 backdrop-blur sm:static sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isBusy}
            className="min-h-12 flex-[1.4] rounded-xl bg-green-700 px-4 font-bold text-white hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            {isBusy
              ? 'Guardando...'
              : isMotherForm
                ? 'Crear madre'
                : initialData
                  ? 'Guardar cambios'
                  : 'Registrar animal'}
          </button>
        </div>
      </Form>
      {onCreateMother && (
        <Modal
          isOpen={creatingMother}
          onClose={() => setCreatingMother(false)}
          title="Crear madre"
          size="lg"
        >
          {creatingMother && (
            <SimpleAnimalForm
              isMotherForm
              initialData={motherDefaults}
              existingAnimals={selectableAnimals}
              onCancel={() => setCreatingMother(false)}
              onSubmit={async (data) => {
                if (data.gender !== 'hembra') throw new Error('La madre debe ser hembra')
                const mother = await onCreateMother(data)
                setCreatedMothers((previous) => [...previous, mother])
                form.setValue('type', mother.type)
                form.setValue('motherId', mother.id, { shouldValidate: true })
                setCreatingMother(false)
              }}
            />
          )}
        </Modal>
      )}
    </>
  )
}
