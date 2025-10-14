'use client'

import React, { useEffect, useMemo } from 'react'
import { calculateExpectedBirthDate } from '@/lib/animalBreedingConfig'
import { BreedingRecord } from '@/types/breedings'
import { Animal } from '@/types/animals'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import ButtonClose from './buttons/ButtonClose'
import { SelectSuggestOption } from './inputs/InputSelectSuggest'
import { Form } from './forms/Form'
import { TextField } from './forms/TextField'
import { SelectField } from './forms/SelectField'
import { DateField } from './forms/DateField'
import { SuggestField } from './forms/SuggestField'
import { useZodForm } from '@/hooks/useZodForm'
import { z } from 'zod'
import { toDate } from 'date-fns'

interface BreedingFormProps {
  animals: Animal[]
  onSubmit: (
    data: Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  initialData?: BreedingRecord
}

const femaleBreedingInfoSchema = z.object({
  femaleId: z.string().min(1, 'Selecciona una hembra válida'),
  pregnancyConfirmedDate: z.date().nullable().optional(),
  expectedBirthDate: z.date().nullable().optional(),
  actualBirthDate: z.date().nullable().optional(),
  offspring: z.array(z.string()).default([])
})

const schema = z.object({
  breedingId: z.string().trim().min(1, 'El ID de monta es requerido'),
  breedingDate: z.date({
    required_error: 'La fecha de monta es obligatoria'
  }),
  maleId: z.string().trim().min(1, 'Selecciona un macho reproductor'),
  femaleIds: z
    .array(z.string().min(1))
    .min(1, 'Selecciona al menos una hembra'),
  femaleBreedingInfo: z.array(femaleBreedingInfoSchema).default([]),
  notes: z.string().optional()
})

type FormSchema = z.infer<typeof schema>
type FemaleBreedingInfoForm = FormSchema['femaleBreedingInfo'][number]

/**
 * Formulario para registrar montas/reproducciones
 * Solo el formulario sin modal wrapper
 */
const BreedingForm: React.FC<BreedingFormProps> = ({
  animals,
  onSubmit,
  onCancel,
  isLoading = false,
  initialData
}) => {
  const { remove } = useAnimalCRUD()
  const { breedingRecords } = useBreedingCRUD()

  const defaultValues = useMemo<FormSchema>(() => {
    const normalizedFemaleInfo: FormSchema['femaleBreedingInfo'] =
      initialData?.femaleBreedingInfo?.map<FemaleBreedingInfoForm>((info) => ({
        femaleId: info.femaleId,
        pregnancyConfirmedDate: info.pregnancyConfirmedDate
          ? toDate(info.pregnancyConfirmedDate)
          : null,
        expectedBirthDate: info.expectedBirthDate
          ? toDate(info.expectedBirthDate)
          : null,
        actualBirthDate: info.actualBirthDate
          ? toDate(info.actualBirthDate)
          : null,
        offspring: info.offspring ?? []
      })) ?? []

    return {
      breedingId: initialData?.breedingId ?? '',
      breedingDate: initialData?.breedingDate
        ? toDate(initialData.breedingDate)
        : new Date(),
      maleId: initialData?.maleId ?? '',
      femaleIds: normalizedFemaleInfo.map((info) => info.femaleId),
      femaleBreedingInfo: normalizedFemaleInfo,
      notes: initialData?.notes ?? ''
    }
  }, [initialData])

  const form = useZodForm({
    schema,
    defaultValues,
    mode: 'onBlur'
  })

  const femaleIds = form.watch('femaleIds') ?? []
  const femaleBreedingInfo = form.watch('femaleBreedingInfo') ?? []
  const breedingDate = form.watch('breedingDate')
  const breedingIdValue = form.watch('breedingId')
  const maleId = form.watch('maleId')

  const selectedMale = useMemo(() => {
    return animals.find((animal) => animal.id === maleId) ?? null
  }, [animals, maleId])

  const filteredFemales = useMemo(() => {
    if (!selectedMale) {
      return []
    }

    return animals.filter(
      (animal) =>
        (animal.status ?? 'activo') === 'activo' &&
        animal.gender === 'hembra' &&
        animal.type === selectedMale.type &&
        (animal.stage === 'reproductor' || animal.stage === 'lechera')
    )
  }, [animals, selectedMale])

  useEffect(() => {
    if (initialData) {
      return
    }
    if (breedingDate && !breedingIdValue) {
      form.setValue('breedingId', generateBreedingId(breedingDate), {
        shouldDirty: false
      })
    }
  }, [breedingDate, breedingIdValue, form, initialData])

  useEffect(() => {
    if (!selectedMale) {
      if (femaleIds.length > 0) {
        form.setValue('femaleIds', [], { shouldDirty: true })
      }
      return
    }

    const compatibleIds = femaleIds.filter((id) => {
      const female = animals.find((animal) => animal.id === id)
      return female && female.type === selectedMale.type
    })

    if (compatibleIds.length !== femaleIds.length) {
      form.setValue('femaleIds', compatibleIds, { shouldDirty: true })
    }
  }, [animals, femaleIds, form, selectedMale])

  useEffect(() => {
    const currentInfos = form.getValues('femaleBreedingInfo') ?? []
    const infoMap = new Map(currentInfos.map((info) => [info.femaleId, info]))
    const nextInfos = femaleIds.map((id) => {
      const existing = infoMap.get(id)
      if (existing) {
        return existing
      }

      return {
        femaleId: id,
        pregnancyConfirmedDate: null,
        expectedBirthDate: null,
        actualBirthDate: null,
        offspring: []
      }
    })

    const changed =
      nextInfos.length !== currentInfos.length ||
      nextInfos.some((info, index) => info !== currentInfos[index])

    if (changed) {
      form.setValue('femaleBreedingInfo', nextInfos, { shouldDirty: true })
    }
  }, [femaleIds, form])

  const males = useMemo(
    () =>
      animals.filter(
        (animal) =>
          (animal.status ?? 'activo') === 'activo' &&
          animal.gender === 'macho' &&
          animal.stage === 'reproductor'
      ),
    [animals]
  )

  const maleOptions = useMemo(
    () =>
      males.map((animal) => ({
        value: animal.id,
        label: `${animal.animalNumber} - ${animal.type}`
      })),
    [males]
  )

  const getFemaleBreedingId = React.useCallback(
    (femaleId: string): string | null => {
      const record = breedingRecords.find((r) =>
        r.femaleBreedingInfo?.some((info) => info.femaleId === femaleId)
      )
      return record?.breedingId ?? null
    },
    [breedingRecords]
  )

  const femaleOptions = useMemo<SelectSuggestOption<Animal>[]>(() => {
    if (!selectedMale) {
      return []
    }

    return filteredFemales.map((animal) => {
      const brId = getFemaleBreedingId(animal.id)
      return {
        id: animal.id,
        label: animal.animalNumber,
        secondaryLabel: brId ? `Monta: ${brId}` : '',
        data: animal
      }
    })
  }, [filteredFemales, getFemaleBreedingId, selectedMale])

  const selectedFemales = useMemo(() => {
    return femaleBreedingInfo
      .map(
        (info) => animals.find((animal) => animal.id === info.femaleId) || null
      )
      .filter((animal): animal is Animal => Boolean(animal))
  }, [animals, femaleBreedingInfo])

  const femalesInOtherBreeding = useMemo(() => {
    return selectedFemales.filter((animal) => {
      const brId = getFemaleBreedingId(animal.id)
      if (!brId) {
        return false
      }
      if (initialData && brId === initialData.breedingId) {
        return false
      }
      return true
    })
  }, [getFemaleBreedingId, initialData, selectedFemales])

  const validateBreedingId = (breedingId: string): string | null => {
    if (!breedingId.trim()) {
      return 'El ID de monta es requerido'
    }

    const isDuplicate = breedingRecords.some(
      (record) =>
        record.breedingId === breedingId.trim() && record.id !== initialData?.id
    )

    if (isDuplicate) {
      return `Ya existe una monta con el ID "${breedingId.trim()}"`
    }

    return null
  }

  const handleFemaleBreedingChange = async (
    femaleId: string,
    field: string,
    value: string | boolean | Date | null
  ) => {
    const currentInfos = form.getValues('femaleBreedingInfo') ?? []
    const index = currentInfos.findIndex((info) => info.femaleId === femaleId)
    if (index === -1) {
      return
    }

    const updatedInfo = [...currentInfos]
    const current = updatedInfo[index]
    const animalType = selectedMale?.type

    if (field === 'pregnancyConfirmed') {
      if (value && animalType) {
        const now = new Date()
        updatedInfo[index] = {
          ...current,
          pregnancyConfirmedDate: now,
          expectedBirthDate: calculateExpectedBirthDate(now, animalType)
        }
      } else {
        updatedInfo[index] = {
          ...current,
          pregnancyConfirmedDate: null,
          expectedBirthDate: null,
          actualBirthDate: null
        }
      }
    } else if (field === 'pregnancyConfirmedDate') {
      if (value instanceof Date && animalType) {
        updatedInfo[index] = {
          ...current,
          pregnancyConfirmedDate: value,
          expectedBirthDate: calculateExpectedBirthDate(value, animalType)
        }
      }
    } else if (field === 'actualBirthDate') {
      if (value instanceof Date) {
        updatedInfo[index] = {
          ...current,
          actualBirthDate: value
        }
      } else if (!value) {
        const offspring = current.offspring ?? []
        if (offspring.length > 0) {
          try {
            await Promise.all(
              offspring.map((offspringId) => remove(offspringId))
            )
          } catch (error) {
            console.error('Error removing offspring:', error)
          }
        }
        updatedInfo[index] = {
          ...current,
          actualBirthDate: null,
          offspring: []
        }
      }
    } else {
      updatedInfo[index] = {
        ...current,
        [field]: value
      }
    }

    form.setValue('femaleBreedingInfo', updatedInfo, { shouldDirty: true })
  }

  const handleRemoveFemale = (femaleId: string) => {
    const remaining = femaleIds.filter((id) => id !== femaleId)
    form.setValue('femaleIds', remaining, { shouldDirty: true })
  }

  const onSubmitForm = async (values: FormSchema) => {
    const trimmedBreedingId = values.breedingId.trim()
    const breedingIdError = validateBreedingId(trimmedBreedingId)
    if (breedingIdError) {
      form.setError('breedingId', {
        type: 'validate',
        message: breedingIdError
      })
      return
    }

    const normalizedFemaleInfo = (values.femaleBreedingInfo ?? []).filter(
      (info) => values.femaleIds.includes(info.femaleId)
    )

    const payload: Omit<
      BreedingRecord,
      'id' | 'farmerId' | 'createdAt' | 'updatedAt'
    > = {
      breedingId: trimmedBreedingId || generateBreedingId(values.breedingDate),
      maleId: values.maleId,
      breedingDate: values.breedingDate,
      femaleBreedingInfo: normalizedFemaleInfo.map((info) => ({
        femaleId: info.femaleId,
        pregnancyConfirmedDate: info.pregnancyConfirmedDate ?? null,
        expectedBirthDate: info.expectedBirthDate ?? null,
        actualBirthDate: info.actualBirthDate ?? null,
        offspring: info.offspring ?? []
      })),
      notes: values.notes?.trim() || undefined
    }

    await onSubmit(payload)
  }

  const { errors, isSubmitting } = form.formState

  return (
    <Form form={form} onSubmit={onSubmitForm} className="space-y-4">
      <TextField
        name="breedingId"
        label="ID de Monta"
        placeholder="Ej: 10-10-25-01"
        required
      />

      {selectedMale ? (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          <span className="mr-1">
            {selectedMale.type === 'oveja' && '🐑'}
            {selectedMale.type === 'cabra' && '🐐'}
            {selectedMale.type === 'vaca' && '🐄'}
            {selectedMale.type === 'cerdo' && '🐷'}
          </span>
          {selectedMale.type.charAt(0).toUpperCase() +
            selectedMale.type.slice(1).replace('_', ' ')}
        </div>
      ) : null}

      <DateField
        name="breedingDate"
        label="Fecha de Monta"
        type="date"
        required
      />

      {!selectedMale ? (
        <p className="text-sm text-gray-600 font-medium">
          Primero selecciona un macho para ver las hembras compatibles
        </p>
      ) : femaleIds.length === 0 ? (
        <p className="text-sm text-gray-600 font-medium">
          Debes seleccionar al menos una hembra {selectedMale.type}
        </p>
      ) : null}

      <SelectField
        name="maleId"
        label="Macho"
        disabled={isLoading || isSubmitting}
        options={maleOptions}
      >
        <option value="">Seleccionar macho</option>
      </SelectField>

      {males.length === 0 ? (
        <p className="text-sm text-gray-600 font-medium">
          No hay machos reproductores disponibles
        </p>
      ) : null}

      {selectedMale ? (
        <>
          <SuggestField
            name="femaleIds"
            id="female-select"
            options={femaleOptions}
            showRemoveButton
            placeholder={`Buscar hembra ${selectedMale.type} por número...`}
            emptyMessage={
              filteredFemales.length === 0
                ? `No hay hembras ${selectedMale.type} disponibles`
                : 'No se encontraron hembras'
            }
            disabled={!selectedMale || isLoading || isSubmitting}
            filterFunction={(option, searchValue) =>
              option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
              (option.data?.type || '')
                .toLowerCase()
                .includes(searchValue.toLowerCase())
            }
            onRemoveOption={(option) => handleRemoveFemale(option.id)}
            onAddOption={(_option) => {
              form.clearErrors('femaleIds')
            }}
          />

          {femaleIds.length > 0 ? (
            <div className="space-y-3">
              {femalesInOtherBreeding.length > 0 ? (
                <div className="mb-3 p-2 rounded bg-orange-100 border border-orange-300 text-orange-900 text-sm flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  <span>
                    Las siguientes hembras ya pertenecen a otra monta:
                    {femalesInOtherBreeding.map((animal) => (
                      <span key={animal.id} className="ml-2 font-semibold">
                        {animal.animalNumber}
                        {(() => {
                          const brId = getFemaleBreedingId(animal.id)
                          return brId ? (
                            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-200 text-orange-800">
                              monta {brId}
                            </span>
                          ) : null
                        })()}
                      </span>
                    ))}
                    . Puedes ignorar y continuar, o hacerlo manualmente más
                    tarde.
                  </span>
                </div>
              ) : null}

              <label className="block text-sm font-medium text-gray-700">
                Hembras seleccionadas ({femaleIds.length})
              </label>

              <div className="space-y-3 bg-gray-50 rounded-md">
                {femaleBreedingInfo.map((info, index) => {
                  const animal = animals.find(
                    (item) => item.id === info.femaleId
                  )
                  if (!animal) {
                    return null
                  }

                  const femaleBreedingId = getFemaleBreedingId(animal.id)

                  return (
                    <div
                      key={animal.id}
                      className="bg-white p-3 rounded border"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-900 flex items-center gap-2">
                          {animal.animalNumber} - {animal.type}
                          {femaleBreedingId ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-800">
                              monta {femaleBreedingId}
                            </span>
                          ) : null}
                        </span>
                        <div className="flex items-center gap-2">
                          {!info.pregnancyConfirmedDate ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleFemaleBreedingChange(
                                  animal.id,
                                  'pregnancyConfirmed',
                                  true
                                )
                              }
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                            >
                              Confirmar embarazo
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleFemaleBreedingChange(
                                  animal.id,
                                  'pregnancyConfirmed',
                                  false
                                )
                              }
                              className="text-xs text-red-600 hover:text-red-800 underline"
                            >
                              Desconfirmar
                            </button>
                          )}
                          <ButtonClose
                            onClick={() => handleRemoveFemale(animal.id)}
                            showTitle="Omitir"
                            title="Quitar hembra"
                          />
                        </div>
                      </div>

                      {info.pregnancyConfirmedDate ? (
                        <div className="mt-3 space-y-3">
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                            ✓ Embarazo confirmado
                          </span>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <DateField
                              name={
                                `femaleBreedingInfo.${index}.pregnancyConfirmedDate` as const
                              }
                              label="Fecha de confirmación"
                              type="date"
                              onDateChange={(date) =>
                                handleFemaleBreedingChange(
                                  animal.id,
                                  'pregnancyConfirmedDate',
                                  date
                                )
                              }
                              required
                            />
                            {info.expectedBirthDate ? (
                              <DateField
                                name={
                                  `femaleBreedingInfo.${index}.expectedBirthDate` as const
                                }
                                label="Fecha de parto esperado"
                                type="date"
                                disabled
                              />
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {info.actualBirthDate ? (
                        <div className="mt-3 space-y-2">
                          <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                            🍼 Parto registrado
                          </span>
                          {info.offspring && info.offspring.length > 0 ? (
                            <div className="flex items-center flex-wrap gap-1 text-xs text-gray-600">
                              <span>Descendencia:</span>
                              {info.offspring.map((offspringId) => {
                                const offspring = animals.find(
                                  (animalItem) => animalItem.id === offspringId
                                )
                                return offspring ? (
                                  <span
                                    key={offspringId}
                                    className="inline-flex items-center px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded"
                                  >
                                    {offspring.animalNumber}
                                  </span>
                                ) : (
                                  <span
                                    key={offspringId}
                                    className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                                  >
                                    ID: {offspringId}
                                  </span>
                                )
                              })}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={
            isLoading ||
            isSubmitting ||
            !maleId ||
            femaleIds.length === 0 ||
            Boolean(errors.breedingId)
          }
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting || isLoading
            ? initialData
              ? 'Actualizando...'
              : 'Registrando...'
            : !maleId
            ? 'Selecciona un macho'
            : femaleIds.length === 0
            ? 'Selecciona hembras'
            : errors.breedingId
            ? 'ID duplicado'
            : initialData
            ? 'Actualizar Monta'
            : 'Registrar Monta'}
        </button>
      </div>
    </Form>
  )
}

function generateBreedingId(breedingDate: Date): string {
  const day = breedingDate.getDate().toString().padStart(2, '0')
  const month = (breedingDate.getMonth() + 1).toString().padStart(2, '0')
  const year = breedingDate.getFullYear().toString().slice(-2)
  const baseId = `${day}-${month}-${year}`
  return `${baseId}-01`
}

export default BreedingForm
