'use client'

import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { useZodForm } from '@/hooks/useZodForm'
import { ANIMAL_BREEDING_CONFIGS } from '@/lib/animalBreedingConfig'
import { auth, storage } from '@/lib/firebase'
import {
  type Animal,
  type AnimalStage,
  animal_icon,
  animal_status_icons,
  animal_status_labels,
  animal_statuses,
  animals_genders,
  animals_genders_labels,
  animals_stages_labels,
  animals_types,
  animals_types_labels,
} from '@/types/animals'
import { Form } from './forms/Form'
import { TextField } from './forms/TextField'
import AnimalSelector from './inputs/AnimalSelector'
import { BirthDateInput } from './inputs/BirthDateInput'

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
const visibleStageOptions = ['cria', 'engorda', 'reproductor', 'descarte'] as const

const schema = z
  .object({
    animalNumber: z.string().trim().min(1, 'El ID del animal es requerido'),
    type: z.enum(animals_types),
    status: z.enum(animal_statuses),
    gender: z.enum(animals_genders),
    lifecycle: z.enum(lifecycleOptions),
    birthDate: z.string().optional(),
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
    const today = new Date()
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
        message: 'El estado Embarazada sólo aplica a hembras',
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
    if (['engorda', 'reproductor'].includes(data.lifecycle) && !data.weanedAt) {
      context.addIssue({
        path: ['weanedAt'],
        code: z.ZodIssueCode.custom,
        message: 'La fecha de destete es requerida para este destino',
      })
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

const selectClassName =
  'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-200 disabled:cursor-not-allowed disabled:bg-slate-100'

export default function SimpleAnimalForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  existingAnimals = [],
}: SimpleAnimalFormProps) {
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
      animalNumber: initialData?.animalNumber ?? '',
      type: initialData?.type ?? 'vaca',
      status: animal_statuses.includes(initialData?.status as (typeof animal_statuses)[number])
        ? (initialData?.status as (typeof animal_statuses)[number])
        : 'activo',
      gender: initialData?.gender ?? 'hembra',
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
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState(initialData?.imageUrl ?? '')
  const [photoError, setPhotoError] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const selectedType = form.watch('type')
  const selectedGender = form.watch('gender')
  const selectedLifecycle = form.watch('lifecycle')
  const selectedPregnantBy = form.watch('pregnantBy')
  const selectedMotherId = form.watch('motherId')
  const selectedFatherId = form.watch('fatherId')
  const isBusy = isLoading || isUploading

  useEffect(() => {
    if (
      selectedGender === 'macho' &&
      (selectedLifecycle === 'embarazada' || selectedLifecycle === 'lechera')
    ) {
      form.setValue('lifecycle', 'reproductor')
      form.setValue('pregnantAt', '')
      form.setValue('pregnantBy', '')
      form.setValue('birthedAt', '')
    }
  }, [form, selectedGender, selectedLifecycle])

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
    const folderId = initialData?.id ?? `new-${ownerId}-${crypto.randomUUID()}`
    const photoRef = ref(storage, `animals/${folderId}/photos/main-${Date.now()}.${extension}`)
    await uploadBytes(photoRef, photoFile, { contentType: photoFile.type })
    return getDownloadURL(photoRef)
  }

  const handleSubmit = async (values: FormSchema) => {
    const animalNumber = values.animalNumber.trim()
    const duplicate = existingAnimals.some(
      (animal) =>
        animal.id !== initialData?.id &&
        animal.animalNumber.trim().toLowerCase() === animalNumber.toLowerCase(),
    )
    if (duplicate) {
      form.setError('animalNumber', {
        type: 'validate',
        message: `Ya existe un animal con el ID “${animalNumber}”`,
      })
      return
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

  const errorEntries = Object.entries(form.formState.errors)

  return (
    <Form form={form} onSubmit={handleSubmit} className="space-y-6">
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
          <TextField
            name="animalNumber"
            label="ID del animal *"
            placeholder="Ej. 001"
            autoFocus
            disabled={isBusy}
            className="min-h-12 rounded-xl text-base"
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Especie *</span>
            <select {...form.register('type')} disabled={isBusy} className={selectClassName}>
              {animals_types.map((type) => (
                <option key={type} value={type}>
                  {animal_icon[type]} {animals_types_labels[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Estado *</span>
            <select {...form.register('status')} disabled={isBusy} className={selectClassName}>
              {animal_statuses.map((status) => (
                <option key={status} value={status}>
                  {animal_status_icons[status]} {animal_status_labels[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Género *</span>
            <select {...form.register('gender')} disabled={isBusy} className={selectClassName}>
              {animals_genders.map((gender) => (
                <option key={gender} value={gender}>
                  {gender === 'hembra' ? '♀' : '♂'} {animals_genders_labels[gender]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700">Etapa o condición *</span>
          <select {...form.register('lifecycle')} disabled={isBusy} className={selectClassName}>
            {visibleStageOptions.map((stage) => (
              <option key={stage} value={stage}>
                {animals_stages_labels[stage]}
              </option>
            ))}
            {selectedGender === 'hembra' && <option value="embarazada">Embarazada</option>}
            {selectedGender === 'hembra' && <option value="lechera">Madre / Lechera</option>}
          </select>
        </label>

        <div className="rounded-2xl border border-green-200 bg-green-50/70 p-4">
          {selectedLifecycle === 'cria' && (
            <Controller
              control={form.control}
              name="birthDate"
              render={({ field, fieldState }) => (
                <BirthDateInput
                  label="Fecha de nacimiento"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled={isBusy}
                  error={fieldState.error?.message}
                />
              )}
            />
          )}
          {(selectedLifecycle === 'engorda' || selectedLifecycle === 'reproductor') && (
            <div className="space-y-4">
              <div
                className={selectedLifecycle === 'reproductor' ? 'grid gap-4 sm:grid-cols-2' : ''}
              >
                <Controller
                  control={form.control}
                  name="weanedAt"
                  render={({ field, fieldState }) => (
                    <BirthDateInput
                      showAge={false}
                      label="Fecha de destete"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      disabled={isBusy}
                      required
                      error={form.formState.isSubmitted ? fieldState.error?.message : undefined}
                    />
                  )}
                />
                {selectedLifecycle === 'reproductor' && (
                  <Controller
                    control={form.control}
                    name="birthDate"
                    render={({ field, fieldState }) => (
                      <BirthDateInput
                        label="Fecha de nacimiento"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        disabled={isBusy}
                        required
                        error={form.formState.isSubmitted ? fieldState.error?.message : undefined}
                      />
                    )}
                  />
                )}
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
                  <BirthDateInput
                    showAge={false}
                    label="Fecha de embarazo"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    disabled={isBusy}
                    error={fieldState.error?.message}
                  />
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
                  name="birthDate"
                  render={({ field, fieldState }) => (
                    <BirthDateInput
                      label="Nacimiento de la madre"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      disabled={isBusy}
                      required
                      error={form.formState.isSubmitted ? fieldState.error?.message : undefined}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="birthedAt"
                  render={({ field, fieldState }) => (
                    <BirthDateInput
                      showAge={false}
                      label="Último parto"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      disabled={isBusy}
                      required
                      error={form.formState.isSubmitted ? fieldState.error?.message : undefined}
                    />
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
                Lactancia y embarazo pueden coexistir. Destetar una cría sólo termina la lactancia
                cuando su uso es exclusivamente para crías.
              </p>
            </div>
          )}
          {!['cria', 'engorda', 'reproductor', 'embarazada', 'lechera'].includes(
            selectedLifecycle,
          ) && (
            <p className="text-sm leading-6 text-green-900">
              Esta etapa no requiere una fecha adicional. Podrás cambiarla después desde la ficha
              del animal.
            </p>
          )}
        </div>
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
            <AnimalSelector
              label="Madre"
              animals={existingAnimals}
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
                  <span aria-hidden="true">{animal_icon[selectedType]}</span>
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
          {photoError || 'Revisa los campos marcados antes de registrar el animal.'}
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
          {isBusy ? 'Guardando...' : initialData ? 'Guardar cambios' : 'Registrar animal'}
        </button>
      </div>
    </Form>
  )
}
